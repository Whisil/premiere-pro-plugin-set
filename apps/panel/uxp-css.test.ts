import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("./src/styles.css", import.meta.url),
  "utf8",
);
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./src/App.tsx", import.meta.url), "utf8");

describe("Premiere UXP layout compatibility", () => {
  it("uses Flexbox instead of unsupported CSS Grid", () => {
    expect(styles).not.toMatch(/display:\s*grid\b|grid-template-/);
    expect(styles).toMatch(/\.workspace-nav\s*\{[^}]*display:\s*flex/s);
    expect(styles).toMatch(/\.effect-picker\s*\{[^}]*display:\s*flex/s);
    expect(styles).toMatch(/\.field-grid\s*\{[^}]*display:\s*flex/s);
  });

  it("avoids the unsupported font shorthand", () => {
    expect(styles).not.toMatch(/\bfont\s*:/);
    expect(html).not.toMatch(/\bfont\s*:/);
  });

  it("does not use UXP's unsupported native color input", () => {
    expect(app).not.toMatch(/type=["']color["']/);
    expect(app).toContain('className="color-swatches"');
  });
});
