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
}).strict();

/** The layout MVP uses one voxel per millimetre, so physical proxy bounds must be whole cells. */
export const IntegerGridDimensionsSchema = z.tuple([
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().positive(),
]);

/** Grid positions may be negative relative to the solver-selected origin, unlike physical bounds. */
export const SchematicGridPositionSchema = z.tuple([
  z.number().int(),
  z.number().int(),
  z.number().int(),
]);

export const DimensionConfidenceSchema = z.number().finite().min(0).max(1);
export const MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE = 0.85;
export const RequiredDimensionConfidenceSchema = DimensionConfidenceSchema.min(MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE);

/** Provenance for dimensions used by a physical schematic proxy. */
export const CitedDimensionEvidenceSchema = z.object({
  confidence: DimensionConfidenceSchema,
  citation: CitationSchema,
}).strict();

export const SkillLibraryEntrySchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  locator: z.string().min(1),
  relevance: z.string().min(1),
}).strict();

const HttpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", {
  message: "Expected an HTTPS URL",
});
const IsoTimestampSchema = z.string().datetime({ offset: true });
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const NonEmptyTextSchema = z.string().trim().min(1);
const SourceUrlPatternSchema = z.string().regex(/^https:\/\/[^\s]+$/);

/** Stable internal identity and client-safe route identifier for an authored build. */
export const BuildIdSchema = z.string().uuid();
export const BuildSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

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
  /**
   * Integer outer proxy bounds. These remain optional on the legacy catalog record so existing
   * ingestion payloads can be reviewed; a schematic solver quarantines assets that omit them.
   */
  boundsMm: IntegerGridDimensionsSchema.optional(),
  /** Cited provenance for `boundsMm`; required before an asset can appear in a ready layout. */
  dimensionEvidence: CitedDimensionEvidenceSchema.optional(),
  matingFeatures: z.array(MatingFeatureSchema),
});

/** Architect-controlled semantic behavior. It deliberately contains no geometric pose. */
export const SchematicRoleSchema = z.enum(["container", "base", "component", "flexible"]);

/**
 * A face is a named relationship on a proxy, not a coordinate. Interior faces make containment
 * intent explicit without exposing a container's local coordinate system to an agent.
 */
export const SemanticAnchorFaceSchema = z.enum([
  "top",
  "bottom",
  "front",
  "back",
  "left",
  "right",
  "inside_top",
  "inside_bottom",
  "inside_front",
  "inside_back",
  "inside_left",
  "inside_right",
  "center",
]);

export const SemanticAnchorSchema = z.object({
  name: NonEmptyTextSchema.max(160),
  face: SemanticAnchorFaceSchema,
}).strict();

/** A rigid or flexible part described only by symbolic containment and named anchors. */
export const SchematicConstraintNodeSchema = z.object({
  partId: z.string().uuid(),
  role: SchematicRoleSchema,
  parentPartId: z.string().uuid().optional(),
  parentAnchor: NonEmptyTextSchema.max(160).optional(),
  anchors: z.array(SemanticAnchorSchema).max(64).default([]),
}).strict();

/** A symbolic instruction that a deterministic solver will use to order placement or routing. */
export const SchematicAssemblySequenceStepSchema = z.object({
  id: NonEmptyTextSchema.max(160),
  order: z.number().int().positive(),
  kind: z.enum(["place_part", "connect_flexible"]),
  partId: z.string().uuid().optional(),
  connectionId: NonEmptyTextSchema.max(160).optional(),
}).strict().superRefine((step, context) => {
  if (step.kind === "place_part") {
    if (!step.partId || step.connectionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A place_part sequence step requires partId and cannot include connectionId",
      });
    }
    return;
  }

  if (!step.connectionId || step.partId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A connect_flexible sequence step requires connectionId and cannot include partId",
    });
  }
});

