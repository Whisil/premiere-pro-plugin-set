import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { brandTokens } from "../packages/contracts/dist/index.js";
import { renderAsciiTitle } from "../services/render-service/dist/ascii.js";
import { renderMap } from "../services/render-service/dist/map.js";

const outputDir = join(tmpdir(), "moneymoves-renderer-smoke");
await mkdir(outputDir, { recursive: true });
const palette = brandTokens.palettes[0];
if (!palette) throw new Error("No brand palette is available.");

const base = {
  schemaVersion: 1,
  kind: "ascii-title",
  text: "MONEY MOVES",
  font: "Standard",
  paletteId: palette.id,
  width: 640,
  height: 360,
  fps: 1,
  durationSeconds: 1,
};

const pngPath = await renderAsciiTitle(
  { ...base, animation: "static", outputName: "smoke.png" },
  palette,
  join(outputDir, "smoke.png"),
  "/opt/homebrew/bin/ffmpeg",
  () => false,
  () => undefined,
);

const videoPath = await renderAsciiTitle(
  { ...base, animation: "reveal", outputName: "smoke.mov" },
  palette,
  join(outputDir, "smoke.mov"),
  "/opt/homebrew/bin/ffmpeg",
  () => false,
  () => undefined,
);

const mapPath = await renderMap(
  {
    schemaVersion: 1,
    kind: "map",
    countries: ["USA"],
    animation: "fly-to",
    projection: "natural-earth",
    labels: true,
    transparent: true,
    paletteId: palette.id,
    outputName: "map.mov",
    width: 640,
    height: 360,
    fps: 1,
    durationSeconds: 1,
  },
  palette,
  join(outputDir, "map.mov"),
  "/opt/homebrew/bin/ffmpeg",
  () => false,
  () => undefined,
);

const png = await stat(pngPath);
const video = await stat(videoPath);
const map = await stat(mapPath);
if (png.size === 0 || video.size === 0 || map.size === 0) {
  throw new Error("Renderer produced an empty artifact.");
}

process.stdout.write(`PNG ${png.size} bytes: ${pngPath}\n`);
process.stdout.write(`MOV ${video.size} bytes: ${videoPath}\n`);
process.stdout.write(`MAP ${map.size} bytes: ${mapPath}\n`);
