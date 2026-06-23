import type { SpeechModelV4, SpeechModelV4CallOptions, SpeechModelV4Result } from "@ai-sdk/provider";
import type { WaveSpeedAISpeechModelId } from "./generated/wavespeedai-models";
import {
  firstOutputUrl,
  getWaveSpeedAIProviderOptions,
  inferMediaType,
  responseMetadata,
  type WaveSpeedAIModelConfig,
  withoutUndefined,
} from "./wavespeedai-media-model";

export class WaveSpeedAISpeechModel implements SpeechModelV4 {
  readonly specificationVersion = "v4" as const;

  get provider() {
    return this.config.provider;
  }

  constructor(
    readonly modelId: WaveSpeedAISpeechModelId,
    private readonly config: WaveSpeedAIModelConfig,
  ) {}

  async doGenerate(options: SpeechModelV4CallOptions): Promise<SpeechModelV4Result> {
    const prediction = await this.config.taskClient.run(
      this.modelId,
      withoutUndefined({
        text: options.text,
        voice_id: options.voice,
        voice: options.voice,
        output_format: options.outputFormat,
        instructions: options.instructions,
        speed: options.speed,
        language: options.language,
        ...getWaveSpeedAIProviderOptions(options.providerOptions),
      }),
      { headers: options.headers, abortSignal: options.abortSignal, pollIntervalMs: 2_000 },
    );

    const outputUrl = firstOutputUrl(prediction.outputs, this.modelId);
    const audio = await this.config.taskClient.download(outputUrl, {
      abortSignal: options.abortSignal,
    });

    return {
      audio,
      warnings: [],
      response: responseMetadata(this.modelId, this.config.currentDate),
      providerMetadata: { wavespeedai: { mediaType: inferMediaType(outputUrl, "audio/mpeg") } },
    };
  }
}