/** A flexible route requested by endpoint names; pathfinding and points remain solver-owned. */
export const FlexibleConnectionSchema = z.object({
  id: NonEmptyTextSchema.max(160),
  flexiblePartId: z.string().uuid().optional(),
  fromPartId: z.string().uuid(),
  fromAnchor: NonEmptyTextSchema.max(160),
  toPartId: z.string().uuid(),
  toAnchor: NonEmptyTextSchema.max(160),
}).strict();

/**
 * The sole agent-facing schematic relationship payload. Strict objects intentionally reject
 * position, coordinate, transform, quaternion, matrix, mesh, and arbitrary geometry fields.
 * Semantic reference resolution is deterministic solver work so it can become a typed rejection.
 */
export const SchematicConstraintGraphSchema = z.object({
  gridUnitMm: z.literal(1),
  nodes: z.array(SchematicConstraintNodeSchema).min(1).max(100),
  connections: z.array(FlexibleConnectionSchema).max(200).default([]),
  assemblySequence: z.array(SchematicAssemblySequenceStepSchema).max(300).default([]),
}).strict();

/** Input to the deterministic layout boundary. Low-confidence and missing evidence stay typed so they can be quarantined. */
export const SchematicLayoutRequestSchema = z.object({
  graph: SchematicConstraintGraphSchema,
  cadAssets: z.array(CadAssetRecordSchema).min(1).max(100),
  requiredDimensionConfidence: RequiredDimensionConfidenceSchema.default(MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE),
}).strict();

/** Solver-owned rigid placement. The graph schema above never accepts this coordinate-bearing shape. */
export const SchematicPlacementSchema = z.object({
  partId: z.string().uuid(),
  gridPosition: SchematicGridPositionSchema,
  boundsMm: IntegerGridDimensionsSchema,
}).strict();

/** Solver-owned orthogonal route, expressed as whole grid cells. */
export const SchematicRouteSchema = z.object({
  connectionId: NonEmptyTextSchema.max(160),
  points: z.array(SchematicGridPositionSchema).min(2).max(10_000),
}).strict();

export const SchematicLayoutQuarantineRecordSchema = z.object({
  partId: z.string().uuid(),
  observedConfidence: DimensionConfidenceSchema.nullable(),
  requiredConfidence: RequiredDimensionConfidenceSchema,
  reason: NonEmptyTextSchema.max(1_000),
}).strict();

export const SchematicLayoutRejectionCodeSchema = z.enum([
  "INVALID_GRAPH",
  "UNKNOWN_PART",
  "UNKNOWN_PARENT",
  "UNKNOWN_ANCHOR",
  "AMBIGUOUS_ROOT",
  "CYCLIC_PARENTAGE",
  "COLLISION",
  "OUT_OF_BOUNDS",
  "ROUTE_UNAVAILABLE",
  "INVALID_SEQUENCE",
]);

export const SchematicLayoutRejectionSchema = z.object({
  code: SchematicLayoutRejectionCodeSchema,
  message: NonEmptyTextSchema.max(1_000),
  partId: z.string().uuid().optional(),
  connectionId: NonEmptyTextSchema.max(160).optional(),
  sequenceStepId: NonEmptyTextSchema.max(160).optional(),
}).strict();

export const SchematicLayoutReadyResultSchema = z.object({
  outcome: z.literal("ready"),
  placements: z.array(SchematicPlacementSchema).min(1).max(100),
  routes: z.array(SchematicRouteSchema).max(200).default([]),
  /** Canonical, solver-validated order used to check dependencies before connections are routed. */
  assemblySequence: z.array(SchematicAssemblySequenceStepSchema).max(300).default([]),
}).strict();

export const SchematicLayoutQuarantinedResultSchema = z.object({
  outcome: z.literal("quarantined"),
  quarantinedParts: z.array(SchematicLayoutQuarantineRecordSchema).min(1).max(100),
}).strict();

export const SchematicLayoutRejectedResultSchema = z.object({
  outcome: z.literal("rejected"),
  rejection: SchematicLayoutRejectionSchema,
}).strict();

