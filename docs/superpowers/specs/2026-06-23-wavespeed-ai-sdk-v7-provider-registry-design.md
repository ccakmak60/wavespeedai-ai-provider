# WaveSpeed AI SDK v7 Provider Registry Design

## Goal

Add WaveSpeed support for AI SDK v7 beta provider registries across image, video, language, and compatible audio/text model types.

Users should be able to register the provider once:

```ts
import { createProviderRegistry, experimental_generateVideo as generateVideo, generateImage, generateText } from "ai";
import { wavespeedai } from "wavespeedai-ai-provider";

const registry = createProviderRegistry({ wavespeedai });

await generateImage({
  model: registry.imageModel("wavespeedai:google/nano-banana-pro/text-to-image"),
  prompt: "A cat working as a café barista",
});

await generateVideo({
  model: registry.videoModel("wavespeedai:wavespeed-ai/hunyuan-video/t2v"),
  prompt: "A cinematic shot of waves at sunrise",
});

await generateText({
  model: registry.languageModel("wavespeedai:anthropic/claude-opus-4.7"),
  prompt: "Summarize WaveSpeedAI in one sentence.",
});
```

## Sources Checked

- WaveSpeed REST API uses `https://api.wavespeed.ai/api/v3`.
- WaveSpeed task submission uses `POST /api/v3/{model_id}`.
- WaveSpeed task polling uses `GET /api/v3/predictions/{task-id}`.
- WaveSpeed `/api/v3/models` returns `model_id`, `type`, pricing/metadata, and per-model API schemas.
- WaveSpeed docs recommend polling image tasks at least every 2 seconds and video tasks at least every 5 seconds, with backoff.
- WaveSpeed LLM uses OpenAI-compatible Chat Completions at `https://llm.wavespeed.ai/v1/chat/completions`.
- AI SDK v7 beta (`ai@7.0.0-beta.183`) supports `customProvider({ videoModels })` and `createProviderRegistry().videoModel(...)` when the registered provider exposes `videoModel`.
- AI SDK v7 beta provider packages expose `VideoModelV4` through `@ai-sdk/provider@4.0.0-beta.19`.

## Dependency Target

Move the package to the AI SDK v7 beta line:

- `ai@7.0.0-beta.183` for dev/test examples.
- `@ai-sdk/provider@4.0.0-beta.19` for provider interfaces.
- `@ai-sdk/provider-utils@5.0.0-beta.49` for provider utilities.
- `@ai-sdk/openai-compatible@3.0.0-beta.57` for WaveSpeed LLM support.

`@ai-sdk/openai-compatible` is the only new runtime dependency. It replaces a large hand-written `LanguageModelV4` implementation for WaveSpeed's OpenAI-compatible LLM endpoint.

## Public API

```ts
import { createWaveSpeedAI, wavespeedai } from "wavespeedai-ai-provider";

const provider = createWaveSpeedAI({
  apiToken: process.env.WAVESPEEDAI_API_TOKEN,
  baseURL: "https://api.wavespeed.ai/api/v3",
  llmBaseURL: "https://llm.wavespeed.ai/v1",
});
```

Provider methods:

- `languageModel(modelId)` delegates to `@ai-sdk/openai-compatible` using the WaveSpeed LLM base URL.
- `imageModel(modelId)` returns a WaveSpeed image model.
- `image(modelId)` remains as an alias for `imageModel(modelId)`.
- `videoModel(modelId)` returns a WaveSpeed video model for AI SDK v7 `experimental_generateVideo`.
- `speechModel(modelId)` and `transcriptionModel(modelId)` are added only when WaveSpeed model schema/category matches the AI SDK call shape.
- `run(modelId, input, options)` submits and polls any WaveSpeed model as a generic task. This covers 3D, audio-to-video, custom workflows, and model categories that do not map cleanly to AI SDK interfaces.

Model IDs use generated type unions plus `(string & {})` so new WaveSpeed models work before the catalog is refreshed.

## Generated Catalog

Add `scripts/update-models.ts`:

