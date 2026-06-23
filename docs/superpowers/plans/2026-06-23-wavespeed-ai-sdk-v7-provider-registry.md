# WaveSpeed AI SDK v7 Provider Registry 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `wavespeedai-ai-provider` 升级到 AI SDK v7 beta，并提供覆盖 WaveSpeed 图像、视频、语音、转录、LLM 和任意任务模型的 provider registry 集成。

**架构：** 使用 AI SDK v7 `ProviderV4` 作为主接口，`createProviderRegistry({ wavespeedai })` 可访问 `languageModel`、`imageModel`、`videoModel`、`speechModel`、`transcriptionModel`。WaveSpeed `/api/v3` 任务模型共用一个 submit/poll/download runner；WaveSpeed LLM 走 `@ai-sdk/openai-compatible`，避免手写语言模型。

**技术栈：** TypeScript、Bun、Vitest、AI SDK v7 beta、`@ai-sdk/provider` v4 beta、`@ai-sdk/provider-utils` v5 beta、`@ai-sdk/openai-compatible` v3 beta、WaveSpeed REST API。

---

## 已验证理解

### AI SDK v7 beta

- `ai@7.0.0-beta.183` `customProvider` 支持 `videoModels`，返回 ProviderV4，并暴露 `videoModel(id)`。
- `ai@7.0.0-beta.183` `createProviderRegistry` 支持 `registry.videoModel("provider:model")`。
- `@ai-sdk/provider@4.0.0-beta.19` 导出 `ImageModelV4`、`VideoModelV4`、`SpeechModelV4`、`TranscriptionModelV4`、`ProviderV4`。
- `ImageModelV4.doGenerate()` 输入：`prompt`、`n`、`size`、`aspectRatio`、`seed`、`files`、`mask`、`providerOptions`、`headers`、`abortSignal`。输出：`images: string[] | Uint8Array[]`、`warnings`、`response`。
- `VideoModelV4.doGenerate()` 输入：`prompt`、`n`、`aspectRatio`、`resolution`、`duration`、`fps`、`seed`、`image`、`providerOptions`、`headers`、`abortSignal`。输出：`videos: Array<{ type: "url" | "base64" | "binary"; ... }>`、`warnings`、`response`。
- `SpeechModelV4.doGenerate()` 输入：`text`、`voice`、`outputFormat`、`instructions`、`speed`、`language`、`providerOptions`、`headers`、`abortSignal`。输出：`audio: string | Uint8Array`、`warnings`、`response`。
- `TranscriptionModelV4.doGenerate()` 输入：`audio`、`mediaType`、`providerOptions`、`headers`、`abortSignal`。输出：`text`、`segments`、`language`、`durationInSeconds`、`warnings`、`response`。
- `@ai-sdk/openai-compatible@3.0.0-beta.57` exposes `createOpenAICompatible({ name, apiKey, baseURL, fetch, headers })` and is the shortest correct path for WaveSpeed LLM.

### WaveSpeed API

- Base URL for media/task models: `https://api.wavespeed.ai/api/v3`.
- Submit task: `POST /api/v3/{model_id}` with JSON body and `Authorization: Bearer <key>`.
- Poll result: `GET /api/v3/predictions/{task-id}`.
- Task statuses include `created`, `processing`, `completed`, `failed`.
- Completed task outputs are URLs in `data.outputs` for image/video/audio-style tasks.
- Recommended polling: image at least 2s, video at least 5s, then backoff up to 30s.
- Model catalog: `GET /api/v3/models` returns `model_id`, `name`, `description`, `type`, `base_price`, `formula`, and `api_schema.api_schemas[].request_schema`.
- Upload endpoint: `POST /api/v3/media/upload/binary` with multipart `file`, returns URL used in model requests.
- Models catalog categories include `text-to-video`, `text-to-image`, `lora-support`, `image-to-video`, `image-to-image`, `image-to-3d`, `video-dubbing`, `training`, `video-to-video`, `upscaler`, `video-effects`, `portrait-transfer`, `text-to-audio`, `audio-to-audio`, `ai-remover`, `digital-human`, `motion-control`, `content-moderation`, `llm`, `video-to-text`, `image-to-text`, `speech-to-text`, `video-extend`, `text-to-3d`, `audio-to-video`.
- LLM endpoint: `https://llm.wavespeed.ai/v1/chat/completions`, OpenAI-compatible Chat Completions, model IDs like `anthropic/claude-opus-4.7`.