export const SchematicLayoutResultSchema = z.discriminatedUnion("outcome", [
  SchematicLayoutReadyResultSchema,
  SchematicLayoutQuarantinedResultSchema,
  SchematicLayoutRejectedResultSchema,
]);

/**
 * Electrical intent stays entirely symbolic. The deterministic wiring renderer owns every
 * symbol position and every orthogonal segment; model-facing payloads can only name pins.
 */
export const ElectricalPinTypeSchema = z.enum([
  "power_in",
  "power_out",
  "input",
  "output",
  "bidirectional",
  "passive",
]);

export const ElectricalPinSchema = z.object({
  name: NonEmptyTextSchema.max(80),
  type: ElectricalPinTypeSchema,
}).strict();

export const ElectricalComponentRoleSchema = z.enum(["input", "logic", "output", "power"]);

export const ElectricalComponentSchema = z.object({
  refdes: z.string().regex(/^[A-Z][A-Z0-9]*$/),
  role: ElectricalComponentRoleSchema,
  value: NonEmptyTextSchema.max(160),
  /** A known local symbol template; its dimensions and pin positions are renderer-owned. */
  libraryRef: NonEmptyTextSchema.max(160),
  pins: z.record(ElectricalPinSchema).refine((pins) => Object.keys(pins).length > 0, {
    message: "An electrical component must define at least one named pin",
  }),
  citation: CitationSchema,
}).strict();

export const ElectricalNetConnectionSchema = z.object({
  refdes: z.string().regex(/^[A-Z][A-Z0-9]*$/),
  pin: NonEmptyTextSchema.max(80),
}).strict();

export const ElectricalNetSchema = z.object({
  name: NonEmptyTextSchema.max(160),
  kind: z.enum(["power", "signal"]),
  connections: z.array(ElectricalNetConnectionSchema).min(2).max(100),
}).strict();

/** Strict netlist handoff used by Workshop wiring guides and future Extractor/Librarian/Architect flow. */
export const ElectricalNetlistSchema = z.object({
  projectName: NonEmptyTextSchema.max(160),
  components: z.array(ElectricalComponentSchema).min(1).max(100),
  nets: z.array(ElectricalNetSchema).min(1).max(200),
}).strict();

/** Model-facing selection is symbolic: it never contains raw transforms. */
export const MatingSelectionSchema = z.object({
  movingPartId: z.string().uuid(),
  movingFeatureId: z.string().min(1),
  targetPartId: z.string().uuid(),
  targetFeatureId: z.string().min(1),
  fastener: z.string().min(1).optional(),
}).strict();

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

export const LessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  citations: z.array(CitationSchema).min(1),
});

/** A cited idea the learner should understand while completing a Workshop step. */
export const LearningConceptSchema = z.object({
  title: NonEmptyTextSchema.max(240),
  explanation: NonEmptyTextSchema.max(1_500),
}).strict();

/** A beginner-friendly explanation generated from one of the step's cited local source excerpts. */
export const SourceDigestSchema = z.object({
  summary: NonEmptyTextSchema.max(2_000),
  citation: CitationSchema,
}).strict();

const citationIdentity = (citation: z.infer<typeof CitationSchema>): string => (
  `${citation.sourceUrl}\u0000${citation.locator}\u0000${citation.title}`
);

export const StepPlanSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().positive(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  safetyCategory: SafetyCategorySchema,
  lesson: LessonSchema,
  completionCondition: NonEmptyTextSchema.max(1_000).optional(),
  whyItMatters: NonEmptyTextSchema.max(2_000).optional(),
  concepts: z.array(LearningConceptSchema).default([]),
  sourceDigest: SourceDigestSchema,
  skills: z.array(SkillLibraryEntrySchema).default([]),
  matingSelections: z.array(MatingSelectionSchema).default([]),
}).strict().superRefine((step, context) => {
  if (!step.lesson.citations.some((citation) => citationIdentity(citation) === citationIdentity(step.sourceDigest.citation))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceDigest", "citation"],
      message: "A source digest must cite one of the step's lesson sources.",
    });
  }
});

