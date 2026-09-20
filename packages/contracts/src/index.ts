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

export const effectParameterTypeSchema = z.enum([
  "number",
  "boolean",
  "select",
  "color",
  "point",
  "bitmask",
]);

export const effectParameterOptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(64),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const effectParameterDefinitionSchema = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  label: z.string().min(1).max(80),
  index: z.number().int().positive(),
  type: effectParameterTypeSchema,
  defaultValue: z.union([z.number(), z.string(), z.boolean()]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  unit: z.enum(["pixels", "degrees", "percent", "frames"]).optional(),
  options: z.array(effectParameterOptionSchema).optional(),
  keyframeable: z.boolean().default(true),
  bitCountParameter: z.string().optional(),
});

export const effectDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  matchName: z.string().startsWith("com.moneymoves."),
  category: z.enum(["transition", "palette", "stylize", "advanced"]),
  status: z.enum(["available", "planned"]),
  description: z.string().min(1).max(180),
  parameters: z.array(effectParameterDefinitionSchema),
  presets: z.array(effectPresetSchema).default([]),
  schemaVersion: z.literal(SCHEMA_VERSION),
});

export const effectRegistrySchema = z.array(effectDefinitionSchema);

export type EffectParameterDefinition = z.infer<
  typeof effectParameterDefinitionSchema
>;
export type EffectDefinition = z.infer<typeof effectDefinitionSchema>;

export const brandTokens = brandTokensSchema.parse(tokens);

const EFFECT_PALETTE_OPTIONS = [
  { id: "custom", label: "Custom", value: 1 },
  { id: "moneymoves-core", label: "MoneyMoves Core", value: 2 },
  { id: "editorial-mono", label: "Editorial Mono", value: 3 },
  { id: "signal-blue", label: "Signal Blue", value: 4 },
  { id: "terminal", label: "Terminal", value: 5 },
  { id: "phosphor", label: "Phosphor", value: 6 },
  { id: "amber", label: "Amber", value: 7 },
  { id: "paper", label: "Paper", value: 8 },
] as const;