## File Structure

- Modify `package.json`: bump AI SDK deps to v7 beta, add `@ai-sdk/openai-compatible`, add `update-models` script.
- Modify `bun.lock`: update lockfile via `bun install`.
- Modify `src/wavespeedai-provider.ts`: expose ProviderV4-compatible methods and generic `run()`.
- Modify `src/index.ts`: export new types/classes.
- Delete or replace `src/wavespeedai-image-settings.ts`: generated catalog supersedes hand-written image ID list.
- Create `src/generated/wavespeedai-models.ts`: generated model metadata and model ID unions.
- Create `src/wavespeedai-types.ts`: shared public types and model category helpers.
- Create `src/wavespeedai-task.ts`: submit/poll/upload/download helpers.
- Create `src/wavespeedai-media-model.ts`: shared base helpers for task-backed model classes.
- Create `src/wavespeedai-image-model.ts`: ImageModelV4 implementation.
- Create `src/wavespeedai-video-model.ts`: VideoModelV4 implementation.
- Create `src/wavespeedai-speech-model.ts`: SpeechModelV4 implementation.
- Create `src/wavespeedai-transcription-model.ts`: TranscriptionModelV4 implementation.
- Create `scripts/update-models.ts`: fetch `/models`, categorize, write generated file.
- Modify `README.md`: show v7 registry usage for image/video/LLM/generic task.
- Modify `src/wavespeedai-provider.test.ts`: provider and registry tests.
- Create `src/wavespeedai-task.test.ts`: mocked fetch task runner tests.
- Create `src/wavespeedai-models.test.ts`: catalog categorization tests.

## Capability Map

| WaveSpeed type                                                                                                                            | AI SDK v7 surface                            | Mapping                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `llm`                                                                                                                                     | `languageModel`                              | `@ai-sdk/openai-compatible` with `llmBaseURL`                                   |
| `text-to-image`, `image-to-image`, `upscaler`, `ai-remover`, `portrait-transfer`                                                          | `imageModel`                                 | task runner, download image URL to `Uint8Array`                                 |
| `text-to-video`, `image-to-video`, `video-to-video`, `video-effects`, `video-extend`, `motion-control`, `digital-human`, `audio-to-video` | `videoModel`                                 | task runner, return output URLs as `{ type: "url", mediaType: "video/mp4" }`    |
| `text-to-audio`, speech synthesis models                                                                                                  | `speechModel`                                | task runner, download audio URL to `Uint8Array`                                 |
| `speech-to-text`, `video-to-text`                                                                                                         | `transcriptionModel` where response has text | task runner, parse text output if schema supports it; otherwise generic `run()` |
| `image-to-text`                                                                                                                           | generic `run()` first                        | not enough evidence that response matches LanguageModelV4                       |
| `image-to-3d`, `text-to-3d`, `training`, `lora-support`, `content-moderation`, `audio-to-audio`, `video-dubbing`                          | `run()`                                      | arbitrary task input/output                                                     |

`ponytail:` generated model ID unions are useful autocomplete, but `(string & {})` remains. Ceiling: catalog can lag. Upgrade path: rerun `bun run update-models`.

`ponytail:` no per-model JSON Schema TypeScript generation in first implementation. Ceiling: provider-specific fields are typed as `Record<string, unknown>`. Upgrade path: add schema-to-types only after generated catalog stabilizes.

---

