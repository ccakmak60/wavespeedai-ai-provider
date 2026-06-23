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

export type WaveSpeedAIProviderOptions = Record<string, unknown>;
