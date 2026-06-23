import { describe, expect, it, vi } from "vitest";
import { createWaveSpeedAITaskClient } from "./wavespeedai-task";

describe("WaveSpeed task client", () => {
  it("submits and polls a completed task", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "pred_1" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: "pred_1", status: "completed", outputs: ["https://cdn.example/out.png"] },
          }),
          { status: 200 },
        ),
      );

    const client = createWaveSpeedAITaskClient({
      baseURL: "https://api.example.com/api/v3",
      headers: () => ({ Authorization: "Bearer test" }),
      fetch,
      sleep: async () => undefined,
    });

    const result = await client.run("wavespeed-ai/flux-dev", { prompt: "cat" }, { pollIntervalMs: 1 });

    expect(result.id).toBe("pred_1");
    expect(result.outputs).toEqual(["https://cdn.example/out.png"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uploads files through the media endpoint", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { url: "https://cdn.example/input.png" } }), { status: 200 }),
      );
    const client = createWaveSpeedAITaskClient({
      baseURL: "https://api.example.com/api/v3",
      headers: () => ({ Authorization: "Bearer test" }),
      fetch,
    });

    const result = await client.uploadFile({
      data: new Uint8Array([1, 2, 3]),
      mediaType: "image/png",
      filename: "input.png",
    });

    expect(result.url).toBe("https://cdn.example/input.png");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v3/media/upload/binary",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
  });
});
