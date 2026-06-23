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
