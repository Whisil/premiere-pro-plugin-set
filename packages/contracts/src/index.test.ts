import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FRAME_GATE_PRESETS,
  asciiTitleJobRequestSchema,
  brandTokens,
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
});
