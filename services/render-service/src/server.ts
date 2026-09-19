import {
  asciiTitleJobRequestSchema,
  mapJobRequestSchema,
  renderJobSchema,
} from "@moneymoves/contracts";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { config } from "./config.js";
import { JobManager } from "./jobs.js";

const jobs = new JobManager();
const MAX_BODY_BYTES = 64 * 1024;

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body exceeds 64 KiB.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function authorized(request: IncomingMessage): boolean {
  const header = request.headers.authorization;
  return header === `Bearer ${config.token}`;
}

export const server = createServer(async (request, response) => {
  try {
    if (!authorized(request))
      return json(response, 401, { error: "Unauthorized" });
    const url = new URL(
      request.url ?? "/",
      `http://${config.host}:${config.port}`,
    );

    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { status: "ok", version: "0.1.0" });
    }

    if (request.method === "POST" && url.pathname === "/v1/maps") {
      const input = mapJobRequestSchema.parse(await readJson(request));
      return json(response, 202, renderJobSchema.parse(jobs.create(input)));
    }

    if (request.method === "POST" && url.pathname === "/v1/ascii-titles") {
      const input = asciiTitleJobRequestSchema.parse(await readJson(request));
      return json(response, 202, renderJobSchema.parse(jobs.create(input)));
    }

    const match = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]+)$/i);
    if (match?.[1] && request.method === "GET") {
      const job = jobs.get(match[1]);
      return job
        ? json(response, 200, job)
        : json(response, 404, { error: "Job not found" });
    }
    if (match?.[1] && request.method === "DELETE") {
      const job = jobs.cancel(match[1]);
      return job
        ? json(response, 200, job)
        : json(response, 404, { error: "Job not found" });
    }
    return json(response, 404, { error: "Not found" });
  } catch (error) {
    return json(response, 400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, config.host, () => {
    process.stdout.write(
      `MoneyMoves renderer listening on http://${config.host}:${config.port}\n`,
    );
    process.stdout.write(`Output directory: ${config.outputDir}\n`);
  });
}
