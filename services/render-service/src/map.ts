import type { MapJobRequest, Palette } from "@moneymoves/contracts";
import {
  geoCentroid,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  type GeoProjection,
} from "d3-geo";
import { feature } from "topojson-client";
import worldTopology from "world-atlas/countries-110m.json" with { type: "json" };
import countries from "world-countries";
import { renderProRes4444 } from "./ffmpeg.js";
import { easeInOutCubic, escapeXml, svgToPng } from "./svg.js";

interface CountryFeature {
  type: "Feature";
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: any;
}

interface CountryFeatureCollection {
  type: "FeatureCollection";
  features: CountryFeature[];
}

const countryByNumeric = new Map(
  countries
    .filter((country) => country.ccn3)
    .map((country) => [country.ccn3!, country]),
);
const numericByAlpha3 = new Map(
  countries
    .filter((country) => country.ccn3)
    .map((country) => [country.cca3, country.ccn3!]),
);

function projectionFor(request: MapJobRequest): GeoProjection {
  if (request.projection === "mercator") return geoMercator();
  if (request.projection === "orthographic")
    return geoOrthographic().clipAngle(90);
  return geoNaturalEarth1();
}

function mapSvg(
  request: MapJobRequest,
  palette: Palette,
  frame: number,
  frameCount: number,
): string {
  const collection = feature(
    worldTopology as any,
    (worldTopology as any).objects.countries,
  ) as unknown as CountryFeatureCollection;
  const selectedIds = new Set(
    request.countries.map((code) => numericByAlpha3.get(code)).filter(Boolean),
  );
  const selected = collection.features.filter((item) =>
    selectedIds.has(String(item.id).padStart(3, "0")),
  );
  if (selected.length === 0)
    throw new Error(
      `No map geometry found for ${request.countries.join(", ")}.`,
    );

  const projection = projectionFor(request).fitExtent(
    [
      [request.width * 0.06, request.height * 0.06],
      [request.width * 0.94, request.height * 0.94],
    ],
    collection as any,
  );
  const path = geoPath(projection);
  const projectedCentroids: Array<[number, number]> = selected.map((item) => {
    const point = projection(geoCentroid(item as any));
    return point
      ? [point[0], point[1]]
      : [request.width / 2, request.height / 2];
  });
  const target = projectedCentroids.reduce(
    (sum, value) =>
      [
        sum[0] + value[0] / projectedCentroids.length,
        sum[1] + value[1] / projectedCentroids.length,
      ] as [number, number],
    [0, 0] as [number, number],
  );
  const first = projectedCentroids[0] ?? target;
  const last = projectedCentroids.at(-1) ?? target;
  const rawProgress = frameCount <= 1 ? 1 : frame / (frameCount - 1);
  const progress = easeInOutCubic(rawProgress);
  const zoom =
    request.animation === "fly-to"
      ? 1 + progress * 2.2
      : selected.length === 1
        ? 2.4
        : 1.7;
  const focus: [number, number] =
    request.animation === "pan-between"
      ? [
          first[0] + (last[0] - first[0]) * progress,
          first[1] + (last[1] - first[1]) * progress,
        ]
      : [
          request.width / 2 + (target[0] - request.width / 2) * progress,
          request.height / 2 + (target[1] - request.height / 2) * progress,
        ];
  const borderProgress = request.animation === "border-draw" ? progress : 1;
  const fillOpacity = request.animation === "fill-reveal" ? progress : 1;
  const pulse =
    request.animation === "pulse-highlight"
      ? 0.72 + Math.sin(rawProgress * Math.PI * 6) * 0.2
      : 1;
  const base = palette.colors[1] ?? "#111111";
  const accent = palette.colors[0] ?? "#F4FF3A";
  const text = palette.colors[2] ?? "#F4F2E9";

  const paths = collection.features
    .map((item) => {
      const d = path(item as any);
      if (!d) return "";
      const id = String(item.id).padStart(3, "0");
      const isSelected = selectedIds.has(id);
      const borderAnimation =
        isSelected && request.animation === "border-draw"
          ? ` pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - borderProgress).toFixed(4)}"`
          : "";
      return `<path d="${d}" fill="${isSelected ? accent : base}" fill-opacity="${isSelected ? (fillOpacity * pulse).toFixed(3) : "0.20"}" stroke="${isSelected ? accent : text}" stroke-opacity="${isSelected ? "1" : "0.28"}" stroke-width="${isSelected ? 4 : 1.5}" vector-effect="non-scaling-stroke"${borderAnimation}/>`;
    })
    .join("\n");

  const labels = request.labels
    ? selected
        .map((item, index) => {
          const point: [number, number] = projectedCentroids[index] ?? target;
          const record = countryByNumeric.get(String(item.id).padStart(3, "0"));
          const label = escapeXml(
            (
              record?.name.common ??
              request.countries[index] ??
              ""
            ).toUpperCase(),
          );
          const x = point[0];
          const inverseZoom = 1 / zoom;
          const labelSize = Math.min(
            46,
            request.width / Math.max(10, label.length * 0.72),
          );
          const y = point[1] - 24 * inverseZoom;
          return `<g font-family="Peace Sans, Arial Black, sans-serif" font-size="${labelSize * inverseZoom}" font-weight="900" letter-spacing="${inverseZoom}">
            <text x="${x + 5 * inverseZoom}" y="${y + 2 * inverseZoom}" text-anchor="middle" fill="#00E7FF" opacity="0.88">${label}</text>
            <text x="${x - 5 * inverseZoom}" y="${y - 2 * inverseZoom}" text-anchor="middle" fill="#F229D4" opacity="0.88">${label}</text>
            <text x="${x}" y="${y}" text-anchor="middle" fill="${text}" stroke="${base}" stroke-width="${7 * inverseZoom}" paint-order="stroke">${label}</text>
          </g>`;
        })
        .join("\n")
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${request.width}" height="${request.height}" viewBox="0 0 ${request.width} ${request.height}">
    ${request.transparent ? "" : `<rect width="100%" height="100%" fill="${base}"/>`}
    <g transform="translate(${request.width / 2} ${request.height / 2}) scale(${zoom.toFixed(5)}) translate(${-focus[0]} ${-focus[1]})">
      ${paths}
      ${labels}
    </g>
  </svg>`;
}

export async function renderMap(
  request: MapJobRequest,
  palette: Palette,
  outputPath: string,
  ffmpegPath: string,
  cancelled: () => boolean,
  progress: (value: number) => void,
): Promise<string> {
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
      svgToPng(mapSvg(request, palette, index, frameCount), request.width),
  });
  return outputPath;
}

export const mapInternals = { projectionFor };
