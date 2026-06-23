import { describe, expect, it } from "vitest";
import { categorizeWaveSpeedAIModel } from "./wavespeedai-types";

describe("categorizeWaveSpeedAIModel", () => {
  it.each([
    ["text-to-image", "image"],
    ["image-to-video", "video"],
    ["digital-human", "video"],
    ["text-to-audio", "speech"],
    ["speech-to-text", "transcription"],
    ["llm", "language"],
    ["image-to-3d", "generic"],
  ] as const)("maps %s to %s", (type, category) => {
    expect(categorizeWaveSpeedAIModel(type)).toBe(category);
  });
});
