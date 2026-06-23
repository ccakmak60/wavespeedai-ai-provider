import fs from "fs";
import { createWaveSpeedAI } from "../src/index";
import { generateImage } from "ai";

const wavespeedai = createWaveSpeedAI({
  apiToken: process.env.WAVESPEEDAI_API_TOKEN,
});

const { image } = await generateImage({
  model: wavespeedai.image("google/nano-banana-pro/text-to-image"),
  prompt: "A detailed cat working as a café barista",
});

// Save the generated image
const filename = `image-${Date.now()}.png`;
fs.writeFileSync(filename, image.uint8Array);
console.log(`Image saved to ${filename}`);
