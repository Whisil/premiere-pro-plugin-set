import type { AsciiTitleJobRequest, Palette } from "@moneymoves/contracts";
import figlet from "figlet";
import { writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { renderProRes4444 } from "./ffmpeg.js";
import { easeInOutCubic, escapeXml, seededUnit, svgToPng } from "./svg.js";

function asciiArtwork(request: AsciiTitleJobRequest): string {
  return figlet.textSync(request.text, {
    font: request.font,
    horizontalLayout: "default",
  });
}

function frameText(
  art: string,
  request: AsciiTitleJobRequest,
  frame: number,
  frameCount: number,
): string {
  const progress = frameCount <= 1 ? 1 : frame / (frameCount - 1);
  if (request.animation === "static" || request.animation === "flicker")
    return art;
  const visible = Math.floor(easeInOutCubic(progress) * art.length);
  if (request.animation === "reveal") return art.slice(0, visible);
  const chars = "@%#*+=-:. ";
  return [...art]
    .map((char, index) => {
      if (index < visible || char === "\n") return char;
      return (
        chars[Math.floor(seededUnit(frame * 4099 + index) * chars.length)] ??
        " "
      );
    })
    .join("");
}

function asciiSvg(
  text: string,
  request: AsciiTitleJobRequest,
  palette: Palette,
  frame: number,
): string {
  const lines = text.split("\n");
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const fontSize = Math.min(
    request.width / (longest * 0.62),
    request.height / Math.max(2, lines.length + 1),
  );
  const lineHeight = fontSize * 1.05;
  const totalHeight = lines.length * lineHeight;
  const flicker =
    request.animation === "flicker" ? 0.82 + seededUnit(frame + 31) * 0.18 : 1;
  const foreground = palette.colors[0] ?? "#F4FF3A";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${request.width}" height="${request.height}" viewBox="0 0 ${request.width} ${request.height}">
    <g fill="${foreground}" opacity="${flicker.toFixed(3)}" font-family="LT Superior Mono, Menlo, Monaco, monospace" font-size="${fontSize}" font-weight="700" xml:space="preserve">
      ${lines.map((line, index) => `<text x="50%" y="${(request.height - totalHeight) / 2 + (index + 1) * lineHeight}" text-anchor="middle">${escapeXml(line || " ")}</text>`).join("\n")}
    </g>
  </svg>`;
}

export async function renderAsciiTitle(
  request: AsciiTitleJobRequest,
  palette: Palette,
  outputPath: string,
  ffmpegPath: string,
  cancelled: () => boolean,
  progress: (value: number) => void,
): Promise<string> {
  const artwork = asciiArtwork(request);
  if (request.animation === "static") {
    const pngPath =
      extname(outputPath).toLowerCase() === ".png"
        ? outputPath
        : outputPath.replace(/\.[^.]+$/, ".png");
    await writeFile(
      pngPath,
      svgToPng(asciiSvg(artwork, request, palette, 0), request.width),
    );
    progress(1);
    return pngPath;
  }
  const frameCount = Math.max(
    1,
    Math.round(request.durationSeconds * request.fps),
  );
  await renderProRes4444({
    ffmpegPath,
    outputPath,
    fps: request.fps,
    frameCount,
    cancelled,
    progress,
    frame: (index) =>
      svgToPng(
        asciiSvg(
          frameText(artwork, request, index, frameCount),
          request,
          palette,
          index,
        ),
        request.width,
      ),
  });
  return outputPath;
}