### Task 1: Upgrade AI SDK dependencies

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`

- [ ] **Step 1: update dependency versions**

Edit `package.json` dependencies:

```json
{
  "dependencies": {
    "@ai-sdk/openai-compatible": "3.0.0-beta.57",
    "@ai-sdk/provider": "4.0.0-beta.19",
    "@ai-sdk/provider-utils": "5.0.0-beta.49",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "ai": "7.0.0-beta.183"
  }
}
```

Add script:

```json
{
  "scripts": {
    "update-models": "bun scripts/update-models.ts"
  }
}
```

- [ ] **Step 2: update lockfile**

Run:

```bash
bun install
```

Expected: exits `0`, `bun.lock` updated.

- [ ] **Step 3: verify package resolution**

Run:

```bash
bun pm ls @ai-sdk/provider ai @ai-sdk/openai-compatible @ai-sdk/provider-utils
```

Expected: output includes beta versions from Step 1.

- [ ] **Step 4: commit**

```bash
git add package.json bun.lock
git commit -m "chore: upgrade to ai sdk v7 beta"
```

### Task 2: Add generated model catalog foundation

**Files:**

- Create: `src/wavespeedai-types.ts`
- Create: `src/generated/wavespeedai-models.ts`
- Create: `src/wavespeedai-models.test.ts`
- Create: `scripts/update-models.ts`

- [ ] **Step 1: create catalog types**

Create `src/wavespeedai-types.ts`:

```ts
export type WaveSpeedAIModelCategory = "image" | "video" | "speech" | "transcription" | "language" | "generic";

export interface WaveSpeedAIModelMetadata {
  modelId: string;
  name: string;
  type: string;
  category: WaveSpeedAIModelCategory;
  description?: string;
  basePrice?: number;
  formula?: string;
  requestSchema?: unknown;
}

const imageTypes = new Set(["text-to-image", "image-to-image", "upscaler", "ai-remover", "portrait-transfer"]);

const videoTypes = new Set([
  "text-to-video",
  "image-to-video",
  "video-to-video",
  "video-effects",
  "video-extend",
  "motion-control",
  "digital-human",
  "audio-to-video",
]);

export function categorizeWaveSpeedAIModel(type: string): WaveSpeedAIModelCategory {
  if (type === "llm") return "language";
  if (imageTypes.has(type)) return "image";
  if (videoTypes.has(type)) return "video";
  if (type === "text-to-audio") return "speech";
  if (type === "speech-to-text" || type === "video-to-text") return "transcription";
  return "generic";
}
```

- [ ] **Step 2: create initial generated catalog**

Create `src/generated/wavespeedai-models.ts`:

```ts
import type { WaveSpeedAIModelMetadata } from "../wavespeedai-types";

export const wavespeedaiModels = [
  {
    modelId: "wavespeed-ai/flux-dev",
    name: "wavespeed-ai/flux-dev",
    type: "text-to-image",
    category: "image",
  },
  {
    modelId: "alibaba/wan-2.6/image-to-video",
    name: "alibaba/wan-2.6/image-to-video",
    type: "image-to-video",
    category: "video",
  },
  {
    modelId: "minimax/speech-2.6-hd",
    name: "minimax/speech-2.6-hd",
    type: "text-to-audio",
    category: "speech",
  },
] as const satisfies readonly WaveSpeedAIModelMetadata[];

type ModelIdByCategory<Category extends WaveSpeedAIModelMetadata["category"]> =
  (typeof wavespeedaiModels)[number] extends infer Model
    ? Model extends { category: Category; modelId: infer ModelId }
      ? ModelId
      : never
    : never;

export type WaveSpeedAIModelId = (typeof wavespeedaiModels)[number]["modelId"] | (string & {});
export type WaveSpeedAIImageModelId = ModelIdByCategory<"image"> | (string & {});
export type WaveSpeedAIVideoModelId = ModelIdByCategory<"video"> | (string & {});
export type WaveSpeedAISpeechModelId = ModelIdByCategory<"speech"> | (string & {});
export type WaveSpeedAITranscriptionModelId = ModelIdByCategory<"transcription"> | (string & {});
export type WaveSpeedAILanguageModelId = string & {};
```

- [ ] **Step 3: add catalog tests**

Create `src/wavespeedai-models.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { categorizeWaveSpeedAIModel } from "./wavespeedai-types";

