import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App.js";

afterEach(() => vi.unstubAllGlobals());

describe("effect workspace", () => {
  it("renders the catalog while native discovery is pending without enabling Apply", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Checking native effects in Premiere");
    expect(markup).toContain("RGB Shift");
    expect(markup).toContain("ASCII");
    expect(markup).toContain("Checking");
    expect(markup).not.toContain("Not installed");
    expect(markup).not.toContain("Apply this effect to unlock");
    expect(markup).toMatch(
      /<button[^>]*disabled=""[^>]*>Apply to 0 clips<\/button>/,
    );
    expect(markup).toMatch(/<span class="selection-pill"/);
    expect(markup).toMatch(/<button[^>]*class="selection-refresh"/);
  });
});
