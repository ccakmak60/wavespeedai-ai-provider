import { describe, expect, it, vi } from "vitest";
import { createProviderRegistry } from "ai";
import { createWaveSpeedAI } from "./wavespeedai-provider";
import { WaveSpeedAIImageModel } from "./wavespeedai-image-model";
import { WaveSpeedAIVideoModel } from "./wavespeedai-video-model";

describe("createWaveSpeedAI", () => {
  it("creates registry-compatible image and video models", () => {
    const provider = createWaveSpeedAI({ apiToken: "test-token" });
    const registry = createProviderRegistry({ wavespeedai: provider });

    expect(registry.imageModel("wavespeedai:wavespeed-ai/flux-dev")).toBeInstanceOf(WaveSpeedAIImageModel);
    expect(registry.videoModel("wavespeedai:alibaba/wan-2.6/image-to-video")).toBeInstanceOf(WaveSpeedAIVideoModel);
  });

  it("exposes generic run", () => {
    const provider = createWaveSpeedAI({ apiToken: "test-token" });

    expect(provider.run).toBeTypeOf("function");
    expect(provider.submit).toBeTypeOf("function");
    expect(provider.get).toBeTypeOf("function");
    expect(provider.wait).toBeTypeOf("function");
    expect(provider.uploadFile).toBeTypeOf("function");
  });

  it("runs image generation through WaveSpeed task flow", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "pred_1" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "pred_1", status: "completed", outputs: ["https://cdn.example/image.png"] } }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    const provider = createWaveSpeedAI({ apiToken: "test-token", fetch, _internal: { sleep: async () => undefined } });
    const result = await provider.imageModel("wavespeed-ai/flux-dev").doGenerate({
      prompt: "cat",
      n: 1,
      size: "1024x1024",
      aspectRatio: undefined,
      seed: 1,
      files: undefined,
      mask: undefined,
      providerOptions: { wavespeedai: { guidance_scale: 3.5 } },
    });

    expect(result.images[0]).toEqual(new Uint8Array([1, 2, 3]));
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({
      prompt: "cat",
      size: "1024*1024",
      seed: 1,
      num_images: 1,
      guidance_scale: 3.5,
    });
  });

  it("runs video generation through WaveSpeed task flow", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "pred_2" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "pred_2", status: "completed", outputs: ["https://cdn.example/video.mp4"] } }),
          {
            status: 200,
          },
        ),
      );

    const provider = createWaveSpeedAI({ apiToken: "test-token", fetch, _internal: { sleep: async () => undefined } });
    const result = await provider.videoModel("alibaba/wan-2.6/image-to-video").doGenerate({
      prompt: "cat walks",
      n: 1,
      aspectRatio: "16:9",
      resolution: "1280x720",
      duration: 5,
      fps: undefined,
      seed: 1,
      image: { type: "url", url: "https://cdn.example/cat.png" },
      providerOptions: {},
    });

    expect(result.videos).toEqual([{ type: "url", url: "https://cdn.example/video.mp4", mediaType: "video/mp4" }]);
  });

  it("uploads binary video inputs before generation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { url: "https://cdn.example/input.png" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "pred_3" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "pred_3", status: "completed", outputs: ["https://cdn.example/video.webm"] } }),
          {
            status: 200,
          },
        ),
      );

    const provider = createWaveSpeedAI({ apiToken: "test-token", fetch, _internal: { sleep: async () => undefined } });
    const result = await provider.videoModel("alibaba/wan-2.6/image-to-video").doGenerate({
      prompt: "cat walks",
      n: 1,
      aspectRatio: undefined,
      resolution: undefined,
      duration: undefined,
      fps: undefined,
      seed: undefined,
      image: { type: "file", mediaType: "image/png", data: new Uint8Array([1, 2, 3]) },
      providerOptions: {},
    });

    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.wavespeed.ai/api/v3/media/upload/binary");
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      image: "https://cdn.example/input.png",
    });
    expect(result.videos).toEqual([{ type: "url", url: "https://cdn.example/video.webm", mediaType: "video/webm" }]);
  });

  it("uploads audio for transcription", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { url: "https://cdn.example/audio.wav" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "pred_4" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: "pred_4", status: "completed", text: "hello" } }), { status: 200 }),
      );

    const provider = createWaveSpeedAI({ apiToken: "test-token", fetch, _internal: { sleep: async () => undefined } });
    const result = await provider.transcriptionModel("wavespeed-ai/whisper-large-v3").doGenerate({
      audio: new Uint8Array([1, 2, 3]),
      mediaType: "audio/wav",
      providerOptions: {},
    });

    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.wavespeed.ai/api/v3/media/upload/binary");
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      audio: "https://cdn.example/audio.wav",
    });
    expect(result.text).toBe("hello");
  });
});
