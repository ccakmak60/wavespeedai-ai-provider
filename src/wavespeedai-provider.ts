import type {
  EmbeddingModelV4,
  Experimental_VideoModelV4,
  ImageModelV4,
  LanguageModelV4,
  ProviderV4,
  RerankingModelV4,
  SpeechModelV4,
  TranscriptionModelV4,
} from "@ai-sdk/provider";
import { NoSuchModelError } from "@ai-sdk/provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { FetchFunction, loadApiKey, withUserAgentSuffix } from "@ai-sdk/provider-utils";
import type {
  WaveSpeedAIImageModelId,
  WaveSpeedAILanguageModelId,
  WaveSpeedAIModelId,
  WaveSpeedAISpeechModelId,
  WaveSpeedAITranscriptionModelId,
  WaveSpeedAIVideoModelId,
} from "./generated/wavespeedai-models";
import { VERSION } from "./version";
import { WaveSpeedAIFiles } from "./wavespeedai-files";
import { WaveSpeedAIImageModel } from "./wavespeedai-image-model";
import { WaveSpeedAISpeechModel } from "./wavespeedai-speech-model";
import {
  createWaveSpeedAITaskClient,
  type WaveSpeedAIPrediction,
  type WaveSpeedAIRunOptions,
  type WaveSpeedAIUploadOptions,
} from "./wavespeedai-task";
import { WaveSpeedAITranscriptionModel } from "./wavespeedai-transcription-model";
import { WaveSpeedAIVideoModel } from "./wavespeedai-video-model";

export interface WaveSpeedAIProviderSettings {
  /** API token sent using the `Authorization` header. Defaults to `WAVESPEEDAI_API_TOKEN`. */
  apiToken?: string;
  /** URL prefix for task API calls. Defaults to `https://api.wavespeed.ai/api/v3`. */
  baseURL?: string;
  /** URL prefix for OpenAI-compatible LLM API calls. Defaults to `https://llm.wavespeed.ai/v1`. */
  llmBaseURL?: string;
  /** Custom headers to include in requests. */
  headers?: Record<string, string>;
  /** Custom fetch implementation, useful for tests or middleware. */
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
    sleep?: (ms: number) => Promise<void>;
  };
}

export interface WaveSpeedAIProvider extends ProviderV4 {
  languageModel(modelId: WaveSpeedAILanguageModelId): LanguageModelV4;
  embeddingModel(modelId: string): EmbeddingModelV4;
  image(modelId: WaveSpeedAIImageModelId): WaveSpeedAIImageModel;
  imageModel(modelId: WaveSpeedAIImageModelId): ImageModelV4;
  videoModel(modelId: WaveSpeedAIVideoModelId): Experimental_VideoModelV4;
  speechModel(modelId: WaveSpeedAISpeechModelId): SpeechModelV4;
  transcriptionModel(modelId: WaveSpeedAITranscriptionModelId): TranscriptionModelV4;
  rerankingModel(modelId: string): RerankingModelV4;
  files(): WaveSpeedAIFiles;
  run(
    modelId: WaveSpeedAIModelId,
    input: Record<string, unknown>,
    options?: WaveSpeedAIRunOptions,
  ): Promise<WaveSpeedAIPrediction>;
  submit(
    modelId: WaveSpeedAIModelId,
    input: Record<string, unknown>,
    options?: WaveSpeedAIRunOptions,
  ): Promise<WaveSpeedAIPrediction>;
  get(taskId: string, options?: WaveSpeedAIRunOptions): Promise<WaveSpeedAIPrediction>;
  wait(taskId: string, options?: WaveSpeedAIRunOptions): Promise<WaveSpeedAIPrediction>;
  uploadFile(options: WaveSpeedAIUploadOptions): Promise<{ url: string; response: unknown }>;
}

export function createWaveSpeedAI(options: WaveSpeedAIProviderSettings = {}): WaveSpeedAIProvider {
  const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");
  const baseURL = stripTrailingSlash(options.baseURL ?? "https://api.wavespeed.ai/api/v3");
  const llmBaseURL = stripTrailingSlash(options.llmBaseURL ?? "https://llm.wavespeed.ai/v1");

  const getApiKey = () =>
    loadApiKey({
      apiKey: options.apiToken,
      environmentVariableName: "WAVESPEEDAI_API_TOKEN",
      description: "WaveSpeedAI",
    });

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${getApiKey()}`,
        ...options.headers,
      },
      `ai-sdk/wavespeedai/${VERSION}`,
    );

  const taskClient = createWaveSpeedAITaskClient({
    baseURL,
    headers: getHeaders,
    fetch: options.fetch,
    sleep: options._internal?.sleep,
  });

  const modelConfig = { provider: "wavespeedai", taskClient, currentDate: options._internal?.currentDate };
  let llmProvider: ReturnType<typeof createOpenAICompatible> | undefined;
  const getLLMProvider = () =>
    (llmProvider ??= createOpenAICompatible({
      name: "wavespeedai",
      apiKey: getApiKey(),
      baseURL: llmBaseURL,
      fetch: options.fetch,
      headers: options.headers,
    }));

  const noSuchModel = (modelId: string, modelType: ConstructorParameters<typeof NoSuchModelError>[0]["modelType"]) => {
    throw new NoSuchModelError({ modelId, modelType });
  };

  const provider = {
    specificationVersion: "v4" as const,
    languageModel(modelId: WaveSpeedAILanguageModelId) {
      return getLLMProvider().languageModel(modelId);
    },
    embeddingModel: (modelId: string) => getLLMProvider().embeddingModel(modelId),
    image: (modelId: WaveSpeedAIImageModelId) => new WaveSpeedAIImageModel(modelId, modelConfig),
    imageModel: (modelId: WaveSpeedAIImageModelId) => new WaveSpeedAIImageModel(modelId, modelConfig),
    videoModel: (modelId: WaveSpeedAIVideoModelId) => new WaveSpeedAIVideoModel(modelId, modelConfig),
    speechModel: (modelId: WaveSpeedAISpeechModelId) => new WaveSpeedAISpeechModel(modelId, modelConfig),
    transcriptionModel: (modelId: WaveSpeedAITranscriptionModelId) =>
      new WaveSpeedAITranscriptionModel(modelId, modelConfig),
    rerankingModel: (modelId: string) => noSuchModel(modelId, "rerankingModel"),
    files: () => new WaveSpeedAIFiles({ provider: "wavespeedai", taskClient }),
    run: (modelId: WaveSpeedAIModelId, input: Record<string, unknown>, runOptions?: WaveSpeedAIRunOptions) =>
      taskClient.run(modelId, input, runOptions),
    submit: (modelId: WaveSpeedAIModelId, input: Record<string, unknown>, runOptions?: WaveSpeedAIRunOptions) =>
      taskClient.submit(modelId, input, runOptions),
    get: (taskId: string, runOptions?: WaveSpeedAIRunOptions) => taskClient.get(taskId, runOptions),
    wait: (taskId: string, runOptions?: WaveSpeedAIRunOptions) => taskClient.wait(taskId, runOptions),
    uploadFile: (uploadOptions: WaveSpeedAIUploadOptions) => taskClient.uploadFile(uploadOptions),
  } satisfies WaveSpeedAIProvider;

  return provider;
}

export const wavespeedai = createWaveSpeedAI();
