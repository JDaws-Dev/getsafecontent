import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const logos = [
  { name: "safetunes-text", width: 800, height: 160 },
  { name: "safetube-text", width: 800, height: 160 },
  { name: "safereads-text", width: 800, height: 160 },
  { name: "safestudy-text", width: 800, height: 160 },
  { name: "safefamily-text", width: 860, height: 160 },
];

for (const { name, width, height } of logos) {
  const svgPath = join(__dirname, `${name}.svg`);
  const pngPath = join(__dirname, `${name}.png`);

  const svgBuffer = readFileSync(svgPath);

  await sharp(svgBuffer, { density: 300 })
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(pngPath);

  console.log(`Converted ${name}.svg -> ${name}.png`);
}

console.log("\nDone! All 5 text logos converted.");
