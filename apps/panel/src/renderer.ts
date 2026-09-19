import type {
  AsciiTitleJobRequest,
  MapJobRequest,
  RenderJob,
  RenderJobRequest,
} from "@moneymoves/contracts";
import { renderJobSchema } from "@moneymoves/contracts";

const BASE_URL = "http://127.0.0.1:43127";
const TOKEN_KEY = "moneymoves.renderer.token";

export function getRendererToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "development-token";
}

export function setRendererToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getRendererToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Renderer returned HTTP ${response.status}.`);
  }
  return response;
}

export async function rendererHealth(): Promise<boolean> {
  try {
    await request("/health");
    return true;
  } catch {
    return false;
  }
}

export async function submitRenderJob(
  input: MapJobRequest | AsciiTitleJobRequest,
): Promise<RenderJob> {
  const endpoint = input.kind === "map" ? "/v1/maps" : "/v1/ascii-titles";
  const response = await request(endpoint, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return renderJobSchema.parse(await response.json());
}

export async function getRenderJob(id: string): Promise<RenderJob> {
  const response = await request(`/v1/jobs/${encodeURIComponent(id)}`);
  return renderJobSchema.parse(await response.json());
}

export async function cancelRenderJob(id: string): Promise<void> {
  await request(`/v1/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function waitForRenderJob(
  job: RenderJob,
  onProgress: (job: RenderJob) => void,
): Promise<RenderJob> {
  let current = job;
  while (current.state === "queued" || current.state === "running") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    current = await getRenderJob(current.id);
    onProgress(current);
  }
  if (current.state !== "complete")
    throw new Error(current.error ?? `Render ${current.state}.`);
  return current;
}

export type { RenderJobRequest };
