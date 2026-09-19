import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname } from "node:path";

export interface VideoRenderOptions {
  ffmpegPath: string;
  outputPath: string;
  fps: number;
  frameCount: number;
  frame: (index: number) => Promise<Buffer> | Buffer;
  cancelled: () => boolean;
  progress: (value: number) => void;
}

async function writeFrame(
  process: { stdin: NodeJS.WritableStream },
  frame: Buffer,
): Promise<void> {
  if (!process.stdin.write(frame)) await once(process.stdin, "drain");
}

export async function renderProRes4444(
  options: VideoRenderOptions,
): Promise<void> {
  await mkdir(dirname(options.outputPath), { recursive: true });
  const process = spawn(
    options.ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-framerate",
      String(options.fps),
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "prores_ks",
      "-profile:v",
      "4444",
      "-pix_fmt",
      "yuva444p10le",
      "-alpha_bits",
      "16",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-colorspace",
      "bt709",
      "-movflags",
      "+write_colr",
      options.outputPath,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );

  let stderr = "";
  process.stderr.setEncoding("utf8");
  process.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  for (let index = 0; index < options.frameCount; index += 1) {
    if (options.cancelled()) {
      process.kill("SIGTERM");
      throw new Error("Render cancelled.");
    }
    await writeFrame(process, await options.frame(index));
    options.progress((index + 1) / options.frameCount);
  }
  process.stdin.end();
  const [code] = (await once(process, "close")) as [number | null];
  if (code !== 0)
    throw new Error(
      `FFmpeg exited with code ${code ?? "unknown"}: ${stderr.trim()}`,
    );
}
