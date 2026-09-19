import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { brandTokens } from "../packages/contracts/dist/index.js";
import { renderMap } from "../services/render-service/dist/map.js";

const outputPath =
  process.argv[2] ??
  join(process.cwd(), "artifacts/validation/phase-0-alpha.mov");
await mkdir(dirname(outputPath), { recursive: true });

const palette = brandTokens.palettes[0];
if (!palette) throw new Error("No brand palette is available.");

const fps = 30;
const frameCount = 10;
await renderMap(
  {
    schemaVersion: 1,
    kind: "map",
    countries: ["USA"],
    animation: "border-draw",
    projection: "natural-earth",
    labels: true,
    transparent: true,
    paletteId: palette.id,
    outputName: basename(outputPath),
    width: 1920,
    height: 1080,
    fps,
    durationSeconds: frameCount / fps,
  },
  palette,
  outputPath,
  process.env.MONEYMOVES_FFMPEG ?? "/opt/homebrew/bin/ffmpeg",
  () => false,
  () => undefined,
);

const digest = createHash("sha256")
  .update(await readFile(outputPath))
  .digest("hex");
process.stdout.write(`${outputPath}\nsha256 ${digest}\n`);
