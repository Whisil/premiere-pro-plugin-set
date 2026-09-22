import { describe, expect, it } from "vitest";
import { EFFECT_REGISTRY } from "@moneymoves/contracts";
import { filterEffects, selectedVisibleEffect } from "./effect-browser.js";

const installed = EFFECT_REGISTRY.filter(
  (effect) => effect.status === "available",
);

describe("effect browser", () => {
  it("filters the visible list by name", () => {
    const visible = filterEffects(installed, "ASCII");
    expect(visible.map((effect) => effect.name)).toEqual(["ASCII"]);
  });

  it("shows the filtered result in the inspector", () => {
    const visible = filterEffects(installed, "ASCII");
    expect(
      selectedVisibleEffect(visible, "com.moneymoves.rgb-shift")?.name,
    ).toBe("ASCII");
  });

  it("does not show an unrelated inspector for no results", () => {
    expect(
      selectedVisibleEffect(
        filterEffects(installed, "not an effect"),
        "com.moneymoves.rgb-shift",
      ),
    ).toBeUndefined();
  });
});
