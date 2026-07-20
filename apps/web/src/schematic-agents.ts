import { z } from "zod";

import {
  SemanticAnchorSchema,
  SchematicConstraintGraphSchema,
  type SchematicConstraintGraph,
} from "@educational-hardware-builder/schemas";

import {
  CoordinateLeakError,
  assertNoCoordinateLeak,
  callModel,
  type AgentDependencies,
  type ModelCallResult,
} from "./agents.js";

const SymbolicTextSchema = z.string().trim().min(1).max(1_000);

/**
 * Extractor output intentionally stops before catalog resolution or physical
 * research. It names parts and chronological actions, never dimensions or
 * locations.
 */
export const SchematicPartExtractionSchema = z.object({
  rawParts: z.array(SymbolicTextSchema.max(300)).min(1).max(100),
  assemblySequence: z.array(z.object({
    order: z.number().int().positive(),
    action: SymbolicTextSchema,
  }).strict()).min(1).max(200),
}).strict().superRefine((extraction, context) => {
  const orders = new Set<number>();
  extraction.assemblySequence.forEach((step, index) => {
    if (orders.has(step.order)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assemblySequence", index, "order"],
        message: "Assembly step order values must be unique.",
      });
    }
    orders.add(step.order);
  });
});

export type SchematicPartExtraction = z.infer<typeof SchematicPartExtractionSchema>;

/** Short aliases keep the extractor contract convenient for its only caller. */
export const PartExtractionSchema = SchematicPartExtractionSchema;
export type PartExtraction = SchematicPartExtraction;

const ArchitectPartReferenceSchema = z.object({
  partId: z.string().uuid(),
  name: SymbolicTextSchema.max(300),
  anchors: z.array(SemanticAnchorSchema).max(100),
}).strict();

/** The Architect may select only from server-resolved part identities and anchors. */
export const SchematicArchitectInputSchema = z.object({
  extraction: SchematicPartExtractionSchema,
  availableParts: z.array(ArchitectPartReferenceSchema).min(1).max(100),
}).strict();

export type SchematicArchitectInput = z.infer<typeof SchematicArchitectInputSchema>;

export interface SchematicAgentDependencies extends Pick<AgentDependencies, "fetcher" | "ollamaUrl" | "demoSafeMode"> {}

const extractorJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["rawParts", "assemblySequence"],
  additionalProperties: false,
  properties: {
    rawParts: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
    assemblySequence: {
      type: "array",
      minItems: 1,
      maxItems: 200,
      items: {
        type: "object",
        required: ["order", "action"],
        additionalProperties: false,
        properties: {
          order: { type: "integer", minimum: 1 },
          action: { type: "string", minLength: 1, maxLength: 1_000 },
        },
      },
    },
  },
};

const architectJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["gridUnitMm", "nodes", "connections", "assemblySequence"],
  additionalProperties: false,
  properties: {
    gridUnitMm: { const: 1 },
    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["partId", "role", "anchors"],
        additionalProperties: false,
        properties: {
          partId: { type: "string", format: "uuid" },
          role: { enum: ["container", "base", "component", "flexible"] },
          parentPartId: { type: "string", format: "uuid" },
          parentAnchor: { type: "string", minLength: 1 },
          anchors: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "face"],
              additionalProperties: false,
              properties: {
                name: { type: "string", minLength: 1 },
                face: { type: "string", minLength: 1 },
              },
            },
          },
        },
      },
    },
    connections: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "fromPartId", "fromAnchor", "toPartId", "toAnchor"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          flexiblePartId: { type: "string", format: "uuid" },
          fromPartId: { type: "string", format: "uuid" },
          fromAnchor: { type: "string", minLength: 1 },
          toPartId: { type: "string", format: "uuid" },
          toAnchor: { type: "string", minLength: 1 },
        },
      },
    },
    assemblySequence: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            required: ["id", "order", "kind", "partId"],
            additionalProperties: false,
            properties: {
              id: { type: "string", minLength: 1 },
              order: { type: "integer", minimum: 1 },
              kind: { const: "place_part" },
              partId: { type: "string", format: "uuid" },
            },
          },
          {
            type: "object",
            required: ["id", "order", "kind", "connectionId"],
            additionalProperties: false,
            properties: {
              id: { type: "string", minLength: 1 },
              order: { type: "integer", minimum: 1 },
              kind: { const: "connect_flexible" },
              connectionId: { type: "string", minLength: 1 },
            },
          },
        ],
      },
    },
  },
};

