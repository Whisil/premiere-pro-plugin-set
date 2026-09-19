import { z } from "zod";
import tokens from "./tokens.json" with { type: "json" };

export const SCHEMA_VERSION = 1 as const;

export const paletteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(64),
  colors: z
    .array(z.string().regex(/^#[0-9A-Fa-f]{6}$/))
    .min(2)
    .max(8),
});

export const brandTokensSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().min(1).max(64),
  typography: z.object({
    display: z.string().min(1).max(128),
    editorial: z.string().min(1).max(128),
    mono: z.string().min(1).max(128),
    pixel: z.string().min(1).max(128),
  }),
  palettes: z.array(paletteSchema).min(1),
});

export const renderDimensionsSchema = z.object({
  width: z.number().int().min(320).max(7680).default(3840),
  height: z.number().int().min(180).max(4320).default(2160),
  fps: z.number().min(1).max(120).default(30),
  durationSeconds: z.number().min(0.1).max(60).default(5),
});

export const mapJobRequestSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    kind: z.literal("map"),
    countries: z.array(z.string().length(3).toUpperCase()).min(1).max(24),
    animation: z.enum([
      "fly-to",
      "pan-between",
      "border-draw",
      "fill-reveal",
      "pulse-highlight",
    ]),
    projection: z
      .enum(["natural-earth", "mercator", "orthographic"])
      .default("natural-earth"),
    labels: z.boolean().default(true),
    transparent: z.boolean().default(true),
    paletteId: z.string().default("moneymoves-core"),
    outputName: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
      .default("moneymoves-map.mov"),
  })
  .merge(renderDimensionsSchema);

export const asciiTitleJobRequestSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    kind: z.literal("ascii-title"),
    text: z.string().min(1).max(160),
    font: z
      .enum(["Standard", "Slant", "Big", "Small", "Block"])
      .default("Standard"),
    animation: z
      .enum(["static", "reveal", "flicker", "scramble"])
      .default("reveal"),
    paletteId: z.string().default("terminal"),
    outputName: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
      .default("moneymoves-ascii.mov"),
  })
  .merge(renderDimensionsSchema);

export const renderJobRequestSchema = z.discriminatedUnion("kind", [
  mapJobRequestSchema,
  asciiTitleJobRequestSchema,
]);

export const jobStateSchema = z.enum([
  "queued",
  "running",
  "complete",
  "failed",
  "cancelled",
]);

export const renderJobSchema = z.object({
  id: z.string().uuid(),
  state: jobStateSchema,
  kind: z.enum(["map", "ascii-title"]),
  progress: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  outputPath: z.string().optional(),
  error: z.string().optional(),
});

export const effectPresetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  matchName: z.string().startsWith("com.moneymoves."),
  parameters: z.record(
    z.string(),
    z.union([z.number(), z.boolean(), z.string()]),
  ),
});

export type Palette = z.infer<typeof paletteSchema>;
export type BrandTokens = z.infer<typeof brandTokensSchema>;
export type MapJobRequest = z.infer<typeof mapJobRequestSchema>;
export type AsciiTitleJobRequest = z.infer<typeof asciiTitleJobRequestSchema>;
export type RenderJobRequest = z.infer<typeof renderJobRequestSchema>;
export type RenderJob = z.infer<typeof renderJobSchema>;
export type EffectPreset = z.infer<typeof effectPresetSchema>;

export const brandTokens = brandTokensSchema.parse(tokens);

export const EFFECTS = [
  ["Frame Gate", "com.moneymoves.frame-gate"],
  ["RGB Shift", "com.moneymoves.rgb-shift"],
  ["Chromatic Aberration", "com.moneymoves.chromatic-aberration"],
  ["Halftone", "com.moneymoves.halftone"],
  ["Dot Matrix", "com.moneymoves.dot-matrix"],
  ["8-bit", "com.moneymoves.eight-bit"],
  ["Dither", "com.moneymoves.dither"],
  ["Barrel Blur", "com.moneymoves.barrel-blur"],
  ["Bloom", "com.moneymoves.bloom"],
  ["Progressive Blur", "com.moneymoves.progressive-blur"],
  ["CRT", "com.moneymoves.crt"],
  ["ASCII", "com.moneymoves.ascii"],
  ["LinoCut", "com.moneymoves.linocut"],
  ["Voxel", "com.moneymoves.voxel"],
  ["Blob Tracking", "com.moneymoves.blob-tracking"],
] as const;

export const FRAME_GATE_PRESETS: readonly EffectPreset[] = [
  {
    id: "throttle-in",
    name: "Throttle In",
    matchName: "com.moneymoves.frame-gate",
    parameters: {
      mode: "head",
      headLength: 5,
      headMask: 21,
      tailLength: 0,
      tailMask: 0,
    },
  },
  {
    id: "throttle-out",
    name: "Throttle Out",
    matchName: "com.moneymoves.frame-gate",
    parameters: {
      mode: "tail",
      headLength: 0,
      headMask: 0,
      tailLength: 5,
      tailMask: 21,
    },
  },
  {
    id: "throttle-both",
    name: "Throttle Both",
    matchName: "com.moneymoves.frame-gate",
    parameters: {
      mode: "both",
      headLength: 5,
      headMask: 21,
      tailLength: 5,
      tailMask: 21,
    },
  },
  {
    id: "hard-stutter",
    name: "Hard Stutter",
    matchName: "com.moneymoves.frame-gate",
    parameters: {
      mode: "both",
      headLength: 8,
      headMask: 85,
      tailLength: 8,
      tailMask: 85,
    },
  },
];
