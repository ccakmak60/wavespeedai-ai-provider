import type {
  Experimental_VideoModelV4File as VideoModelV4File,
  ImageModelV4File,
  SharedV4ProviderOptions,
  SharedV4Warning,
} from "@ai-sdk/provider";

export interface WaveSpeedAIModelConfig {
  provider: string;
  taskClient: import("./wavespeedai-task").WaveSpeedAITaskClient;
  currentDate?: () => Date;
}

export function getWaveSpeedAIProviderOptions(providerOptions: SharedV4ProviderOptions | undefined) {
  return ((providerOptions?.wavespeedai as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
}

export function withoutUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter((entry) => entry[1] !== undefined));
}

export function unsupported(feature: string, details: string): SharedV4Warning {
  return { type: "unsupported", feature, details };
}

export function firstOutputUrl(outputs: string[], modelId: string) {
  const output = outputs[0];
  if (!output) throw new Error(`WaveSpeedAI model ${modelId} completed without outputs.`);
  return output;
}

export function responseMetadata(modelId: string, currentDate?: () => Date, headers?: Record<string, string>) {
  return { timestamp: currentDate?.() ?? new Date(), modelId, headers };
}

export function inferMediaType(url: string, fallback: string) {
  const pathname = new URL(url, "https://example.invalid").pathname.toLowerCase();
  if (pathname.endsWith(".webm")) return "video/webm";
  if (pathname.endsWith(".mov") || pathname.endsWith(".qt")) return "video/quicktime";
  if (pathname.endsWith(".mp3")) return "audio/mpeg";
  if (pathname.endsWith(".wav")) return "audio/wav";
  if (pathname.endsWith(".ogg")) return "audio/ogg";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".png")) return "image/png";
  return fallback;
}

export async function fileToUrl(
  file: ImageModelV4File | VideoModelV4File | undefined,
  config: WaveSpeedAIModelConfig,
  options: { abortSignal?: AbortSignal; headers?: Record<string, string | undefined>; filename?: string } = {},
) {
  if (!file) return undefined;
  if (file.type === "url") return file.url;
  const uploaded = await config.taskClient.uploadFile({
    data: file.data,
    mediaType: file.mediaType,
    filename: options.filename,
    headers: options.headers,
    abortSignal: options.abortSignal,
  });
  return uploaded.url;
}
