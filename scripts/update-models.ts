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

const source = `import type { WaveSpeedAIModelMetadata } from "../wavespeedai-types";\n\nexport const wavespeedaiModels = ${JSON.stringify(models, null, 2)} as const satisfies readonly WaveSpeedAIModelMetadata[];\n\ntype ModelIdByCategory<Category extends WaveSpeedAIModelMetadata["category"]> =\n  (typeof wavespeedaiModels)[number] extends infer Model\n    ? Model extends { category: Category; modelId: infer ModelId }\n      ? ModelId\n      : never\n    : never;\n\nexport type WaveSpeedAIModelId = (typeof wavespeedaiModels)[number]["modelId"] | (string & {});\nexport type WaveSpeedAIImageModelId = ModelIdByCategory<"image"> | (string & {});\nexport type WaveSpeedAIVideoModelId = ModelIdByCategory<"video"> | (string & {});\nexport type WaveSpeedAISpeechModelId = ModelIdByCategory<"speech"> | (string & {});\nexport type WaveSpeedAITranscriptionModelId = ModelIdByCategory<"transcription"> | (string & {});\nexport type WaveSpeedAILanguageModelId = string & {};\n`;

await writeFile("src/generated/wavespeedai-models.ts", `${source}\n`);
console.log(`Wrote ${models.length} WaveSpeed models.`);