describe("categorizeWaveSpeedAIModel", () => {
  it.each([
    ["text-to-image", "image"],
    ["image-to-video", "video"],
    ["digital-human", "video"],
    ["text-to-audio", "speech"],
    ["speech-to-text", "transcription"],
    ["llm", "language"],
    ["image-to-3d", "generic"],
  ] as const)("maps %s to %s", (type, category) => {
    expect(categorizeWaveSpeedAIModel(type)).toBe(category);
  });
});
```

- [ ] **Step 4: add update script**

Create `scripts/update-models.ts`:

```ts
import { writeFile } from "node:fs/promises";
import { categorizeWaveSpeedAIModel } from "../src/wavespeedai-types";

const apiToken = process.env.WAVESPEEDAI_API_TOKEN;

if (!apiToken) {
  throw new Error("WAVESPEEDAI_API_TOKEN is required to fetch the WaveSpeed model catalog.");
}

const response = await fetch("https://api.wavespeed.ai/api/v3/models", {
  headers: { Authorization: `Bearer ${apiToken}` },
});

if (!response.ok) {
  throw new Error(`Failed to fetch WaveSpeed models: ${response.status} ${await response.text()}`);
}

const payload = (await response.json()) as { data: Array<Record<string, unknown>> };

const models = payload.data
  .map((model) => {
    const modelId = String(model.model_id ?? model.name);
    const type = String(model.type ?? "generic");
    const apiSchemas = (model.api_schema as { api_schemas?: Array<{ request_schema?: unknown }> } | undefined)
      ?.api_schemas;

    return {
      modelId,
      name: String(model.name ?? modelId),
      type,
      category: categorizeWaveSpeedAIModel(type),
      description: typeof model.description === "string" ? model.description : undefined,
      basePrice: typeof model.base_price === "number" ? model.base_price : undefined,
      formula: typeof model.formula === "string" ? model.formula : undefined,
      requestSchema: apiSchemas?.find((schema) => schema.request_schema)?.request_schema,
    };
  })
  .sort((a, b) => a.modelId.localeCompare(b.modelId));

const source = `import type { WaveSpeedAIModelMetadata } from "../wavespeedai-types";\n\nexport const wavespeedaiModels = ${JSON.stringify(models, null, 2)} as const satisfies readonly WaveSpeedAIModelMetadata[];\n\ntype ModelIdByCategory<Category extends WaveSpeedAIModelMetadata["category"]> =\n  (typeof wavespeedaiModels)[number] extends infer Model\n    ? Model extends { category: Category; modelId: infer ModelId }\n      ? ModelId\n      : never\n    : never;\n\nexport type WaveSpeedAIModelId = (typeof wavespeedaiModels)[number]["modelId"] | (string & {});\nexport type WaveSpeedAIImageModelId = ModelIdByCategory<"image"> | (string & {});\nexport type WaveSpeedAIVideoModelId = ModelIdByCategory<"video"> | (string & {});\nexport type WaveSpeedAISpeechModelId = ModelIdByCategory<"speech"> | (string & {});\nexport type WaveSpeedAITranscriptionModelId = ModelIdByCategory<"transcription"> | (string & {});\nexport type WaveSpeedAILanguageModelId = string & {};\n`;

