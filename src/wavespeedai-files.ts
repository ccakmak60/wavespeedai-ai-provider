import type { FilesV4, FilesV4UploadFileCallOptions, FilesV4UploadFileResult } from "@ai-sdk/provider";
import type { FetchFunction } from "@ai-sdk/provider-utils";

export interface WaveSpeedAIFilesConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
}

export class WaveSpeedAIFiles implements FilesV4 {
  readonly specificationVersion = "v4" as const;

  get provider() {
    return this.config.provider;
  }

  constructor(private readonly config: WaveSpeedAIFilesConfig) {}

  async uploadFile(options: FilesV4UploadFileCallOptions): Promise<FilesV4UploadFileResult> {
    const formData = new FormData();
    const data = options.data.type === "text" ? new TextEncoder().encode(options.data.text) : options.data.data;
    const bytes = typeof data === "string" ? Buffer.from(data, "base64") : data;
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);

    formData.append("file", new Blob([copy.buffer], { type: options.mediaType }), options.filename ?? "file");

    const response = await (this.config.fetch ?? fetch)(`${this.config.baseURL}/media/upload/binary`, {
      method: "POST",
      headers: Object.fromEntries(
        Object.entries(this.config.headers()).filter((entry): entry is [string, string] => entry[1] != null),
      ),
      body: formData,
    });
    const value = (await response.json()) as { data?: Record<string, unknown>; url?: string };

    if (!response.ok) {
      throw new Error(`WaveSpeedAI file upload failed: ${response.status} ${JSON.stringify(value)}`);
    }

    const dataObject = (value.data ?? value) as Record<string, unknown>;
    const url = [dataObject.url, dataObject.file_url, dataObject.download_url, dataObject.uri].find(
      (candidate): candidate is string => typeof candidate === "string",
    );
    if (!url) throw new Error("WaveSpeedAI file upload response did not include a URL.");

    return {
      providerReference: { [this.provider]: url },
      mediaType: options.mediaType,
      filename: options.filename,
      warnings: [],
    };
  }
}
