const SCRIPT_PATTERN = /<script src="\.\/assets\/[^\"]+\.js"><\/script>/g;

export function toUxpClassicHtml(html: string): string {
  const classicHtml = html
    .replace(/ type="module"/g, "")
    .replace(/ crossorigin/g, "");
  const scripts = classicHtml.match(SCRIPT_PATTERN) ?? [];
  if (scripts.length === 0) return classicHtml;

  // Vite hoists production scripts into <head>. Classic scripts execute
  // immediately there, before #root exists, leaving Premiere's panel empty.
  const withoutScripts = classicHtml.replace(SCRIPT_PATTERN, "");
  return withoutScripts.replace(
    "</body>",
    `    ${scripts.join("\n    ")}\n  </body>`,
  );
}