await writeFile("src/generated/wavespeedai-models.ts", `${source}\n`);
console.log(`Wrote ${models.length} WaveSpeed models.`);
```

- [ ] **Step 5: run tests for catalog**

Run:

```bash
bun vitest --config vitest.node.config.js run src/wavespeedai-models.test.ts
```

Expected: PASS.

- [ ] **Step 6: commit**

```bash
git add src/wavespeedai-types.ts src/generated/wavespeedai-models.ts src/wavespeedai-models.test.ts scripts/update-models.ts package.json
git commit -m "feat: add wavespeed model catalog generation"
```

### Task 3: Add shared WaveSpeed task runner

**Files:**

- Create: `src/wavespeedai-task.ts`
- Modify: `src/wavespeedai-error.ts`
- Create: `src/wavespeedai-task.test.ts`

- [ ] **Step 1: write failing task runner tests**

Create `src/wavespeedai-task.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createWaveSpeedAITaskClient } from "./wavespeedai-task";

describe("WaveSpeed task client", () => {
  it("submits and polls a completed task", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "pred_1" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: "pred_1", status: "completed", outputs: ["https://cdn.example/out.png"] },
          }),
          { status: 200 },
        ),
      );

    const client = createWaveSpeedAITaskClient({
      baseURL: "https://api.example.com/api/v3",
      headers: () => ({ Authorization: "Bearer test" }),
      fetch,
      sleep: async () => undefined,
    });

    const result = await client.run("wavespeed-ai/flux-dev", { prompt: "cat" }, { pollIntervalMs: 1 });

    expect(result.id).toBe("pred_1");
    expect(result.outputs).toEqual(["https://cdn.example/out.png"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: run test and confirm failure**

Run:

```bash
bun vitest --config vitest.node.config.js run src/wavespeedai-task.test.ts
```

Expected: FAIL because `wavespeedai-task` does not exist.

- [ ] **Step 3: implement task runner**

Create `src/wavespeedai-task.ts`:

```ts
import type { FetchFunction } from "@ai-sdk/provider-utils";

export interface WaveSpeedAITaskClientConfig {
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  sleep?: (ms: number) => Promise<void>;
}

export interface WaveSpeedAIRunOptions {
  headers?: Record<string, string | undefined>;
  abortSignal?: AbortSignal;
  pollIntervalMs?: number;
  maxPollIntervalMs?: number;
  timeoutMs?: number;
}

export interface WaveSpeedAIPrediction {
  id: string;
  status: string;
  outputs: string[];
  model?: string;
  error?: string;
  raw: unknown;
}

export function createWaveSpeedAITaskClient(config: WaveSpeedAITaskClientConfig) {
  const fetchImplementation = config.fetch ?? fetch;
  const sleep = config.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function requestJson(url: string, init: RequestInit): Promise<{ value: unknown; headers: Headers }> {
    const response = await fetchImplementation(url, init);
    const text = await response.text();
    const value = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw new Error(`WaveSpeedAI request failed: ${response.status} ${text}`);
    }

    return { value, headers: response.headers };
  }

  function readPrediction(value: unknown): WaveSpeedAIPrediction {
    const data = (value as { data?: Record<string, unknown> }).data;
    if (!data || typeof data.id !== "string") throw new Error("WaveSpeedAI response missing prediction id.");
    const outputs = data.outputs;

    return {
      id: data.id,
      status: String(data.status ?? "created"),
      outputs: Array.isArray(outputs) ? outputs.map(String) : typeof outputs === "string" ? [outputs] : [],
      model: typeof data.model === "string" ? data.model : undefined,
      error: typeof data.error === "string" ? data.error : undefined,
      raw: value,
    };
  }

  return {
    async run(modelId: string, input: Record<string, unknown>, options: WaveSpeedAIRunOptions = {}) {
      const startedAt = Date.now();
      const pollIntervalMs = options.pollIntervalMs ?? 2_000;
      const maxPollIntervalMs = options.maxPollIntervalMs ?? 30_000;
      const timeoutMs = options.timeoutMs ?? 300_000;

      const submit = await requestJson(`${config.baseURL}/${modelId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.headers(),
          ...options.headers,
        },
        body: JSON.stringify(input),
        signal: options.abortSignal,
      });

      const taskId = readPrediction(submit.value).id;
      let waitMs = pollIntervalMs;

      while (Date.now() - startedAt < timeoutMs) {
        const result = await requestJson(`${config.baseURL}/predictions/${taskId}`, {
          method: "GET",
          headers: { ...config.headers(), ...options.headers },
          signal: options.abortSignal,
        });

        const prediction = readPrediction(result.value);
        if (prediction.status === "completed") return prediction;
        if (prediction.status === "failed") {
          throw new Error(`WaveSpeedAI prediction ${taskId} failed: ${prediction.error ?? "unknown error"}`);
        }

        await sleep(waitMs);
        waitMs = Math.min(maxPollIntervalMs, Math.ceil(waitMs * 1.5));
      }

      throw new Error(`WaveSpeedAI prediction ${taskId} timed out after ${timeoutMs}ms.`);
    },
  };
}
```

- [ ] **Step 4: verify task tests pass**

Run:

```bash
bun vitest --config vitest.node.config.js run src/wavespeedai-task.test.ts
```

Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/wavespeedai-task.ts src/wavespeedai-task.test.ts
git commit -m "feat: add wavespeed task runner"
```

