import {
  brandTokens,
  type Palette,
  type RenderJob,
  type RenderJobRequest,
} from "@moneymoves/contracts";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { renderAsciiTitle } from "./ascii.js";
import { config } from "./config.js";
import { renderMap } from "./map.js";

interface InternalJob {
  public: RenderJob;
  request: RenderJobRequest;
  cancelled: boolean;
}

function now(): string {
  return new Date().toISOString();
}

export class JobManager {
  readonly #jobs = new Map<string, InternalJob>();
  readonly #pending: InternalJob[] = [];
  #draining = false;

  create(request: RenderJobRequest): RenderJob {
    const timestamp = now();
    const job: InternalJob = {
      request,
      cancelled: false,
      public: {
        id: randomUUID(),
        kind: request.kind,
        state: "queued",
        progress: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };
    this.#jobs.set(job.public.id, job);
    this.#pending.push(job);
    queueMicrotask(() => void this.#drain());
    return { ...job.public };
  }

  get(id: string): RenderJob | undefined {
    const job = this.#jobs.get(id);
    return job ? { ...job.public } : undefined;
  }

  cancel(id: string): RenderJob | undefined {
    const job = this.#jobs.get(id);
    if (!job) return undefined;
    job.cancelled = true;
    if (job.public.state === "queued")
      this.#update(job, { state: "cancelled" });
    return { ...job.public };
  }

  #update(job: InternalJob, values: Partial<RenderJob>): void {
    job.public = { ...job.public, ...values, updatedAt: now() };
  }

  #palette(id: string): Palette {
    const palette = brandTokens.palettes.find(
      (candidate) => candidate.id === id,
    );
    if (!palette) throw new Error(`Unknown palette: ${id}`);
    return palette;
  }

  async #drain(): Promise<void> {
    if (this.#draining) return;
    this.#draining = true;
    try {
      let job = this.#pending.shift();
      while (job) {
        await this.#run(job);
        job = this.#pending.shift();
      }
    } finally {
      this.#draining = false;
      // A job can be queued between the final shift and clearing the lock.
      if (this.#pending.length > 0) queueMicrotask(() => void this.#drain());
    }
  }

  async #run(job: InternalJob): Promise<void> {
    if (job.cancelled) return;
    this.#update(job, { state: "running", progress: 0 });
    try {
      await mkdir(config.outputDir, { recursive: true });
      const uniqueName = `${job.public.id.slice(0, 8)}-${job.request.outputName}`;
      const outputPath = join(config.outputDir, uniqueName);
      const updateProgress = (progress: number) =>
        this.#update(job, { progress: Math.max(0, Math.min(1, progress)) });
      const result =
        job.request.kind === "map"
          ? await renderMap(
              job.request,
              this.#palette(job.request.paletteId),
              outputPath,
              config.ffmpegPath,
              () => job.cancelled,
              updateProgress,
            )
          : await renderAsciiTitle(
              job.request,
              this.#palette(job.request.paletteId),
              outputPath,
              config.ffmpegPath,
              () => job.cancelled,
              updateProgress,
            );
      if (job.cancelled) this.#update(job, { state: "cancelled" });
      else
        this.#update(job, {
          state: "complete",
          progress: 1,
          outputPath: result,
        });
    } catch (error) {
      this.#update(job, {
        state: job.cancelled ? "cancelled" : "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
