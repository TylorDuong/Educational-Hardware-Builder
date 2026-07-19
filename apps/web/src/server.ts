import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";
import {
  CitationSchema,
  InventoryPartSchema,
  RetrievalQuerySchema,
  RetrievalResultSchema,
  type RetrievalQuery,
  type RetrievalResult,
} from "@educational-hardware-builder/schemas";

import { progressSse, runResearch } from "./agents.js";
import { listInventoryParts } from "./integration.js";
import { WorkshopAccessError, WorkshopSessions } from "./workshop.js";

type Queryable = Pick<Pool, "query">;
type Fetcher = typeof fetch;

export interface ApiDependencies {
  pool: Queryable;
  fetcher: Fetcher;
  ollamaUrl: string;
  vramMb?: number;
  demoSafeMode?: boolean;
  staticDir?: string;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Parse the demo operator's explicit fallback switch without treating arbitrary text as true. */
export function demoSafeModeFromEnv(value = process.env.DEMO_SAFE_MODE): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

const vectorLiteral = (values: number[]) => `[${values.join(",")}]`;

async function embedQuery(query: string, dependencies: ApiDependencies): Promise<number[]> {
  const response = await dependencies.fetcher(`${dependencies.ollamaUrl}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: query }),
  });
  if (!response.ok) throw new ApiError(503, "Local embedding model is unavailable.");
  const payload = await response.json() as { embeddings?: unknown };
  const values = Array.isArray(payload.embeddings) ? payload.embeddings[0] : undefined;
  if (!Array.isArray(values) || values.length !== 768 || values.some((value) => typeof value !== "number")) {
    throw new ApiError(503, "Local embedding model returned an invalid vector.");
  }
  return values as number[];
}

export async function retrieve(input: unknown, dependencies: ApiDependencies): Promise<RetrievalResult[]> {
  const parsed = RetrievalQuerySchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "Invalid retrieval query.");

  const vector = await embedQuery(parsed.data.query, dependencies);
  let rows: Array<{ id: string; content: string; citation: unknown; score: number | string }>;
  try {
    const result = await dependencies.pool.query(
      `SELECT e.id, e.content, e.citation, 1 - (e.embedding <=> $1::vector) AS score
       FROM embeddings e
       WHERE e.embedding IS NOT NULL
         AND ($3::uuid[] = '{}'::uuid[] OR EXISTS (
           SELECT 1 FROM parts_catalog p WHERE p.id = ANY($3::uuid[]) AND p.slug = e.source_id
         ))
       ORDER BY e.embedding <=> $1::vector
       LIMIT $2`,
      [vectorLiteral(vector), parsed.data.limit, parsed.data.inventoryPartIds],
    );
    rows = result.rows;
  } catch {
    throw new ApiError(503, "Knowledge database is unavailable.");
  }

  return rows.map((row) => RetrievalResultSchema.parse({
    chunkId: row.id,
    content: row.content,
    score: Math.max(0, Math.min(1, Number(row.score))),
    citations: [CitationSchema.parse(row.citation)],
  }));
}

export async function health(dependencies: ApiDependencies): Promise<{ status: "ok" | "degraded"; database: "ok" | "unavailable"; ollama: "ok" | "unavailable"; models: string[]; vramMb: number | null; recommendedModelTier: string }> {
  let database: "ok" | "unavailable" = "ok";
  let ollama: "ok" | "unavailable" = "ok";
  let models: string[] = [];
  try {
    await dependencies.pool.query("SELECT 1");
  } catch {
    database = "unavailable";
  }
  try {
    const response = await dependencies.fetcher(`${dependencies.ollamaUrl}/api/tags`);
    if (!response.ok) throw new Error("Ollama unavailable");
    const payload = await response.json() as { models?: Array<{ name?: string }> };
    models = (payload.models ?? []).flatMap((model) => typeof model.name === "string" ? [model.name] : []);
  } catch {
    ollama = "unavailable";
  }
  const vramMb = dependencies.vramMb ?? null;
  const recommendedModelTier = vramMb === null ? "cpu-safe" : vramMb >= 12_000 ? "reference-12gb" : "compact";
  return { status: database === "ok" && ollama === "ok" ? "ok" : "degraded", database, ollama, models, vramMb, recommendedModelTier };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const body: Buffer[] = [];
  for await (const chunk of request) body.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  try {
    return JSON.parse(Buffer.concat(body).toString("utf8"));
  } catch {
    throw new ApiError(400, "Request body must be JSON.");
  }
}

function respond(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

const staticContentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function serveStatic(pathname: string, response: ServerResponse, staticDir: string): Promise<boolean> {
  const root = resolve(staticDir);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return false;
  try {
    if (!(await stat(target)).isFile()) return false;
    response.writeHead(200, { "content-type": staticContentTypes[extname(target)] ?? "application/octet-stream" });
    response.end(await readFile(target));
    return true;
  } catch {
    return false;
  }
}

async function respondSse(response: ServerResponse): Promise<void> {
  const operationId = "fb5f4c45-fb24-4690-b785-a306e857a373";
  const stream = progressSse([
    { operationId, stage: "queued", message: "Preparing the guided build", percent: 0 },
    { operationId, stage: "retrieving", message: "Finding cited guidance", percent: 35 },
    { operationId, stage: "generating", message: "Creating the typed step plan", percent: 70 },
    { operationId, stage: "complete", message: "Guidance is ready", percent: 100 },
  ]);
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  const reader = stream.getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    response.write(chunk.value);
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
  }
  response.end();
}

export function createApiServer(dependencies: ApiDependencies) {
  const workshopSessions = new WorkshopSessions();
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "POST" && request.url === "/api/retrieve") {
        return respond(response, 200, await retrieve(await readJson(request), dependencies));
      }
      if (request.method === "POST" && request.url === "/api/integration/research") {
        const body = await readJson(request) as { query?: unknown };
        if (typeof body.query !== "string" || body.query.trim().length === 0) {
          throw new ApiError(400, "Integrated research requires a query.");
        }
        const result = await runResearch(body.query, {
          fetcher: dependencies.fetcher,
          ollamaUrl: dependencies.ollamaUrl,
          demoSafeMode: dependencies.demoSafeMode,
          retrieve: (query) => retrieve({ query }, dependencies),
        });
        return respond(response, 200, result);
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/inventory/")) {
        const userId = decodeURIComponent(url.pathname.slice("/api/inventory/".length));
        if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId)) {
          throw new ApiError(400, "Inventory requests require a user UUID.");
        }
        try {
          const inventory = await listInventoryParts(userId, { pool: dependencies.pool });
          return respond(response, 200, inventory.map((row) => InventoryPartSchema.parse(row)));
        } catch {
          throw new ApiError(503, "Inventory database is unavailable.");
        }
      }
      if (request.method === "GET" && request.url === "/api/health") {
        const report = await health(dependencies);
        return respond(response, report.status === "ok" ? 200 : 503, report);
      }
      if (request.method === "GET" && request.url === "/api/agents/progress") {
        return await respondSse(response);
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/workshop/steps/")) {
        const stepId = decodeURIComponent(url.pathname.slice("/api/workshop/steps/".length));
        const step = workshopSessions.accessStep(url.searchParams.get("sessionId") ?? "demo", stepId);
        const { checkpoint, ...withoutCheckpoint } = step;
        return respond(response, 200, {
          ...withoutCheckpoint,
          checkpoint: checkpoint ? { id: checkpoint.id, prompt: checkpoint.prompt, choices: checkpoint.choices } : undefined,
        });
      }
      if (request.method === "POST" && request.url === "/api/workshop/checkpoints") {
        const body = await readJson(request) as { sessionId?: unknown; checkpointId?: unknown; answer?: unknown };
        if (typeof body.sessionId !== "string" || typeof body.checkpointId !== "string" || typeof body.answer !== "string") {
          throw new ApiError(400, "Checkpoint responses require a session, checkpoint, and answer.");
        }
        return respond(response, 200, workshopSessions.gradeCheckpoint(body.sessionId, body.checkpointId, body.answer));
      }
      if (request.method === "GET" && await serveStatic(url.pathname, response, dependencies.staticDir ?? fileURLToPath(new URL("../dist/", import.meta.url)))) {
        return;
      }
      return respond(response, 404, { error: "Not found" });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : error instanceof WorkshopAccessError ? new ApiError(403, error.message) : new ApiError(500, "Unexpected server error.");
      return respond(response, apiError.status, { error: apiError.message });
    }
  });
}

const isMainModule = process.argv[1]?.endsWith("server.ts");
if (isMainModule) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const server = createApiServer({
    pool,
    fetcher: fetch,
    ollamaUrl: process.env.OLLAMA_URL ?? "http://ollama:11434",
    vramMb: process.env.VRAM_MB ? Number(process.env.VRAM_MB) : undefined,
    demoSafeMode: demoSafeModeFromEnv(),
  });
  server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}
