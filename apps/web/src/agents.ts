import { z } from "zod";

import {
  AgentProgressEventSchema,
  CitationSchema,
  BuildIntentSchema,
  LessonSchema,
  MatingSelectionSchema,
  type AssemblyTransform,
  type BuildIntent,
  type AgentProgressEvent,
  type Lesson,
  type MatingSelection,
  type RetrievalResult,
  type StepPlan,
} from "@educational-hardware-builder/schemas";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";

export type ModelSource = "live" | "fallback";

export interface ModelCallResult<T> {
  value: T;
  source: ModelSource;
  attempts: 0 | 1 | 2;
}

export interface CallModelOptions<T> {
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  prompt: string;
  model: string;
  temperature: number;
  fallback: () => T;
  fetcher: typeof fetch;
  ollamaUrl: string;
  demoSafeMode?: boolean;
}

function modelError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function requestModel<T>(options: CallModelOptions<T>, prompt: string): Promise<T> {
  const response = await options.fetcher(`${options.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      prompt,
      format: options.jsonSchema,
      stream: false,
      options: { temperature: options.temperature },
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);

  const payload = await response.json() as { response?: unknown };
  if (typeof payload.response !== "string") throw new Error("Ollama response did not contain JSON text.");
  let output: unknown;
  try {
    output = JSON.parse(payload.response);
  } catch {
    throw new Error("Ollama response was not valid JSON.");
  }
  return options.schema.parse(output);
}

/**
 * The sole local-model boundary: structured JSON, one validation-aware retry,
 * then a deterministic fixture. Safe mode deliberately skips the live model.
 */
export async function callModel<T>(options: CallModelOptions<T>): Promise<ModelCallResult<T>> {
  if (options.demoSafeMode) return { value: options.fallback(), source: "fallback", attempts: 0 };

  try {
    return { value: await requestModel(options, options.prompt), source: "live", attempts: 1 };
  } catch (firstError) {
    const retryPrompt = `${options.prompt}\n\nThe previous response failed validation: ${modelError(firstError)}\nReturn only a corrected JSON value that satisfies the supplied schema.`;
    try {
      return { value: await requestModel(options, retryPrompt), source: "live", attempts: 2 };
    } catch {
      return { value: options.fallback(), source: "fallback", attempts: 2 };
    }
  }
}

export const RouterResultSchema = z.object({
  projectType: z.literal("weather-station"),
  summary: z.string().min(1),
  safetyCategory: z.enum(["none", "soldering", "lipo", "mains_ac", "mechanical"]),
});
export type RouterResult = z.infer<typeof RouterResultSchema>;

export const ResearchResultSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(z.object({ claim: z.string().min(1), citation: CitationSchema })).min(1),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

const routerJsonSchema = {
  type: "object",
  required: ["projectType", "summary", "safetyCategory"],
  properties: {
    projectType: { const: "weather-station" },
    summary: { type: "string", minLength: 1 },
    safetyCategory: { enum: ["none", "soldering", "lipo", "mains_ac", "mechanical"] },
  },
  additionalProperties: false,
} as const;

const researchJsonSchema = {
  type: "object",
  required: ["summary", "findings"],
  properties: {
    summary: { type: "string", minLength: 1 },
    findings: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["claim", "citation"],
        properties: {
          claim: { type: "string", minLength: 1 },
          citation: {
            type: "object",
            required: ["sourceUrl", "locator", "title"],
            properties: {
              sourceUrl: { type: "string", format: "uri" },
              locator: { type: "string", minLength: 1 },
              title: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
} as const;

const lessonJsonSchema = {
  type: "object",
  required: ["title", "content", "citations"],
  properties: {
    title: { type: "string", minLength: 1 },
    content: { type: "string", minLength: 1 },
    citations: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["sourceUrl", "locator", "title"],
        properties: {
          sourceUrl: { type: "string", format: "uri" },
          locator: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;

const intentJsonSchema = {
  type: "object",
  required: ["normalizedGoal", "capabilities", "exclusions", "constraints", "retrievalTerms", "safety"],
  additionalProperties: false,
} as const;

export interface AgentDependencies {
  fetcher: typeof fetch;
  ollamaUrl: string;
  demoSafeMode?: boolean;
  retrieve: (query: string) => Promise<RetrievalResult[]>;
}

export class CoordinateLeakError extends Error {}

/** Reject model-shaped geometry before it can ever reach the solver boundary. */
export function assertNoCoordinateLeak(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/position|coordinate|quaternion|transform|matrix/i.test(key)) {
      throw new CoordinateLeakError(`Model output contains prohibited geometry field: ${key}`);
    }
    assertNoCoordinateLeak(nested);
  }
}

export interface AssemblyDependencies extends AgentDependencies {
  solve: (selection: MatingSelection) => { ok: true; transform: AssemblyTransform } | { ok: false; error: { message: string; code?: string } };
}

export async function runAssembly(prompt: string, fallback: MatingSelection, dependencies: AssemblyDependencies): Promise<{ selection: MatingSelection; transform: AssemblyTransform; attempts: 1 | 2 }> {
  const model = "llama3.1:8b";
  const generate = (instruction: string) => callModel({
    schema: MatingSelectionSchema.strict(),
    jsonSchema: { type: "object", required: ["movingPartId", "movingFeatureId", "targetPartId", "targetFeatureId"], additionalProperties: false },
    prompt: instruction,
    model,
    temperature: 0.2,
    fallback: () => fallback,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
  const first = await generate(prompt);
  assertNoCoordinateLeak(first.value);
  const firstSolve = dependencies.solve(first.value);
  if (firstSolve.ok) return { selection: first.value, transform: firstSolve.transform, attempts: 1 };

  const reason = firstSolve.error.code ? `[${firstSolve.error.code}] ${firstSolve.error.message}` : firstSolve.error.message;
  const second = await generate(`${prompt}\n\nThe solver rejected the symbolic mating selection: ${reason}\nChoose a corrected symbolic selection; never emit coordinates.`);
  assertNoCoordinateLeak(second.value);
  const secondSolve = dependencies.solve(second.value);
  if (!secondSolve.ok) throw new Error(`Solver rejected the retry: ${secondSolve.error.message}`);
  return { selection: second.value, transform: secondSolve.transform, attempts: 2 };
}

export async function runRouter(request: string, dependencies: AgentDependencies): Promise<ModelCallResult<RouterResult>> {
  return callModel({
    schema: RouterResultSchema,
    jsonSchema: routerJsonSchema,
    prompt: `Classify this beginner hardware project request: ${request}`,
    model: "llama3.2:3b",
    temperature: 0.2,
    fallback: () => ({ projectType: "weather-station", summary: "Build the authored ESP32 weather station.", safetyCategory: "none" }),
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
}

/** Extracts only a typed intent; server-side policy owns the final safety decision. */
export async function runDiscoveryIntent(request: string, dependencies: AgentDependencies): Promise<ModelCallResult<BuildIntent>> {
  return callModel({
    schema: BuildIntentSchema as z.ZodType<BuildIntent>,
    jsonSchema: intentJsonSchema,
    prompt: `Interpret this learner hardware request as a structured intent: ${request}`,
    model: "llama3.2:3b",
    temperature: 0.2,
    fallback: () => ({
      normalizedGoal: request.trim() || "Build a beginner low-voltage project.",
      capabilities: ["low-voltage assembly"],
      exclusions: ["mains power", "LiPo charging"],
      constraints: ["local catalog only"],
      retrievalTerms: ["beginner low-voltage hardware project"],
      safety: { outcome: "approved", categories: ["none"], blockReasons: [], callout: "Use only verified low-voltage parts." },
    }),
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
}

export async function runResearch(query: string, dependencies: AgentDependencies): Promise<ModelCallResult<ResearchResult>> {
  if (dependencies.demoSafeMode) {
    const step = goldenLessonStep();
    return {
      value: {
        summary: "Use the authored weather-station guidance while local models are unavailable.",
        findings: step.lesson.citations.map((citation) => ({ claim: step.lesson.content, citation })),
      },
      source: "fallback",
      attempts: 0,
    };
  }
  const chunks = await dependencies.retrieve(query);
  const fallback = (): ResearchResult => ({
    summary: "Use the recorded BME280 wiring guidance.",
    findings: chunks.flatMap((chunk) => chunk.citations.map((citation) => ({ claim: chunk.content, citation }))),
  });
  return callModel({
    schema: ResearchResultSchema,
    jsonSchema: researchJsonSchema,
    prompt: `Summarize only these grounded retrieval chunks, retaining citations: ${JSON.stringify(chunks)}`,
    model: "llama3.1:8b",
    temperature: 0.2,
    fallback,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
}

export async function runLesson(step: StepPlan, dependencies: AgentDependencies): Promise<ModelCallResult<Lesson>> {
  return callModel({
    schema: LessonSchema,
    jsonSchema: lessonJsonSchema,
    prompt: `Write a concise beginner lesson for this cited reference step: ${JSON.stringify(step)}`,
    model: "llama3.1:8b",
    temperature: 0.7,
    fallback: () => step.lesson,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
}

export function goldenLessonStep(): StepPlan {
  const step = weatherStationGoldenSteps[0];
  if (!step) throw new Error("The weather-station fixture has no steps.");
  return step;
}

export function progressSse(events: readonly AgentProgressEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(AgentProgressEventSchema.parse(event))}\n\n`));
      }
      controller.close();
    },
  });
}
