import { describe, expect, it, vi } from "vitest";
import { WaveSpeedAIFiles } from "./wavespeedai-files";

describe("WaveSpeedAIFiles", () => {
  it("uploads binary files and returns a provider reference", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { url: "https://cdn.example/upload.png" } }), {
        status: 200,
      }),
    );

    const files = new WaveSpeedAIFiles({
      provider: "wavespeedai",
      baseURL: "https://api.example.com/api/v3",
      headers: () => ({ Authorization: "Bearer test" }),
      fetch,
    });

    const result = await files.uploadFile({
      data: { type: "data", data: new Uint8Array([1, 2, 3]) },
      mediaType: "image/png",
      filename: "image.png",
    });

    expect(result.providerReference).toEqual({ wavespeedai: "https://cdn.example/upload.png" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v3/media/upload/binary",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
  });
});
