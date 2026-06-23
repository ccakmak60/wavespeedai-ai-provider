import type { ImageModelV4, ImageModelV4CallOptions, ImageModelV4Result } from "@ai-sdk/provider";
import type { WaveSpeedAIImageModelId } from "./generated/wavespeedai-models";
import {
  fileToUrl,
  firstOutputUrl,
  getWaveSpeedAIProviderOptions,
  responseMetadata,
  type WaveSpeedAIModelConfig,
  withoutUndefined,
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
    const imageUrls = await Promise.all(
      (options.files ?? []).map((file, index) =>
        fileToUrl(file, this.config, {
          headers: options.headers,
          abortSignal: options.abortSignal,
          filename: `image-${index}`,
        }),
      ),
    );
    const maskUrl = await fileToUrl(options.mask, this.config, {
      headers: options.headers,
      abortSignal: options.abortSignal,
      filename: "mask",
    });

    const prediction = await this.config.taskClient.run(
      this.modelId,
      withoutUndefined({
        prompt: options.prompt,
        size: options.size?.replace("x", "*"),
        aspect_ratio: options.aspectRatio,
        seed: options.seed,
        num_images: options.n,
        image: imageUrls[0],
        image_url: imageUrls[0],
        images: imageUrls.length > 0 ? imageUrls : undefined,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        mask: maskUrl,
        mask_url: maskUrl,
        ...getWaveSpeedAIProviderOptions(options.providerOptions),
      }),
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
