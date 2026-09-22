import { describe, expect, it } from "vitest";
import { getRuntimeInfo } from "./runtime-info.js";

describe("UXP runtime diagnostics", () => {
  it("reads host and plugin versions from UXP", () => {
    expect(
      getRuntimeInfo(() => ({
        host: { name: "Premiere Pro", version: "25.6.4" },
        versions: { plugin: "0.15.0", uxp: "uxp-8.1.0" },
        os: { platform: () => "darwin" },
      })),
    ).toEqual({
      host: "Premiere Pro 25.6.4",
      panelVersion: "0.15.0",
      uxpVersion: "uxp-8.1.0",
      platform: "darwin",
    });
  });

  it("keeps diagnostics renderable when UXP is absent", () => {
    expect(
      getRuntimeInfo(() => {
        throw new Error("No host");
      }).panelVersion,
    ).toBe("Unavailable");
  });
});