/** A complete, fixture-backed beginner build available to the Workshop. */
export const AuthoredBuildManifestSchema = z.object({
  id: BuildIdSchema,
  slug: BuildSlugSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  steps: z.array(StepPlanSchema).min(1),
}).strict();

/** Client input chooses a build by its stable, URL-safe slug. */
export const BuildSelectionSchema = z.object({
  buildSlug: BuildSlugSchema,
}).strict();

/** Registry validation prevents ambiguous build selection before server lookup. */
export const AuthoredBuildRegistrySchema = z.array(AuthoredBuildManifestSchema).min(1).superRefine((manifests, context) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  manifests.forEach((manifest, index) => {
    if (ids.has(manifest.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate authored build id: ${manifest.id}`,
        path: [index, "id"],
      });
    }
    ids.add(manifest.id);

    if (slugs.has(manifest.slug)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate authored build slug: ${manifest.slug}`,
        path: [index, "slug"],
      });
    }
    slugs.add(manifest.slug);
  });
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

/** Learner-facing discovery requests may contain free-form input only at this boundary. */
export const LearnerModeSchema = z.enum(["beginner", "intermediate"]);
export const DiscoveryBudgetSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  maxAmount: z.number().finite().positive(),
}).strict();
export const DiscoveryRequestSchema = z.object({
  prompt: NonEmptyTextSchema.max(4_000),
  mode: LearnerModeSchema,
  userId: z.string().uuid(),
  budget: DiscoveryBudgetSchema.optional(),
  inventoryPartIds: z.array(z.string().uuid()).max(100).default([]),
  constraints: z.array(NonEmptyTextSchema.max(160)).max(50).default([]),
}).strict();

export const RequestRejectionReasonSchema = z.enum(["off_topic", "malicious"]);
export const RequestClassificationSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("approved"), reason: NonEmptyTextSchema.max(1_000) }).strict(),
  z.object({ outcome: z.literal("rejected"), reason: RequestRejectionReasonSchema, message: NonEmptyTextSchema.max(1_000) }).strict(),
]);

/** Strict structured output for intent extraction; unknown model fields are rejected. */
export const BuildIntentSchema = z.object({
  normalizedGoal: NonEmptyTextSchema.max(1_000),
  capabilities: z.array(NonEmptyTextSchema.max(160)).max(30).default([]),
  exclusions: z.array(NonEmptyTextSchema.max(160)).max(30).default([]),
  constraints: z.array(NonEmptyTextSchema.max(160)).max(50).default([]),
  retrievalTerms: z.array(NonEmptyTextSchema.max(160)).min(1).max(20),
  classification: RequestClassificationSchema,
}).strict();

