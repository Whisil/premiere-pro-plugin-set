import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FRAME_GATE_PRESETS,
  EFFECT_REGISTRY,
  asciiTitleJobRequestSchema,
  brandTokens,
  getEffectDefinition,
  mapJobRequestSchema,
} from "./index.js";

describe("shared contracts", () => {
  it("keeps bundled tokens identical to the brand source of truth", () => {
    const source = JSON.parse(
      readFileSync(
        new URL("../../../assets/brand/tokens.json", import.meta.url),
        "utf8",
      ),
    );
    expect(brandTokens).toEqual(source);
  });

  it("loads valid brand palettes", () => {
    expect(brandTokens.palettes.length).toBeGreaterThan(1);
    expect(brandTokens.palettes[0]?.colors.length).toBeGreaterThanOrEqual(2);
  });

  it("normalizes country codes", () => {
    const parsed = mapJobRequestSchema.parse({
      schemaVersion: 1,
      kind: "map",
      countries: ["usa"],
      animation: "fly-to",
    });
    expect(parsed.countries).toEqual(["USA"]);
    expect(parsed.width).toBe(3840);
  });

  it("rejects unsafe output names", () => {
    expect(() =>
      asciiTitleJobRequestSchema.parse({
        schemaVersion: 1,
        kind: "ascii-title",
        text: "MONEY",
        outputName: "../escape.mov",
      }),
    ).toThrow();
  });

  it("encodes the five-frame odd mask as 21", () => {
    expect(
      FRAME_GATE_PRESETS.find((preset) => preset.id === "throttle-both")
        ?.parameters.headMask,
    ).toBe(21);
  });

  it("keeps panel metadata aligned with the first native effect", () => {
    const rgbShift = getEffectDefinition("com.moneymoves.rgb-shift");
    expect(rgbShift?.status).toBe("available");
    expect(rgbShift?.parameters.map((parameter) => parameter.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(rgbShift?.presets).toHaveLength(3);
    expect(EFFECT_REGISTRY).toHaveLength(15);
  });

  it("exposes Frame Gate after its native bundle is implemented", () => {
    const frameGate = getEffectDefinition("com.moneymoves.frame-gate");
    expect(frameGate?.status).toBe("available");
    expect(frameGate?.presets).toEqual(FRAME_GATE_PRESETS);
  });

  it("defines the panel contract for Halftone", () => {
    const halftone = getEffectDefinition("com.moneymoves.halftone");
    expect(halftone?.status).toBe("available");
    expect(halftone?.parameters.map((parameter) => parameter.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(halftone?.presets).toHaveLength(3);
  });

  it("defines the panel contract for Dot Matrix", () => {
    const dotMatrix = getEffectDefinition("com.moneymoves.dot-matrix");
    expect(dotMatrix?.status).toBe("available");
    expect(dotMatrix?.parameters.map((parameter) => parameter.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(dotMatrix?.presets).toHaveLength(3);
  });

  it("defines the 2–8 color panel contract for 8-bit", () => {
    const eightBit = getEffectDefinition("com.moneymoves.eight-bit");
    expect(eightBit?.status).toBe("available");
    expect(eightBit?.parameters.map((parameter) => parameter.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(eightBit?.presets).toHaveLength(3);
  });
});
