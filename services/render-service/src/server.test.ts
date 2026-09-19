import { describe, expect, it } from "vitest";
import { escapeXml, easeInOutCubic, seededUnit } from "./svg.js";
import { mapInternals } from "./map.js";

describe("renderer primitives", () => {
  it("escapes untrusted title text", () => {
    expect(escapeXml(`<script a="b">&`)).toBe(
      "&lt;script a=&quot;b&quot;&gt;&amp;",
    );
  });

  it("keeps easing endpoints stable", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("provides deterministic pseudo-random values", () => {
    expect(seededUnit(42)).toBe(seededUnit(42));
    expect(seededUnit(42)).toBeGreaterThanOrEqual(0);
    expect(seededUnit(42)).toBeLessThan(1);
  });

  it("supports every declared map projection", () => {
    for (const projection of [
      "natural-earth",
      "mercator",
      "orthographic",
    ] as const) {
      expect(mapInternals.projectionFor({ projection } as never)).toBeDefined();
    }
  });
});