export const SourceClassSchema = z.enum(["documentation", "vendor_catalog"]);
export const SourcePolicyAllowedFactSchema = z.enum([
  "citation",
  "documentation",
  "part_metadata",
  "cad_metadata",
  "catalog_offer",
  "datasheet",
]);
export const SourceTermsStatusSchema = z.enum([
  "public-documentation",
  "public-catalog",
  "redistribution-permitted",
]);
export const CadLicenseSchema = z.enum(["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"]);
export const SourcePolicyRefreshSchema = z.object({
  intervalHours: z.number().int().positive(),
  maxStalenessHours: z.number().int().positive(),
}).strict().refine((value) => value.maxStalenessHours >= value.intervalHours, {
  message: "maxStalenessHours must be at least intervalHours",
  path: ["maxStalenessHours"],
});
export const SourcePolicyTermsSchema = z.object({
  evidenceRequired: z.literal(true),
  acceptedStatuses: z.array(SourceTermsStatusSchema).min(1),
  prohibitedUses: z.array(NonEmptyTextSchema).min(1),
}).strict();
export const SourcePolicyCadAssetsSchema = z.object({
  sourceUrlRequired: z.literal(true),
  identifiableLicenseRequired: z.literal(true),
  allowedLicenses: z.array(CadLicenseSchema).min(1),
  rejectAmbiguousLicense: z.literal(true),
}).strict();
export const SourcePolicyOffersSchema = z.object({
  cachedLinksOnly: z.literal(true),
  checkoutAllowed: z.literal(false),
  requireObservedAt: z.literal(true),
  requireExpiresAt: z.literal(true),
  requireProviderSku: z.literal(true),
}).strict();
export const SourcePolicyIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const SourcePolicySchema = z.object({
  id: SourcePolicyIdSchema,
  revision: z.number().int().positive(),
  enabled: z.boolean(),
  sourceClass: SourceClassSchema,
  allowedUrlPatterns: z.array(SourceUrlPatternSchema).min(1),
  allowedFacts: z.array(SourcePolicyAllowedFactSchema).min(1),
  refresh: SourcePolicyRefreshSchema,
  terms: SourcePolicyTermsSchema,
  cadAssets: SourcePolicyCadAssetsSchema.optional(),
  offers: SourcePolicyOffersSchema.optional(),
}).strict().superRefine((policy, context) => {
  if (policy.sourceClass === "vendor_catalog" && !policy.offers) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["offers"], message: "Vendor catalog policies require offer rules" });
  }
  if (policy.sourceClass === "documentation" && policy.offers) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["offers"], message: "Documentation policies cannot define vendor offer rules" });
  }
});
export const SourcePolicyDocumentSchema = z.object({
  version: z.literal("v1"),
  defaultPolicy: z.object({
    externalAccess: z.literal("background-ingestion-only"),
    requireHttps: z.literal(true),
    rejectUnknownSources: z.literal(true),
    rejectUnlicensedCadAssets: z.literal(true),
    rejectMissingProvenance: z.literal(true),
  }).strict(),
  policies: z.array(SourcePolicySchema).min(1).superRefine((policies, context) => {
    const ids = new Set<string>();
    policies.forEach((policy, index) => {
      if (ids.has(policy.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "id"], message: `Duplicate source policy id: ${policy.id}` });
      }
      ids.add(policy.id);
    });
  }),
}).strict();

