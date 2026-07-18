import { z } from "zod";

/** Shared contracts are the only payload format permitted between subsystems. */
export const SafetyCategorySchema = z.enum([
  "none",
  "soldering",
  "lipo",
  "mains_ac",
  "mechanical",
]);

export const CitationSchema = z.object({
  sourceUrl: z.string().url(),
  locator: z.string().min(1),
  title: z.string().min(1),
});

export const MatingFeatureSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["mounting_hole", "connector", "edge", "face", "axis"]),
  /** Ground-truth CAD metadata only; model output uses symbolic IDs instead. */
  positionMm: z.tuple([z.number(), z.number(), z.number()]),
  normal: z.tuple([z.number(), z.number(), z.number()]).optional(),
  diameterMm: z.number().positive().optional(),
});

export const PartRecordSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  category: z.enum(["compute", "sensor", "power", "passive", "fastener", "mechanical"]),
  electricalSpecs: z.record(z.unknown()).default({}),
  datasheetUrl: z.string().url().optional(),
  cadAssetIds: z.array(z.string().uuid()).default([]),
});

/** A persisted inventory row joined to its canonical part when available. */
export const InventoryPartSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().positive(),
  rawLabel: z.string().min(1).nullable(),
  verified: z.boolean(),
  part: PartRecordSchema.nullable(),
});

export const CadAssetRecordSchema = z.object({
  id: z.string().uuid(),
  partId: z.string().uuid(),
  filePath: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  sourceUrl: z.string().url(),
  license: z.string().min(1),
  matingFeatures: z.array(MatingFeatureSchema),
});

/** Model-facing selection is symbolic: it never contains raw transforms. */
export const MatingSelectionSchema = z.object({
  movingPartId: z.string().uuid(),
  movingFeatureId: z.string().min(1),
  targetPartId: z.string().uuid(),
  targetFeatureId: z.string().min(1),
  fastener: z.string().min(1).optional(),
});

/** Solver-owned output. Z-up and parent-relative are the project convention. */
export const AssemblyTransformSchema = z.object({
  partId: z.string().uuid(),
  stepId: z.string().uuid(),
  positionMm: z.tuple([z.number(), z.number(), z.number()]),
  quaternion: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  parentFrame: z.string().min(1),
  coordinateConvention: z.literal("z-up-parent-relative"),
});

export const TemplateParamsSchema = z.object({
  templateId: z.string().min(1),
  values: z.record(z.number()),
});

export const CheckpointSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(4).optional(),
  correctAnswer: z.string().min(1),
});

export const LessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  citations: z.array(CitationSchema).min(1),
});

export const StepPlanSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().positive(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  safetyCategory: SafetyCategorySchema,
  lesson: LessonSchema,
  checkpoint: CheckpointSchema.optional(),
  matingSelections: z.array(MatingSelectionSchema).default([]),
});

export const AgentProgressEventSchema = z.object({
  operationId: z.string().uuid(),
  stage: z.enum(["queued", "retrieving", "generating", "validating", "complete", "error"]),
  message: z.string().min(1),
  percent: z.number().min(0).max(100).optional(),
});

export const RetrievalQuerySchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid().optional(),
  inventoryPartIds: z.array(z.string().uuid()).default([]),
  limit: z.number().int().min(1).max(20).default(5),
});

export const RetrievalResultSchema = z.object({
  chunkId: z.string().uuid(),
  content: z.string().min(1),
  score: z.number().min(0).max(1),
  citations: z.array(CitationSchema).min(1),
});

export const IngestUpsertSchema = z.object({
  version: z.literal("v1"),
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  chunks: z.array(
    z.object({
      externalId: z.string().min(1),
      content: z.string().min(1),
      citation: CitationSchema,
    }),
  ).min(1),
});

export type Citation = z.infer<typeof CitationSchema>;
export type PartRecord = z.infer<typeof PartRecordSchema>;
export type InventoryPart = z.infer<typeof InventoryPartSchema>;
export type CadAssetRecord = z.infer<typeof CadAssetRecordSchema>;
export type MatingSelection = z.infer<typeof MatingSelectionSchema>;
export type AssemblyTransform = z.infer<typeof AssemblyTransformSchema>;
export type TemplateParams = z.infer<typeof TemplateParamsSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type StepPlan = z.infer<typeof StepPlanSchema>;
export type AgentProgressEvent = z.infer<typeof AgentProgressEventSchema>;
export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;
export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;
export type IngestUpsert = z.infer<typeof IngestUpsertSchema>;
