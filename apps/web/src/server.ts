import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { Pool } from "pg";
import {
  CitationSchema,
  RetrievalQuerySchema,
  RetrievalResultSchema,
  type RetrievalQuery,
  type RetrievalResult,
} from "@educational-hardware-builder/schemas";

type Queryable = Pick<Pool, "query">;
type Fetcher = typeof fetch;

export interface ApiDependencies {
  pool: Queryable;
  fetcher: Fetcher;
  ollamaUrl: string;
  vramMb?: number;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
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

export function createApiServer(dependencies: ApiDependencies) {
  return createServer(async (request, response) => {
    try {
      if (request.method === "POST" && request.url === "/api/retrieve") {
        return respond(response, 200, await retrieve(await readJson(request), dependencies));
      }
      if (request.method === "GET" && request.url === "/api/health") {
        const report = await health(dependencies);
        return respond(response, report.status === "ok" ? 200 : 503, report);
      }
      return respond(response, 404, { error: "Not found" });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(500, "Unexpected server error.");
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
  });
  server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}