### Task 4: Implement AI SDK v7 image/video/speech/transcription models

**Files:**

- Replace: `src/wavespeedai-image-model.ts`
- Create: `src/wavespeedai-video-model.ts`
- Create: `src/wavespeedai-speech-model.ts`
- Create: `src/wavespeedai-transcription-model.ts`
- Create: `src/wavespeedai-media-model.ts`
- Modify: `src/wavespeedai-provider.test.ts`

- [ ] **Step 1: add provider shape tests**

Modify `src/wavespeedai-provider.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProviderRegistry } from "ai";
import { createWaveSpeedAI } from "./wavespeedai-provider";
import { WaveSpeedAIImageModel } from "./wavespeedai-image-model";
import { WaveSpeedAIVideoModel } from "./wavespeedai-video-model";

describe("createWaveSpeedAI", () => {
  it("creates registry-compatible image and video models", () => {
    const provider = createWaveSpeedAI({ apiToken: "test-token" });
    const registry = createProviderRegistry({ wavespeedai: provider });

    expect(registry.imageModel("wavespeedai:wavespeed-ai/flux-dev")).toBeInstanceOf(WaveSpeedAIImageModel);
    expect(registry.videoModel("wavespeedai:alibaba/wan-2.6/image-to-video")).toBeInstanceOf(WaveSpeedAIVideoModel);
  });

  it("exposes generic run", () => {
    const provider = createWaveSpeedAI({ apiToken: "test-token" });
    expect(provider.run).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: run provider test and confirm failure**

Run:

```bash
bun vitest --config vitest.node.config.js run src/wavespeedai-provider.test.ts
```

Expected: FAIL because v7 provider methods/classes do not exist yet.

- [ ] **Step 3: implement media input helpers**

Create `src/wavespeedai-media-model.ts`:

```ts
import type { SharedV4Warning } from "@ai-sdk/provider";