1. Reads `WAVESPEEDAI_API_TOKEN`.
2. Fetches `GET https://api.wavespeed.ai/api/v3/models`.
3. Normalizes model metadata to a stable sorted list.
4. Writes `src/generated/wavespeedai-models.ts`.

Generated exports:

```ts
export const wavespeedaiModels = [
  {
    modelId: "wavespeed-ai/hunyuan-video/t2v",
    type: "text-to-video",
    category: "video",
    requestSchema: { ... },
  },
] as const;

export type WaveSpeedAIModelId = (typeof wavespeedaiModels)[number]["modelId"] | (string & {});
export type WaveSpeedAIImageModelId = ExtractModelIdsByCategory<"image"> | (string & {});
export type WaveSpeedAIVideoModelId = ExtractModelIdsByCategory<"video"> | (string & {});
```

First cut does not generate per-model input TypeScript types from JSON Schema. That adds a large codegen surface and should wait until catalog refresh proves useful.

## Category Mapping

Initial category mapping:

- Image: `text-to-image`, `image-to-image`, image edit/upscale/restore variants where outputs are image URLs.
- Video: `text-to-video`, `image-to-video`, `video-to-video`, `audio-to-video` where outputs are video URLs.
- Speech/audio: only when schema matches AI SDK `SpeechModelV4` expectations (`text`, voice/options, audio output).
- Transcription: only when schema accepts audio input and returns text-like output.
- Language: WaveSpeed LLM model IDs are served by the separate OpenAI-compatible LLM endpoint, not `/api/v3/models`.
- Generic: everything else routes through `run()`.

## Shared Task Flow

Media models use one shared helper:

1. Build request body from AI SDK call options plus `providerOptions.wavespeedai`.
2. Submit `POST {baseURL}/{modelId}` with `Authorization: Bearer <token>`.
3. Poll `GET {baseURL}/predictions/{id}` until `completed` or `failed`.
4. For image/audio/video model interfaces, download output URLs only when the AI SDK interface expects binary data.
5. Return AI SDK metadata: timestamp, model ID, response headers, warnings.

Polling:

- Image default interval: 2 seconds.
- Video default interval: 5 seconds.
- Long-running tasks use capped backoff.
- Timeout and interval knobs stay configurable because hardware/API latency is not the spec ideal.

## Error Handling

- API errors continue through `wavespeedaiFailedResponseHandler`.
- Failed prediction status throws an error with task ID, model ID, status, and WaveSpeed error message.
- Poll timeout throws a typed timeout error with task ID and elapsed time.
- Unknown output shape throws a validation error instead of returning partial data.

## Tests

Add focused tests without external API calls:

- Catalog parser maps fixture model types to image/video/generic categories.
- Provider exposes AI SDK v7 registry-compatible methods.
- `languageModel()` delegates to OpenAI-compatible provider with WaveSpeed LLM base URL.
- Image model submit/poll/download flow uses mocked fetch.
- Video model submit/poll flow returns AI SDK video output shape with mocked fetch.
- Generic `run()` submits/polls arbitrary model IDs.

Run checks:

```bash
bun run type-check
bun run lint
bun test
bun run build
```

## Deliberate Simplifications

- `ponytail:` Do not generate per-model request types yet. Ceiling: callers pass model-specific fields through `providerOptions.wavespeedai` or `run()` input. Upgrade path: generate schema-derived types after `/api/v3/models` schemas prove stable.
- `ponytail:` Keep one shared task runner for image/video/generic models. Ceiling: model-specific edge cases may require adapters later. Upgrade path: add tiny category adapters only when tests or real models require them.
- `ponytail:` Do not runtime-fetch the model catalog in normal provider use. Ceiling: published catalog can lag WaveSpeed. Upgrade path: refresh with `bun run update-models`; string escape hatch handles new IDs meanwhile.

## Acceptance Criteria

- `createProviderRegistry({ wavespeedai })` type-checks against AI SDK v7 beta.
- Registry calls work for `languageModel`, `imageModel`, and `videoModel`.
- Existing image-generation usage remains supported.
- Generic `run()` supports model categories not mapped to AI SDK interfaces.
- No network calls occur in tests.
- Build, type-check, lint, and tests pass.
