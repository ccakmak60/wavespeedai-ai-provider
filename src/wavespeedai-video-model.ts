import type {
  Experimental_VideoModelV4 as VideoModelV4,
  Experimental_VideoModelV4CallOptions as VideoModelV4CallOptions,
  Experimental_VideoModelV4Result as VideoModelV4Result,
} from "@ai-sdk/provider";
import type { WaveSpeedAIVideoModelId } from "./generated/wavespeedai-models";
import {
  fileToUrl,
  getWaveSpeedAIProviderOptions,
  inferMediaType,
  responseMetadata,
  type WaveSpeedAIModelConfig,
  withoutUndefined,
} from "./wavespeedai-media-model";

export class WaveSpeedAIVideoModel implements VideoModelV4 {
  readonly specificationVersion = "v4" as const;
  readonly maxVideosPerCall = 1;

  get provider() {
    return this.config.provider;
  }

  constructor(
    readonly modelId: WaveSpeedAIVideoModelId,
    private readonly config: WaveSpeedAIModelConfig,
  ) {}

  async doGenerate(options: VideoModelV4CallOptions): Promise<VideoModelV4Result> {
    const providerOptions = getWaveSpeedAIProviderOptions(options.providerOptions);
    const inputUrl = await fileToUrl(options.image, this.config, {
      headers: options.headers,
      abortSignal: options.abortSignal,
      filename: "video-input",
    });

    const prediction = await this.config.taskClient.run(
      this.modelId,
      withoutUndefined({
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio,
        resolution: options.resolution,
        duration: options.duration,
        fps: options.fps,
        seed: options.seed,
        image: inputUrl,
        image_url: inputUrl,
        video: inputUrl,
        video_url: inputUrl,
        num_videos: options.n,
        ...providerOptions,
      }),
      { headers: options.headers, abortSignal: options.abortSignal, pollIntervalMs: 5_000 },
    );

    return {
      videos: prediction.outputs.map((url) => ({ type: "url", url, mediaType: inferMediaType(url, "video/mp4") })),
      warnings: [],
      response: responseMetadata(this.modelId, this.config.currentDate),
    };
  }
}
