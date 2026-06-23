import { writeFile } from "node:fs/promises";
import { categorizeWaveSpeedAIModel } from "../src/wavespeedai-types";

const apiToken = process.env.WAVESPEEDAI_API_TOKEN;

if (!apiToken) {
  throw new Error("WAVESPEEDAI_API_TOKEN is required to fetch the WaveSpeed model catalog.");
}

const response = await fetch("https://api.wavespeed.ai/api/v3/models", {
  headers: { Authorization: `Bearer ${apiToken}` },
});

if (!response.ok) {
  throw new Error(`Failed to fetch WaveSpeed models: ${response.status} ${await response.text()}`);
}

const payload = (await response.json()) as { data: Array<Record<string, unknown>> };

const models = payload.data
  .map((model) => {
    const modelId = String(model.model_id ?? model.name);
    const type = String(model.type ?? "generic");
    const apiSchemas = (model.api_schema as { api_schemas?: Array<{ request_schema?: unknown }> } | undefined)
      ?.api_schemas;

    return {
      modelId,
      name: String(model.name ?? modelId),
      type,
      category: categorizeWaveSpeedAIModel(type),
      description: typeof model.description === "string" ? model.description : undefined,
      basePrice: typeof model.base_price === "number" ? model.base_price : undefined,
      formula: typeof model.formula === "string" ? model.formula : undefined,
      requestSchema: apiSchemas?.find((schema) => schema.request_schema)?.request_schema,
    };
  })
  .sort((a, b) => a.modelId.localeCompare(b.modelId));

const modelIds = models.map((model) => model.modelId);
const modelIdsByCategory = {
  image: models.filter((model) => model.category === "image").map((model) => model.modelId),
  video: models.filter((model) => model.category === "video").map((model) => model.modelId),
  speech: models.filter((model) => model.category === "speech").map((model) => model.modelId),
  transcription: models.filter((model) => model.category === "transcription").map((model) => model.modelId),
};

const source = `import type { WaveSpeedAIModelMetadata } from "../wavespeedai-types";\n\nexport const wavespeedaiModels: readonly WaveSpeedAIModelMetadata[] = ${JSON.stringify(models, null, 2)};\n\nexport const wavespeedaiModelIds = ${JSON.stringify(modelIds, null, 2)} as const;\nexport const wavespeedaiImageModelIds = ${JSON.stringify(modelIdsByCategory.image, null, 2)} as const;\nexport const wavespeedaiVideoModelIds = ${JSON.stringify(modelIdsByCategory.video, null, 2)} as const;\nexport const wavespeedaiSpeechModelIds = ${JSON.stringify(modelIdsByCategory.speech, null, 2)} as const;\nexport const wavespeedaiTranscriptionModelIds = ${JSON.stringify(modelIdsByCategory.transcription, null, 2)} as const;\n\nexport type WaveSpeedAIModelId = (typeof wavespeedaiModelIds)[number] | (string & {});\nexport type WaveSpeedAIImageModelId = (typeof wavespeedaiImageModelIds)[number] | (string & {});\nexport type WaveSpeedAIVideoModelId = (typeof wavespeedaiVideoModelIds)[number] | (string & {});\nexport type WaveSpeedAISpeechModelId = (typeof wavespeedaiSpeechModelIds)[number] | (string & {});\nexport type WaveSpeedAITranscriptionModelId = (typeof wavespeedaiTranscriptionModelIds)[number] | (string & {});\nexport type WaveSpeedAILanguageModelId = string & {};\n`;

await writeFile("src/generated/wavespeedai-models.ts", `${source}\n`);
console.log(`Wrote ${models.length} WaveSpeed models.`);
