import { describe, expect, it } from "vitest";
import { toUxpClassicHtml } from "./uxp-html.js";

describe("toUxpClassicHtml", () => {
  it("moves a head script after #root so UXP can mount React", () => {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <title>MoneyMoves Toolkit</title>
    <script type="module" crossorigin src="./assets/index.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

    const rewritten = toUxpClassicHtml(html);

    expect(rewritten).not.toContain('type="module"');
    expect(rewritten).not.toContain("crossorigin");
    expect(rewritten.indexOf('<div id="root"></div>')).toBeLessThan(
      rewritten.indexOf('<script src="./assets/index.js"></script>'),
    );
  });

  it("keeps an already-correct body script after #root", () => {
    const html = `<body>
    <div id="root"></div>
    <script src="./assets/index.js"></script>
  </body>`;
    const rewritten = toUxpClassicHtml(html);

    expect(rewritten.indexOf('<div id="root"></div>')).toBeLessThan(
      rewritten.indexOf('<script src="./assets/index.js"></script>'),
    );
  });
});
