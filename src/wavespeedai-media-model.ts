import type { SharedV4ProviderOptions, SharedV4Warning } from "@ai-sdk/provider";

export interface WaveSpeedAIModelConfig {
  provider: string;
  taskClient: import("./wavespeedai-task").WaveSpeedAITaskClient;
  currentDate?: () => Date;
}

export function getWaveSpeedAIProviderOptions(providerOptions: SharedV4ProviderOptions | undefined) {
  return ((providerOptions?.wavespeedai as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
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
