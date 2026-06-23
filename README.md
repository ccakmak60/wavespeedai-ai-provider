# AI SDK - WaveSpeedAI Provider

Unofficial [AI SDK](https://ai-sdk.dev) provider for [WaveSpeedAI](https://wavespeed.ai/).

Supports AI SDK v7 provider registry usage for WaveSpeed image, video, speech, transcription, OpenAI-compatible LLMs, file uploads, and generic task execution.

## Setup

```bash
npm install wavespeedai-ai-provider@latest ai@beta
```

```bash
WAVESPEEDAI_API_TOKEN="your-api-token-here"
```

## Provider registry

```ts
import { createProviderRegistry, experimental_generateVideo as generateVideo, generateImage, generateText } from "ai";
import { wavespeedai } from "wavespeedai-ai-provider";

const registry = createProviderRegistry({ wavespeedai });

const { image } = await generateImage({
  model: registry.imageModel("wavespeedai:wavespeed-ai/flux-dev"),
  prompt: "A cat working as a café barista",
});

const { video } = await generateVideo({
  model: registry.videoModel("wavespeedai:alibaba/wan-2.6/image-to-video"),
  prompt: "The cat slowly turns its head and blinks",
  providerOptions: {
    wavespeedai: {
      image: "https://your-uploaded-image.jpg",
      duration: 5,
      resolution: "720p",
    },
  },
});

const { text } = await generateText({
  model: registry.languageModel("wavespeedai:anthropic/claude-opus-4.7"),
  prompt: "Summarize WaveSpeedAI in one sentence.",
});
```

## Direct provider usage

```ts
import { createWaveSpeedAI } from "wavespeedai-ai-provider";

const wavespeedai = createWaveSpeedAI({
  apiToken: process.env.WAVESPEEDAI_API_TOKEN,
  baseURL: "https://api.wavespeed.ai/api/v3",
  llmBaseURL: "https://llm.wavespeed.ai/v1",
});

const prediction = await wavespeedai.run("wavespeed-ai/infinitetalk", {
  image: "https://your-face-image.jpg",
  audio: "https://your-audio.mp3",
  resolution: "480p",
});
```

Use `providerOptions.wavespeedai` for model-specific request fields from WaveSpeed's model docs.

## Refresh model catalog

```bash
WAVESPEEDAI_API_TOKEN=... bun run update-models
```

Generated model IDs are autocomplete only. Free-form strings still work so new WaveSpeed models are usable before the catalog is refreshed.
