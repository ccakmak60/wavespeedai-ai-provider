import type { ImageModelV4, ImageModelV4CallOptions, ImageModelV4Result } from "@ai-sdk/provider";
import type { WaveSpeedAIImageModelId } from "./generated/wavespeedai-models";
import {
  firstOutputUrl,
  getWaveSpeedAIProviderOptions,
  responseMetadata,
  type WaveSpeedAIModelConfig,
} from "./wavespeedai-media-model";

export class WaveSpeedAIImageModel implements ImageModelV4 {
  readonly specificationVersion = "v4" as const;
  readonly maxImagesPerCall = 1;

  get provider() {
    return this.config.provider;
  }

  constructor(
    readonly modelId: WaveSpeedAIImageModelId,
    private readonly config: WaveSpeedAIModelConfig,
  ) {}

  async doGenerate(options: ImageModelV4CallOptions): Promise<ImageModelV4Result> {
    const prediction = await this.config.taskClient.run(
      this.modelId,
      {
        prompt: options.prompt,
        size: options.size?.replace("x", "*"),
        aspect_ratio: options.aspectRatio,
        seed: options.seed,
        num_images: options.n,
        ...getWaveSpeedAIProviderOptions(options.providerOptions),
      },
      { headers: options.headers, abortSignal: options.abortSignal, pollIntervalMs: 2_000 },
    );

    const images = await Promise.all(
      prediction.outputs.map((url) => this.config.taskClient.download(url, { abortSignal: options.abortSignal })),
    );

    firstOutputUrl(prediction.outputs, this.modelId);

    return {
      images,
      warnings: [],
      response: responseMetadata(this.modelId, this.config.currentDate),
    };
  }
}