export function getWaveSpeedAIProviderOptions(providerOptions: Record<string, unknown> | undefined) {
  return ((providerOptions?.wavespeedai as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
}

export function addWarning(warnings: SharedV4Warning[], setting: string, details: string) {
  warnings.push({ type: "unsupported-setting", setting, details });
}

export function firstOutputUrl(outputs: string[], modelId: string) {
  const output = outputs[0];
  if (!output) throw new Error(`WaveSpeedAI model ${modelId} completed without outputs.`);
  return output;
}
```

- [ ] **Step 4: implement v7 image model**

Replace `src/wavespeedai-image-model.ts` with an `ImageModelV4` class that builds body:

```ts
{
  prompt,
  size: size?.replace("x", "*"),
  aspect_ratio: aspectRatio,
  seed,
  num_images: n,
  ...providerOptions.wavespeedai
}
```

Use task runner, download every output URL with fetch, and return `Uint8Array[]`.

- [ ] **Step 5: implement v7 video model**

Create `src/wavespeedai-video-model.ts` with `VideoModelV4`. Build body:

```ts
{
  prompt,
  aspect_ratio: aspectRatio,
  resolution,
  duration,
  fps,
  seed,
  image: image?.type === "url" ? image.url : undefined,
  num_videos: n,
  ...providerOptions.wavespeedai
}
```

Return output URLs as:

```ts
videos: prediction.outputs.map((url) => ({ type: "url", url, mediaType: "video/mp4" }));
```

`ponytail:` binary image upload for `image.type === "file"` can use the upload helper in Task 6. Until then, warn and require `providerOptions.wavespeedai.image` for file uploads.

- [ ] **Step 6: implement speech model**

Create `src/wavespeedai-speech-model.ts` with `SpeechModelV4`. Build body:

```ts
{
  text,
  voice_id: voice,
  output_format: outputFormat,
  instructions,
  speed,
  language,
  ...providerOptions.wavespeedai
}
```

Run task, download first audio URL, return `audio: Uint8Array`.

- [ ] **Step 7: implement transcription model**

Create `src/wavespeedai-transcription-model.ts` with `TranscriptionModelV4`. For first cut, accept `providerOptions.wavespeedai.audio` URL. If only `audio` bytes are provided, throw a clear error telling caller to use `provider.files()` after Task 6 or `providerOptions.wavespeedai.audio`.

- [ ] **Step 8: run provider test**

Run:

```bash
bun vitest --config vitest.node.config.js run src/wavespeedai-provider.test.ts
```

Expected: PASS.

- [ ] **Step 9: commit**

```bash
git add src/wavespeedai-image-model.ts src/wavespeedai-video-model.ts src/wavespeedai-speech-model.ts src/wavespeedai-transcription-model.ts src/wavespeedai-media-model.ts src/wavespeedai-provider.test.ts
git commit -m "feat: add wavespeed ai sdk v7 media models"
```

### Task 5: Wire ProviderV4 and LLM delegation

**Files:**

- Modify: `src/wavespeedai-provider.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: rewrite provider interface**

Implement `WaveSpeedAIProvider extends ProviderV4` with:

```ts
languageModel(modelId: WaveSpeedAILanguageModelId): LanguageModelV4;
embeddingModel(modelId: string): EmbeddingModelV4;
imageModel(modelId: WaveSpeedAIImageModelId): WaveSpeedAIImageModel;
image(modelId: WaveSpeedAIImageModelId): WaveSpeedAIImageModel;
videoModel(modelId: WaveSpeedAIVideoModelId): WaveSpeedAIVideoModel;
speechModel(modelId: WaveSpeedAISpeechModelId): WaveSpeedAISpeechModel;
transcriptionModel(modelId: WaveSpeedAITranscriptionModelId): WaveSpeedAITranscriptionModel;
run(modelId: WaveSpeedAIModelId, input: Record<string, unknown>, options?: WaveSpeedAIRunOptions): Promise<WaveSpeedAIPrediction>;
```

- [ ] **Step 2: delegate LLM to OpenAI-compatible provider**

Use:

```ts
const llmProvider = createOpenAICompatible({
  name: "wavespeedai",
  apiKey,
  baseURL: options.llmBaseURL ?? "https://llm.wavespeed.ai/v1",
  fetch: options.fetch,
  headers: options.headers,
});
```

Return `llmProvider.languageModel(modelId)` from `languageModel`.

- [ ] **Step 3: keep unsupported embedding/reranking explicit**

Throw `NoSuchModelError` for embedding/reranking until WaveSpeed documents compatible endpoints.

- [ ] **Step 4: export public types**

Update `src/index.ts` to export provider, model classes, generated model IDs, task types.

- [ ] **Step 5: type-check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 6: commit**

```bash
git add src/wavespeedai-provider.ts src/index.ts
git commit -m "feat: expose wavespeed provider v4 registry API"
```

### Task 6: Add AI SDK files API for WaveSpeed uploads

**Files:**

- Create: `src/wavespeedai-files.ts`
- Modify: `src/wavespeedai-provider.ts`
- Create: `src/wavespeedai-files.test.ts`

- [ ] **Step 1: write upload test**

Create `src/wavespeedai-files.test.ts` with a mocked fetch that asserts multipart body is sent to `/media/upload/binary` and returns a provider reference keyed by `wavespeedai`.

- [ ] **Step 2: implement `FilesV4`**

Create `src/wavespeedai-files.ts` with `uploadFile({ data, filename })`, using `FormData` and returning a provider reference that contains the uploaded URL.

- [ ] **Step 3: wire `files()` into provider**

Add `files(): FilesV4` to `createWaveSpeedAI` result.

- [ ] **Step 4: run upload test**

Run:

```bash
bun vitest --config vitest.node.config.js run src/wavespeedai-files.test.ts
```

Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/wavespeedai-files.ts src/wavespeedai-files.test.ts src/wavespeedai-provider.ts
git commit -m "feat: add wavespeed file uploads"
```

### Task 7: Update docs and examples

**Files:**

- Modify: `README.md`
- Modify: `examples/simple.ts`

- [ ] **Step 1: document registry usage**

Add README examples for:

```ts
const registry = createProviderRegistry({ wavespeedai });
registry.imageModel("wavespeedai:wavespeed-ai/flux-dev");
registry.videoModel("wavespeedai:alibaba/wan-2.6/image-to-video");
registry.languageModel("wavespeedai:anthropic/claude-opus-4.7");
```

- [ ] **Step 2: document generic run**

Add:

```ts
const prediction = await wavespeedai.run("wavespeed-ai/infinitetalk", {
  image: "https://your-face-image.jpg",
  audio: "https://your-audio.mp3",
  resolution: "480p",
});
```

- [ ] **Step 3: document catalog refresh**

Add:

```bash
WAVESPEEDAI_API_TOKEN=... bun run update-models
```

- [ ] **Step 4: run markdown-adjacent checks**

Run:

```bash
bun run prettier-check
```

Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add README.md examples/simple.ts
git commit -m "docs: add wavespeed registry usage"
```

### Task 8: Full verification

**Files:**

- Modify as needed from failed checks.

- [ ] **Step 1: type-check**

Run:

```bash
bun run type-check
```

Expected: PASS.

- [ ] **Step 2: lint**

Run:

```bash
bun run lint
```

Expected: PASS.

- [ ] **Step 3: test**

Run:

```bash
bun test
```

Expected: PASS in Node and Edge configs.

- [ ] **Step 4: build**

Run:

```bash
bun run build
```

Expected: PASS, `dist/` generated.

- [ ] **Step 5: run diagnostics**

Run Pi diagnostics on edited files with `lens_diagnostics(mode="all")`.

Expected: no blocking errors.

- [ ] **Step 6: final commit**

If verification fixes changed files:

```bash
git add .
git commit -m "test: verify wavespeed ai sdk v7 provider"
```

If no files changed, no commit is needed.

## Out-of-Scope for First Implementation

- JSON Schema to TypeScript per-model input types.
- Runtime catalog fetch on every provider import.
- Native AI SDK `LanguageModelV4` for `/api/v3` non-LLM task models.
- Guessing every model-specific media input field beyond documented common aliases; users can pass exact fields through `providerOptions.wavespeedai` or `run()`.

## Completion Criteria

- AI SDK v7 beta registry supports `imageModel`, `videoModel`, `languageModel`, `speechModel`, `transcriptionModel`, and `files` for WaveSpeed.
- Generic `run()` covers every WaveSpeed `/api/v3/{model_id}` model category.
- Existing image usage still works through `wavespeedai.image(...)`.
- Tests use mocked fetch only; no WaveSpeed network calls in CI.
- `bun run type-check`, `bun run lint`, `bun test`, and `bun run build` pass.