export const SourceDocumentSchema = z.object({
  externalId: NonEmptyTextSchema.max(200),
  canonicalUrl: HttpsUrlSchema,
  title: NonEmptyTextSchema.max(500),
  locator: NonEmptyTextSchema.max(500),
  contentHash: Sha256Schema,
  license: NonEmptyTextSchema.max(200),
  termsStatus: SourceTermsStatusSchema,
  fetchedAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema,
}).strict();
export const IngestionChunkSchema = z.object({
  externalId: NonEmptyTextSchema.max(200),
  content: NonEmptyTextSchema.max(50_000),
  citation: CitationSchema,
}).strict();
export const OfferAvailabilitySchema = z.enum(["in_stock", "out_of_stock", "backorder", "unknown"]);
export const OfferFreshnessSchema = z.enum(["fresh", "stale"]);
const CachedThumbnailDataUrlSchema = z.string()
  .regex(/^data:image\/(?:avif|gif|jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Thumbnail must be a base64-encoded image data URL")
  .max(500_000);
export const CatalogOfferSchema = z.object({
  externalId: NonEmptyTextSchema.max(200),
  partId: z.string().uuid(),
  provider: NonEmptyTextSchema.max(100),
  providerSku: NonEmptyTextSchema.max(100),
  purchaseUrl: HttpsUrlSchema,
  availability: OfferAvailabilitySchema,
  price: z.number().finite().positive().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  /** A background-ingested image. The browser never contacts a vendor CDN to render it. */
  thumbnailDataUrl: CachedThumbnailDataUrlSchema.optional(),
  observedAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema,
  sourceUrl: HttpsUrlSchema,
  citation: CitationSchema,
}).strict().superRefine((offer, context) => {
  if ((offer.price === undefined) !== (offer.currency === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Price and currency must be supplied together" });
  }
  if (Date.parse(offer.expiresAt) < Date.parse(offer.observedAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Offer expiry cannot precede observation" });
  }
});
export const IngestCatalogFactSchema = z.object({
  externalId: NonEmptyTextSchema.max(200),
  partId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: NonEmptyTextSchema.max(300),
  category: PartRecordSchema.shape.category,
  sourceUrl: HttpsUrlSchema,
  license: NonEmptyTextSchema.max(200),
  citation: CitationSchema,
}).strict();
export const IngestUpsertSchema = z.object({
  version: z.literal("v2"),
  sourcePolicyId: SourcePolicyIdSchema,
  sourcePolicyRevision: z.number().int().positive(),
  idempotencyKey: NonEmptyTextSchema.max(300),
  source: SourceDocumentSchema,
  chunks: z.array(IngestionChunkSchema).min(1),
  catalogFacts: z.array(IngestCatalogFactSchema).default([]),
  offers: z.array(CatalogOfferSchema).default([]),
  cadAssets: z.array(CadAssetRecordSchema).default([]),
}).strict();
export const IngestUpsertResultSchema = z.object({
  ingestionRunId: z.string().uuid(),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  status: z.enum(["accepted", "rejected", "partial_failure"]),
}).strict();

export const CatalogCompatibilitySchema = z.object({
  sourcePartId: z.string().uuid(),
  targetPartId: z.string().uuid(),
  relation: z.enum(["compatible", "alternative", "incompatible"]),
  citation: CitationSchema,
}).strict();
export const InventoryMatchSchema = z.object({
  partId: z.string().uuid(),
  verified: z.boolean(),
  quantity: z.number().int().positive(),
  rawLabel: NonEmptyTextSchema.max(300).nullable(),
}).strict();
export const BuildProposalBomEntrySchema = z.object({
  part: PartRecordSchema,
  quantity: z.number().int().positive(),
  rationale: NonEmptyTextSchema.max(1_000),
  citations: z.array(CitationSchema).min(1),
  inventoryMatch: InventoryMatchSchema.nullable(),
  offers: z.array(CatalogOfferSchema),
  alternatives: z.array(PartRecordSchema).default([]),
  freshness: OfferFreshnessSchema,
}).strict().superRefine((entry, context) => {
  if (entry.freshness === "stale" && entry.alternatives.length === 0 && !entry.inventoryMatch?.verified) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["alternatives"],
      message: "A stale offer cannot be the only approved choice",
    });
  }
});
export const BuildProposalSchema = z.object({
  id: z.string().uuid(),
  discoveryRequestId: z.string().uuid(),
  intent: BuildIntentSchema,
  classification: RequestClassificationSchema,
  summary: NonEmptyTextSchema.max(2_000),
  billOfMaterials: z.array(BuildProposalBomEntrySchema).min(1),
  citations: z.array(CitationSchema).min(1),
  freshness: OfferFreshnessSchema,
  selected: z.boolean().default(false),
}).strict().superRefine((proposal, context) => {
  if (proposal.classification.outcome !== "approved" && proposal.billOfMaterials.length > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["billOfMaterials"], message: "Rejected proposals cannot expose a bill of materials" });
  }
});

export const GuidedLessonStepSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().positive(),
  title: NonEmptyTextSchema.max(300),
  safetyCategory: SafetyCategorySchema,
  safetyCallout: NonEmptyTextSchema.max(1_000),
  instruction: NonEmptyTextSchema.max(4_000),
  completionCondition: NonEmptyTextSchema.max(1_000),
  whyItMatters: NonEmptyTextSchema.max(2_000).optional(),
  concepts: z.array(LearningConceptSchema).default([]),
  sourceDigest: SourceDigestSchema,
  citations: z.array(CitationSchema).min(1),
  skills: z.array(SkillLibraryEntrySchema).default([]),
  matingSelections: z.array(MatingSelectionSchema).default([]),
}).strict().superRefine((step, context) => {
  if (!step.citations.some((citation) => citationIdentity(citation) === citationIdentity(step.sourceDigest.citation))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceDigest", "citation"],
      message: "A source digest must cite one of the step's cited sources.",
    });
  }
});
export const GuidedLessonSchema = z.object({
  proposalId: z.string().uuid(),
  title: NonEmptyTextSchema.max(300),
  steps: z.array(GuidedLessonStepSchema).min(1),
  troubleshooting: z.array(z.object({
    problem: NonEmptyTextSchema.max(1_000),
    explanation: NonEmptyTextSchema.max(2_000),
    citations: z.array(CitationSchema).min(1),
  }).strict()).default([]),
}).strict();
/** Lesson data returned to a learner contains no quiz or progression state. */
export const PublicGuidedLessonStepSchema = GuidedLessonStepSchema;
export const PublicGuidedLessonSchema = GuidedLessonSchema;
export const WorkshopPromotionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  buildId: z.string().uuid(),
  lesson: PublicGuidedLessonSchema,
}).strict();

