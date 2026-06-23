import type { FetchFunction } from "@ai-sdk/provider-utils";

export interface WaveSpeedAITaskClientConfig {
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  sleep?: (ms: number) => Promise<void>;
}

export interface WaveSpeedAIRunOptions {
  headers?: Record<string, string | undefined>;
  abortSignal?: AbortSignal;
  pollIntervalMs?: number;
  maxPollIntervalMs?: number;
  timeoutMs?: number;
}

export interface WaveSpeedAIUploadOptions {
  data: string | Uint8Array;
  mediaType: string;
  filename?: string;
  headers?: Record<string, string | undefined>;
  abortSignal?: AbortSignal;
}

export interface WaveSpeedAIPrediction {
  id: string;
  status: string;
  outputs: string[];
  model?: string;
  error?: string;
  raw: unknown;
}

async function defaultSleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function definedHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] != null));
}

function bytesFromData(data: string | Uint8Array) {
  if (typeof data !== "string") return data;
  return Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
}

function blobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function readUploadUrl(value: unknown) {
  const data = ((value as { data?: Record<string, unknown> }).data ?? value) as Record<string, unknown>;
  const url = [data.url, data.file_url, data.download_url, data.uri].find(
    (candidate): candidate is string => typeof candidate === "string",
  );
  if (!url) throw new Error("WaveSpeedAI file upload response did not include a URL.");
  return url;
}

export function createWaveSpeedAITaskClient(config: WaveSpeedAITaskClientConfig) {
  const fetchImplementation = config.fetch ?? fetch;
  const sleep = config.sleep ?? defaultSleep;

  async function requestJson(url: string, init: RequestInit): Promise<{ value: unknown; headers: Headers }> {
    const response = await fetchImplementation(url, init);
    const text = await response.text();
    const value = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw new Error(`WaveSpeedAI request failed: ${response.status} ${text}`);
    }

    return { value, headers: response.headers };
  }

  function readPrediction(value: unknown): WaveSpeedAIPrediction {
    const data = (value as { data?: Record<string, unknown> }).data;
    if (!data || typeof data.id !== "string") throw new Error("WaveSpeedAI response missing prediction id.");
    const outputs = data.outputs;

    return {
      id: data.id,
      status: String(data.status ?? "created"),
      outputs: Array.isArray(outputs) ? outputs.map(String) : typeof outputs === "string" ? [outputs] : [],
      model: typeof data.model === "string" ? data.model : undefined,
      error: typeof data.error === "string" ? data.error : undefined,
      raw: value,
    };
  }

  async function submit(modelId: string, input: Record<string, unknown>, options: WaveSpeedAIRunOptions = {}) {
    const submitResponse = await requestJson(`${config.baseURL}/${modelId}`, {
      method: "POST",
      headers: definedHeaders({
        "Content-Type": "application/json",
        ...config.headers(),
        ...options.headers,
      }),
      body: JSON.stringify(input),
      signal: options.abortSignal,
    });

    return readPrediction(submitResponse.value);
  }

  async function get(taskId: string, options: WaveSpeedAIRunOptions = {}) {
    const result = await requestJson(`${config.baseURL}/predictions/${taskId}`, {
      method: "GET",
      headers: definedHeaders({ ...config.headers(), ...options.headers }),
      signal: options.abortSignal,
    });

    return readPrediction(result.value);
  }

  async function wait(taskId: string, options: WaveSpeedAIRunOptions = {}) {
    const startedAt = Date.now();
    let waitMs = options.pollIntervalMs ?? 2_000;
    const maxPollIntervalMs = options.maxPollIntervalMs ?? 30_000;
    const timeoutMs = options.timeoutMs ?? 300_000;

    while (Date.now() - startedAt < timeoutMs) {
      const prediction = await get(taskId, options);
      if (prediction.status === "completed") return prediction;
      if (["failed", "error", "canceled", "cancelled"].includes(prediction.status)) {
        throw new Error(`WaveSpeedAI prediction ${taskId} failed: ${prediction.error ?? "unknown error"}`);
      }

      await sleep(waitMs);
      waitMs = Math.min(maxPollIntervalMs, Math.ceil(waitMs * 1.5));
    }

    throw new Error(`WaveSpeedAI prediction ${taskId} timed out after ${timeoutMs}ms.`);
  }

  async function run(modelId: string, input: Record<string, unknown>, options: WaveSpeedAIRunOptions = {}) {
    const submitted = await submit(modelId, input, options);
    return wait(submitted.id, options);
  }

  return {
    submit,
    get,
    wait,
    run,
    async uploadFile(options: WaveSpeedAIUploadOptions) {
      const bytes = bytesFromData(options.data);
      const formData = new FormData();
      formData.append("file", new Blob([blobPart(bytes)], { type: options.mediaType }), options.filename ?? "file");

      const response = await fetchImplementation(`${config.baseURL}/media/upload/binary`, {
        method: "POST",
        headers: definedHeaders({ ...config.headers(), ...options.headers }),
        body: formData,
        signal: options.abortSignal,
      });
      const text = await response.text();
      const value = text ? JSON.parse(text) : undefined;

      if (!response.ok) {
        throw new Error(`WaveSpeedAI file upload failed: ${response.status} ${text}`);
      }

      return { url: readUploadUrl(value), response: value };
    },

    async download(url: string, options: { abortSignal?: AbortSignal } = {}) {
      const response = await fetchImplementation(url, { signal: options.abortSignal });
      if (!response.ok) throw new Error(`WaveSpeedAI output download failed: ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

export type WaveSpeedAITaskClient = ReturnType<typeof createWaveSpeedAITaskClient>;
