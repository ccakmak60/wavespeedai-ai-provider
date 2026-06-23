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
});
