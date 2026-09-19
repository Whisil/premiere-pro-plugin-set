import { Resvg } from "@resvg/resvg-js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BRAND_FONT_URLS = [
  "../../../docs/fonts/peace_sans/Peace Sans.otf",
  "../../../docs/fonts/LTSuperiorMono/LTSuperiorMono-Regular.otf",
  "../../../docs/fonts/LTSuperiorMono/LTSuperiorMono-Bold.otf",
  "../../../docs/fonts/BBH_Bartle/BBHBartle-Regular.ttf",
  "../../../docs/fonts/Press_Start_2P/PressStart2P-Regular.ttf",
] as const;

export const brandFontFiles = BRAND_FONT_URLS.map((path) =>
  fileURLToPath(new URL(path, import.meta.url)),
).filter(existsSync);

export function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function svgToPng(svg: string, width: number): Buffer {
  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: brandFontFiles,
      loadSystemFonts: true,
      defaultFontFamily: "LT Superior Mono",
    },
  });
  return renderer.render().asPng();
}

export function easeInOutCubic(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