export const DiscoveryOperationStatusSchema = z.enum([
  "queued",
  "classifying",
  "intent",
  "retrieving",
  "catalog",
  "generating",
  "validating",
  "solver",
  "ready",
  "rejected",
  "error",
]);
export const DiscoveryOperationSchema = z.object({
  operationId: z.string().uuid(),
  status: DiscoveryOperationStatusSchema,
  request: DiscoveryRequestSchema,
  intent: BuildIntentSchema.optional(),
  classification: RequestClassificationSchema.optional(),
  proposal: BuildProposalSchema.optional(),
  lesson: GuidedLessonSchema.optional(),
  error: NonEmptyTextSchema.max(1_000).optional(),
}).strict().superRefine((operation, context) => {
  if (operation.status === "rejected" && operation.classification?.outcome !== "rejected") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["classification"], message: "Rejected operations require a rejected classification" });
  }
  if (operation.status === "error" && !operation.error) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["error"], message: "Errored operations require an error message" });
  }
});
export const DiscoveryProgressEventSchema = z.object({
  operationId: z.string().uuid(),
  stage: DiscoveryOperationStatusSchema,
  message: NonEmptyTextSchema.max(1_000),
  percent: z.number().min(0).max(100).optional(),
}).strict();
/** Backwards-compatible name used by the existing agent SSE stream. */
export const AgentProgressEventSchema = DiscoveryProgressEventSchema;

