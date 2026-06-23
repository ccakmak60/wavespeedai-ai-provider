import type { FilesV4, FilesV4UploadFileCallOptions, FilesV4UploadFileResult } from "@ai-sdk/provider";
import type { WaveSpeedAITaskClient } from "./wavespeedai-task";

export interface WaveSpeedAIFilesConfig {
  provider: string;
  taskClient: WaveSpeedAITaskClient;
}

export class WaveSpeedAIFiles implements FilesV4 {
  readonly specificationVersion = "v4" as const;

  get provider() {
    return this.config.provider;
  }

  constructor(private readonly config: WaveSpeedAIFilesConfig) {}

  async uploadFile(options: FilesV4UploadFileCallOptions): Promise<FilesV4UploadFileResult> {
    const data = options.data.type === "text" ? new TextEncoder().encode(options.data.text) : options.data.data;
    const { url } = await this.config.taskClient.uploadFile({
      data,
      mediaType: options.mediaType,
      filename: options.filename,
    });

    return {
      providerReference: { [this.provider]: url },
      mediaType: options.mediaType,
      filename: options.filename,
      warnings: [],
    };
  }
}
