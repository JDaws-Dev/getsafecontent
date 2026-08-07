import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const logos = [
  "safetunes",
  "safetube",
  "safereads",
  "safestudy",
  "safefamily",
];

for (const name of logos) {
  const svgPath = join(__dirname, `${name}.svg`);
  const pngPath = join(__dirname, `${name}.png`);

  const svgBuffer = readFileSync(svgPath);

  await sharp(svgBuffer, { density: 300 })
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(pngPath);

  console.log(`Converted ${name}.svg -> ${name}.png`);
}

console.log("\nDone! All 5 logos converted.");
