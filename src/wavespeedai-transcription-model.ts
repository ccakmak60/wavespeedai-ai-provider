import type {
  TranscriptionModelV4,
  TranscriptionModelV4CallOptions,
  TranscriptionModelV4Result,
} from "@ai-sdk/provider";
import type { WaveSpeedAITranscriptionModelId } from "./generated/wavespeedai-models";
import {
  getWaveSpeedAIProviderOptions,
  responseMetadata,
  type WaveSpeedAIModelConfig,
} from "./wavespeedai-media-model";

export class WaveSpeedAITranscriptionModel implements TranscriptionModelV4 {
  readonly specificationVersion = "v4" as const;

  get provider() {
    return this.config.provider;
  }

  constructor(
    readonly modelId: WaveSpeedAITranscriptionModelId,
    private readonly config: WaveSpeedAIModelConfig,
  ) {}

  async doGenerate(options: TranscriptionModelV4CallOptions): Promise<TranscriptionModelV4Result> {
    const providerOptions = getWaveSpeedAIProviderOptions(options.providerOptions);
    const audio = providerOptions.audio;
    if (typeof audio !== "string") {
      throw new Error(
        "WaveSpeedAI transcription requires providerOptions.wavespeedai.audio with an uploaded audio URL.",
      );
    }

    const prediction = await this.config.taskClient.run(
      this.modelId,
      { audio, media_type: options.mediaType, ...providerOptions },
      { headers: options.headers, abortSignal: options.abortSignal, pollIntervalMs: 2_000 },
    );

    const raw = prediction.raw as {
      data?: { text?: string; language?: string; duration?: number; durationInSeconds?: number };
    };
    const text = raw.data?.text ?? prediction.outputs[0] ?? "";

    return {
      text,
      segments: [],
      language: raw.data?.language,
      durationInSeconds: raw.data?.durationInSeconds ?? raw.data?.duration,
      warnings: [],
      response: responseMetadata(this.modelId, this.config.currentDate),
    };
  }
}
