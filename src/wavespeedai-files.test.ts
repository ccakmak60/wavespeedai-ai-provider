import { describe, expect, it, vi } from "vitest";
import { WaveSpeedAIFiles } from "./wavespeedai-files";

describe("WaveSpeedAIFiles", () => {
  it("uploads binary files and returns a provider reference", async () => {
    const taskClient = { uploadFile: vi.fn().mockResolvedValue({ url: "https://cdn.example/upload.png" }) };

    const files = new WaveSpeedAIFiles({
      provider: "wavespeedai",
      taskClient: taskClient as never,
    });

    const result = await files.uploadFile({
      data: { type: "data", data: new Uint8Array([1, 2, 3]) },
      mediaType: "image/png",
      filename: "image.png",
    });

    expect(result.providerReference).toEqual({ wavespeedai: "https://cdn.example/upload.png" });
    expect(taskClient.uploadFile).toHaveBeenCalledWith({
      data: new Uint8Array([1, 2, 3]),
      mediaType: "image/png",
      filename: "image.png",
    });
  });
});
