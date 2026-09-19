import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const supportDir = join(
  homedir(),
  "Library",
  "Application Support",
  "MoneyMoves",
);
const tokenPath = join(supportDir, "renderer-token");

function rendererToken(): string {
  if (process.env.NODE_ENV === "test") return "test-token";
  const fromEnvironment = process.env.MONEYMOVES_RENDER_TOKEN?.trim();
  if (fromEnvironment) return fromEnvironment;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, "utf8").trim();
  const generated = randomBytes(32).toString("hex");
  mkdirSync(dirname(tokenPath), { recursive: true, mode: 0o700 });
  writeFileSync(tokenPath, `${generated}\n`, { mode: 0o600 });
  return generated;
}

export const config = {
  host: "127.0.0.1",
  port: Number(process.env.MONEYMOVES_RENDER_PORT ?? 43127),
  token: rendererToken(),
  outputDir: resolve(
    process.env.MONEYMOVES_OUTPUT_DIR ??
      (process.env.NODE_ENV === "test"
        ? join(tmpdir(), "moneymoves-renderer-tests")
        : join(homedir(), "Movies", "MoneyMoves Generated")),
  ),
  ffmpegPath: process.env.MONEYMOVES_FFMPEG ?? "/opt/homebrew/bin/ffmpeg",
} as const;