export type Citation = z.infer<typeof CitationSchema>;
export type IntegerGridDimensions = z.infer<typeof IntegerGridDimensionsSchema>;
export type SchematicGridPosition = z.infer<typeof SchematicGridPositionSchema>;
export type DimensionConfidence = z.infer<typeof DimensionConfidenceSchema>;
export type CitedDimensionEvidence = z.infer<typeof CitedDimensionEvidenceSchema>;
export type SkillLibraryEntry = z.infer<typeof SkillLibraryEntrySchema>;
export type BuildId = z.infer<typeof BuildIdSchema>;
export type BuildSlug = z.infer<typeof BuildSlugSchema>;
export type PartRecord = z.infer<typeof PartRecordSchema>;
export type InventoryPart = z.infer<typeof InventoryPartSchema>;
export type CadAssetRecord = z.infer<typeof CadAssetRecordSchema>;
export type SchematicRole = z.infer<typeof SchematicRoleSchema>;
export type SemanticAnchorFace = z.infer<typeof SemanticAnchorFaceSchema>;
export type SemanticAnchor = z.infer<typeof SemanticAnchorSchema>;
export type SchematicConstraintNode = z.infer<typeof SchematicConstraintNodeSchema>;
export type SchematicAssemblySequenceStep = z.infer<typeof SchematicAssemblySequenceStepSchema>;
export type FlexibleConnection = z.infer<typeof FlexibleConnectionSchema>;
export type SchematicConstraintGraph = z.infer<typeof SchematicConstraintGraphSchema>;
export type SchematicLayoutRequest = z.infer<typeof SchematicLayoutRequestSchema>;
export type SchematicPlacement = z.infer<typeof SchematicPlacementSchema>;
export type SchematicRoute = z.infer<typeof SchematicRouteSchema>;
export type SchematicLayoutQuarantineRecord = z.infer<typeof SchematicLayoutQuarantineRecordSchema>;
export type SchematicLayoutRejectionCode = z.infer<typeof SchematicLayoutRejectionCodeSchema>;
export type SchematicLayoutRejection = z.infer<typeof SchematicLayoutRejectionSchema>;
export type SchematicLayoutReadyResult = z.infer<typeof SchematicLayoutReadyResultSchema>;
export type SchematicLayoutQuarantinedResult = z.infer<typeof SchematicLayoutQuarantinedResultSchema>;
export type SchematicLayoutRejectedResult = z.infer<typeof SchematicLayoutRejectedResultSchema>;
export type SchematicLayoutResult = z.infer<typeof SchematicLayoutResultSchema>;
export type ElectricalPinType = z.infer<typeof ElectricalPinTypeSchema>;
export type ElectricalPin = z.infer<typeof ElectricalPinSchema>;
export type ElectricalComponentRole = z.infer<typeof ElectricalComponentRoleSchema>;
export type ElectricalComponent = z.infer<typeof ElectricalComponentSchema>;
export type ElectricalNetConnection = z.infer<typeof ElectricalNetConnectionSchema>;
export type ElectricalNet = z.infer<typeof ElectricalNetSchema>;
export type ElectricalNetlist = z.infer<typeof ElectricalNetlistSchema>;
export type MatingSelection = z.infer<typeof MatingSelectionSchema>;
export type AssemblyTransform = z.infer<typeof AssemblyTransformSchema>;
export type TemplateParams = z.infer<typeof TemplateParamsSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LearningConcept = z.infer<typeof LearningConceptSchema>;
export type SourceDigest = z.infer<typeof SourceDigestSchema>;
export type StepPlan = z.infer<typeof StepPlanSchema>;
export type AuthoredBuildManifest = z.infer<typeof AuthoredBuildManifestSchema>;
export type BuildSelection = z.infer<typeof BuildSelectionSchema>;
export type AuthoredBuildRegistry = z.infer<typeof AuthoredBuildRegistrySchema>;
export type AgentProgressEvent = z.infer<typeof AgentProgressEventSchema>;
export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;
export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;
export type LearnerMode = z.infer<typeof LearnerModeSchema>;
export type DiscoveryRequest = z.infer<typeof DiscoveryRequestSchema>;
export type RequestClassification = z.infer<typeof RequestClassificationSchema>;
export type BuildIntent = z.infer<typeof BuildIntentSchema>;
export type SourcePolicy = z.infer<typeof SourcePolicySchema>;
export type SourcePolicyDocument = z.infer<typeof SourcePolicyDocumentSchema>;
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type IngestionChunk = z.infer<typeof IngestionChunkSchema>;
export type CatalogOffer = z.infer<typeof CatalogOfferSchema>;
export type IngestCatalogFact = z.infer<typeof IngestCatalogFactSchema>;
export type IngestUpsert = z.infer<typeof IngestUpsertSchema>;
export type IngestUpsertResult = z.infer<typeof IngestUpsertResultSchema>;
export type CatalogCompatibility = z.infer<typeof CatalogCompatibilitySchema>;
export type InventoryMatch = z.infer<typeof InventoryMatchSchema>;
export type BuildProposalBomEntry = z.infer<typeof BuildProposalBomEntrySchema>;
export type BuildProposal = z.infer<typeof BuildProposalSchema>;
export type GuidedLessonStep = z.infer<typeof GuidedLessonStepSchema>;
export type GuidedLesson = z.infer<typeof GuidedLessonSchema>;
export type PublicGuidedLesson = z.infer<typeof PublicGuidedLessonSchema>;
export type WorkshopPromotionResponse = z.infer<typeof WorkshopPromotionResponseSchema>;
export type DiscoveryOperation = z.infer<typeof DiscoveryOperationSchema>;
export type DiscoveryProgressEvent = z.infer<typeof DiscoveryProgressEventSchema>;