const additionalSpatialFieldPattern = /bounds|dimension|geometry|location|mesh|path|route|vector/i;

/**
 * A defense-in-depth check for symbolic agents. Zod rejects unknown keys, and
 * this guard also catches forbidden fields if a future contract grows.
 */
export function assertSymbolicSchematicOutput(value: unknown): void {
  assertNoCoordinateLeak(value);
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (additionalSpatialFieldPattern.test(key)) {
      throw new CoordinateLeakError(`Model output contains prohibited spatial field: ${key}`);
    }
    assertSymbolicSchematicOutput(nested);
  }
}

function symbolicSchema<T>(schema: z.ZodType<T>): z.ZodType<T> {
  return schema.refine((value) => {
    try {
      assertSymbolicSchematicOutput(value);
      return true;
    } catch {
      return false;
    }
  }, { message: "Model output must contain only symbolic schematic relationships." });
}

function symbolicFallback<T>(schema: z.ZodType<T>, fallback: T): T {
  const parsed = schema.parse(fallback);
  assertSymbolicSchematicOutput(parsed);
  return parsed;
}

/**
 * Extract named entities and chronological actions. A malformed or spatial
 * response receives the shared one-retry treatment before the typed fallback.
 */
export async function runSchematicExtractor(
  request: string,
  fallback: SchematicPartExtraction,
  dependencies: SchematicAgentDependencies,
): Promise<ModelCallResult<SchematicPartExtraction>> {
  const safeFallback = symbolicFallback(SchematicPartExtractionSchema, fallback);
  const result = await callModel({
    schema: symbolicSchema(SchematicPartExtractionSchema),
    jsonSchema: extractorJsonSchema,
    prompt: [
      "Extract a symbolic hardware parts list and chronological assembly sequence.",
      "Return only the supplied JSON schema.",
      "Do not infer dimensions, coordinates, positions, transforms, meshes, or geometry.",
      `Learner request: ${JSON.stringify(request.trim())}`,
    ].join("\n\n"),
    model: "llama3.2:3b",
    temperature: 0.2,
    fallback: () => safeFallback,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
  assertSymbolicSchematicOutput(result.value);
  return result;
}

/**
 * Convert resolved part identities and extracted actions into relationships.
 * The deterministic solver, never this model, owns all resulting placement.
 */
export async function runSchematicArchitect(
  input: SchematicArchitectInput,
  fallback: SchematicConstraintGraph,
  dependencies: SchematicAgentDependencies,
): Promise<ModelCallResult<SchematicConstraintGraph>> {
  const safeInput = SchematicArchitectInputSchema.parse(input);
  assertSymbolicSchematicOutput(safeInput);
  const safeFallback: SchematicConstraintGraph = SchematicConstraintGraphSchema.parse(fallback);
  assertSymbolicSchematicOutput(safeFallback);
  const result = await callModel<SchematicConstraintGraph>({
    schema: symbolicSchema(SchematicConstraintGraphSchema) as z.ZodType<SchematicConstraintGraph>,
    jsonSchema: architectJsonSchema,
    prompt: [
      "Compile a symbolic one-millimetre schematic constraint graph from the provided extraction and resolved part catalog.",
      "Use only the supplied part UUIDs and named anchors. Preserve the intended assembly sequence.",
      "Do not emit dimensions, coordinates, positions, transforms, matrices, routes, meshes, or geometry.",
      `Structured input: ${JSON.stringify(safeInput)}`,
    ].join("\n\n"),
    model: "llama3.1:8b",
    temperature: 0.2,
    fallback: () => safeFallback,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
  assertSymbolicSchematicOutput(result.value);
  return result;
}