const EIGHT_BIT_COLOR_DEFAULTS = [
  "#FF2448",
  "#0B0B70",
  "#FFF6D8",
  "#39E39D",
  "#FFCC28",
  "#F229D4",
  "#080808",
  "#3D8BFF",
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
      tailLength: 5,
      tailMask: 21,
    },
  },
  {
    id: "throttle-out",
    name: "Throttle Out",
    matchName: "com.moneymoves.frame-gate",
    parameters: {
      mode: "tail",
      headLength: 5,
      headMask: 21,
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

export const EFFECT_REGISTRY: readonly EffectDefinition[] =
  effectRegistrySchema.parse([
    {
      id: "frame-gate",
      name: "Frame Gate",
      matchName: "com.moneymoves.frame-gate",
      category: "transition",
      status: "available",
      description:
        "Transparent throttle and stutter frames without touching audio.",
      parameters: [
        {
          key: "mode",
          label: "Region",
          index: 1,
          type: "select",
          defaultValue: 3,
          options: [
            { id: "head", label: "Start", value: 1 },
            { id: "tail", label: "End", value: 2 },
            { id: "both", label: "Start + End", value: 3 },
          ],
          keyframeable: false,
        },
        {
          key: "headLength",
          label: "Start frames",
          index: 2,
          type: "number",
          defaultValue: 5,
          min: 1,
          max: 12,
          step: 1,
          unit: "frames",
          keyframeable: false,
        },
        {
          key: "headMask",
          label: "Start pattern",
          index: 3,
          type: "bitmask",
          defaultValue: 21,
          min: 0,
          max: 4095,
          bitCountParameter: "headLength",
          keyframeable: false,
        },
        {
          key: "tailLength",
          label: "End frames",
          index: 4,
          type: "number",
          defaultValue: 5,
          min: 1,
          max: 12,
          step: 1,
          unit: "frames",
          keyframeable: false,
        },
        {
          key: "tailMask",
          label: "End pattern",
          index: 5,
          type: "bitmask",
          defaultValue: 21,
          min: 0,
          max: 4095,
          bitCountParameter: "tailLength",
          keyframeable: false,
        },
      ],
      presets: [...FRAME_GATE_PRESETS],
      schemaVersion: SCHEMA_VERSION,
    },
    {
      id: "rgb-shift",
      name: "RGB Shift",
      matchName: "com.moneymoves.rgb-shift",
      category: "palette",
      status: "available",
      description:
        "Deterministic per-channel displacement with preserved alpha.",
      parameters: [
        {
          key: "amount",
          label: "Amount",
          index: 1,
          type: "number",
          defaultValue: 12,
          min: 0,
          max: 200,
          step: 1,
          unit: "pixels",
          keyframeable: true,
        },
        {
          key: "direction",
          label: "Direction",
          index: 2,
          type: "number",
          defaultValue: 0,
          min: 0,
          max: 360,
          step: 1,
          unit: "degrees",
          keyframeable: true,
        },
        {
          key: "redOffset",
          label: "Red offset",
          index: 3,
          type: "number",
          defaultValue: 1,
          min: -2,
          max: 2,
          step: 0.01,
          keyframeable: true,
        },
        {
          key: "greenOffset",
          label: "Green offset",
          index: 4,
          type: "number",
          defaultValue: 0,
          min: -2,
          max: 2,
          step: 0.01,
          keyframeable: true,
        },
        {
          key: "blueOffset",
          label: "Blue offset",
          index: 5,
          type: "number",
          defaultValue: -1,
          min: -2,
          max: 2,
          step: 0.01,
          keyframeable: true,
        },
        {
          key: "mix",
          label: "Mix",
          index: 6,
          type: "number",
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          unit: "percent",
          keyframeable: true,
        },
        {
          key: "edgeBehavior",
          label: "Edges",
          index: 7,
          type: "select",
          defaultValue: 1,
          options: [
            { id: "clamp", label: "Clamp", value: 1 },
            { id: "mirror", label: "Mirror", value: 2 },
            { id: "wrap", label: "Wrap", value: 3 },
          ],
          keyframeable: false,
        },
      ],
      presets: [
        {
          id: "subtle-split",
          name: "Subtle Split",
          matchName: "com.moneymoves.rgb-shift",
          parameters: { amount: 5, direction: 0, mix: 0.7 },
        },
        {
          id: "money-split",
          name: "Money Split",
          matchName: "com.moneymoves.rgb-shift",
          parameters: {
            amount: 18,
            direction: 0,
            redOffset: 1,
            greenOffset: 0,
            blueOffset: -1,
            mix: 1,
            edgeBehavior: "mirror",
          },
        },
        {
          id: "vertical-punch",
          name: "Vertical Punch",
          matchName: "com.moneymoves.rgb-shift",
          parameters: {
            amount: 28,
            direction: 90,
            redOffset: 1,
            greenOffset: -0.35,
            blueOffset: -1,
            mix: 0.9,
            edgeBehavior: "wrap",
          },
        },
      ],
      schemaVersion: SCHEMA_VERSION,
    },
    {
      id: "halftone",
      name: "Halftone",
      matchName: "com.moneymoves.halftone",
      category: "palette",
      status: "available",
      description:
        "Print-style dots, squares, or lines with MoneyMoves palettes.",
      parameters: [
        {
          key: "cellSize",
          label: "Cell size",
          index: 1,
          type: "number",
          defaultValue: 8,
          min: 1,
          max: 256,
          step: 0.5,
          unit: "pixels",
          keyframeable: true,
        },
        {
          key: "angle",
          label: "Angle",
          index: 2,
          type: "number",
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 1,
          unit: "degrees",
          keyframeable: true,
        },
        {
          key: "dotShape",
          label: "Dot shape",
          index: 3,
          type: "select",
          defaultValue: 1,
          options: [
            { id: "circle", label: "Circle", value: 1 },
            { id: "square", label: "Square", value: 2 },
            { id: "line", label: "Line", value: 3 },
          ],
          keyframeable: false,
        },
        {
          key: "contrast",
          label: "Contrast",
          index: 4,
          type: "number",
          defaultValue: 1.25,
          min: 0,
          max: 4,
          step: 0.05,
          keyframeable: true,
        },
        {
          key: "palette",
          label: "Palette",
          index: 5,
          type: "select",
          defaultValue: 2,
          options: [
            { id: "custom", label: "Custom", value: 1 },
            {
              id: "moneymoves-core",
              label: "MoneyMoves Core",
              value: 2,
            },
            { id: "editorial-mono", label: "Editorial Mono", value: 3 },
            { id: "signal-blue", label: "Signal Blue", value: 4 },
            { id: "terminal", label: "Terminal", value: 5 },
            { id: "phosphor", label: "Phosphor", value: 6 },
            { id: "amber", label: "Amber", value: 7 },
            { id: "paper", label: "Paper", value: 8 },
          ],
          keyframeable: false,
        },
        {
          key: "foreground",
          label: "Foreground",
          index: 6,
          type: "color",
          defaultValue: "#FF2448",
          keyframeable: true,
        },
        {
          key: "background",
          label: "Background",
          index: 7,
          type: "color",
          defaultValue: "#FFF6D8",
          keyframeable: true,
        },
        {
          key: "invert",
          label: "Invert",
          index: 8,
          type: "boolean",
          defaultValue: false,
          keyframeable: true,
        },
        {
          key: "mix",
          label: "Mix",
          index: 9,
          type: "number",
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          unit: "percent",
          keyframeable: true,
        },
      ],
      presets: [
        {
          id: "money-dots",
          name: "Money Dots",
          matchName: "com.moneymoves.halftone",
          parameters: {
            cellSize: 8,
            angle: 45,
            dotShape: "circle",
            contrast: 1.25,
            palette: "moneymoves-core",
            invert: false,
            mix: 1,
          },
        },
        {
          id: "editorial-print",
          name: "Editorial Print",
          matchName: "com.moneymoves.halftone",
          parameters: {
            cellSize: 6,
            angle: 15,
            dotShape: "square",
            contrast: 1.5,
            palette: "editorial-mono",
            invert: false,
            mix: 0.9,
          },
        },
        {
          id: "terminal-lines",
          name: "Terminal Lines",
          matchName: "com.moneymoves.halftone",
          parameters: {
            cellSize: 10,
            angle: 0,
            dotShape: "line",
            contrast: 1.8,
            palette: "terminal",
            invert: false,
            mix: 1,
          },
        },
      ],
      schemaVersion: SCHEMA_VERSION,
    },
    {
      id: "dot-matrix",
      name: "Dot Matrix",
      matchName: "com.moneymoves.dot-matrix",
      category: "palette",
      status: "available",
      description:
        "Luminance-driven LED dots with branded or custom two-color palettes.",
      parameters: [
        {
          key: "spacing",
          label: "Spacing",
          index: 1,
          type: "number",
          defaultValue: 9,
          min: 1,
          max: 256,
          step: 0.5,
          unit: "pixels",
          keyframeable: true,
        },
        {
          key: "dotSize",
          label: "Dot size",
          index: 2,
          type: "number",
          defaultValue: 7,
          min: 0,
          max: 256,
          step: 0.5,
          unit: "pixels",
          keyframeable: true,
        },
        {
          key: "softness",
          label: "Softness",
          index: 3,
          type: "number",
          defaultValue: 0.6,
          min: 0.001,
          max: 64,
          step: 0.05,
          unit: "pixels",
          keyframeable: true,
        },
        {
          key: "angle",
          label: "Angle",
          index: 4,
          type: "number",
          defaultValue: 0,
          min: 0,
          max: 360,
          step: 1,
          unit: "degrees",
          keyframeable: true,
        },
        {
          key: "palette",
          label: "Palette",
          index: 5,
          type: "select",
          defaultValue: 2,
          options: [
            { id: "custom", label: "Custom", value: 1 },
            {
              id: "moneymoves-core",
              label: "MoneyMoves Core",
              value: 2,
            },
            { id: "editorial-mono", label: "Editorial Mono", value: 3 },
            { id: "signal-blue", label: "Signal Blue", value: 4 },
            { id: "terminal", label: "Terminal", value: 5 },
            { id: "phosphor", label: "Phosphor", value: 6 },
            { id: "amber", label: "Amber", value: 7 },
            { id: "paper", label: "Paper", value: 8 },
          ],
          keyframeable: false,
        },
        {
          key: "foreground",
          label: "Dot color",
          index: 6,
          type: "color",
          defaultValue: "#FF2448",
          keyframeable: true,
        },
        {
          key: "background",
          label: "Background",
          index: 7,
          type: "color",
          defaultValue: "#0B0B70",
          keyframeable: true,
        },
        {
          key: "mix",
          label: "Mix",
          index: 8,
          type: "number",
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          unit: "percent",
          keyframeable: true,
        },
      ],
      presets: [
        {
          id: "money-led",
          name: "Money LED",
          matchName: "com.moneymoves.dot-matrix",
          parameters: {
            spacing: 9,
            dotSize: 7,
            softness: 0.6,
            angle: 0,
            palette: "moneymoves-core",
            mix: 1,
          },
        },
        {
          id: "terminal-board",
          name: "Terminal Board",
          matchName: "com.moneymoves.dot-matrix",
          parameters: {
            spacing: 12,
            dotSize: 9,
            softness: 0.35,
            angle: 0,
            palette: "terminal",
            mix: 1,
          },
        },
        {
          id: "diagonal-display",
          name: "Diagonal Display",
          matchName: "com.moneymoves.dot-matrix",
          parameters: {
            spacing: 7,
            dotSize: 6,
            softness: 1.2,
            angle: 45,
            palette: "signal-blue",
            mix: 0.9,
          },
        },
      ],
      schemaVersion: SCHEMA_VERSION,
    },
    {
      id: "eight-bit",
      name: "8-bit",
      matchName: "com.moneymoves.eight-bit",
      category: "palette",
      status: "available",
      description:
        "Pixel blocks with perceptual OKLab quantization into 2–8 colors.",
      parameters: [
        {
          key: "pixelSize",
          label: "Pixel size",
          index: 1,
          type: "number",
          defaultValue: 8,
          min: 1,
          max: 256,
          step: 1,
          unit: "pixels",
          keyframeable: true,
        },
        {
          key: "colorCount",
          label: "Color count",
          index: 2,
          type: "number",
          defaultValue: 6,
          min: 2,
          max: 8,
          step: 1,
          keyframeable: true,
        },
        {
          key: "palette",
          label: "Palette",
          index: 3,
          type: "select",
          defaultValue: 2,
          options: [...EFFECT_PALETTE_OPTIONS],
          keyframeable: false,
        },
        {
          key: "quantization",
          label: "Quantization",
          index: 4,
          type: "number",
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          unit: "percent",
          keyframeable: true,
        },
        ...EIGHT_BIT_COLOR_DEFAULTS.map((defaultValue, colorIndex) => ({
          key: `color${colorIndex + 1}`,
          label: `Color ${colorIndex + 1}`,
          index: colorIndex + 5,
          type: "color" as const,
          defaultValue,
          keyframeable: true,
        })),
        {
          key: "mix",
          label: "Mix",
          index: 13,
          type: "number",
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          unit: "percent",
          keyframeable: true,
        },
      ],
      presets: [
        {
          id: "money-console",
          name: "Money Console",
          matchName: "com.moneymoves.eight-bit",
          parameters: {
            pixelSize: 8,
            colorCount: 6,
            palette: "moneymoves-core",
            quantization: 1,
            mix: 1,
          },
        },
        {
          id: "terminal-4",
          name: "Terminal 4",
          matchName: "com.moneymoves.eight-bit",
          parameters: {
            pixelSize: 10,
            colorCount: 4,
            palette: "terminal",
            quantization: 1,
            mix: 1,
          },
        },
        {
          id: "soft-pixel",
          name: "Soft Pixel",
          matchName: "com.moneymoves.eight-bit",
          parameters: {
            pixelSize: 6,
            colorCount: 8,
            palette: "signal-blue",
            quantization: 0.65,
            mix: 0.85,
          },
        },
      ],
      schemaVersion: SCHEMA_VERSION,
    },
    ...[
      ["chromatic-aberration", "Chromatic Aberration", "stylize"],
      ["dither", "Dither", "palette"],
      ["barrel-blur", "Barrel Blur", "stylize"],
      ["bloom", "Bloom", "stylize"],
      ["progressive-blur", "Progressive Blur", "stylize"],
      ["crt", "CRT", "stylize"],
      ["ascii", "ASCII", "palette"],
      ["linocut", "LinoCut", "advanced"],
      ["voxel", "Voxel", "advanced"],
      ["blob-tracking", "Blob Tracking", "advanced"],
    ].map(([id, name, category]) => ({
      id,
      name,
      matchName: `com.moneymoves.${id}`,
      category,
      status: "planned",
      description: "Scheduled for a later MoneyMoves production phase.",
      parameters: [],
      presets: [],
      schemaVersion: SCHEMA_VERSION,
    })),
  ]);

export const EFFECTS = EFFECT_REGISTRY.map(
  ({ name, matchName }) => [name, matchName] as const,
);

export function getEffectDefinition(
  matchName: string,
): EffectDefinition | undefined {
  return EFFECT_REGISTRY.find((effect) => effect.matchName === matchName);
}
