import {
  BuildProposalSchema,
  GuidedLessonSchema,
  SafetyDecisionSchema,
  type Citation,
  type BuildIntent,
  type BuildProposal,
  type DiscoveryRequest,
  type GuidedLesson,
  type RetrievalResult,
  type SafetyDecision,
} from "@educational-hardware-builder/schemas";
import { z } from "zod";

import { callModel, runDiscoveryIntent, type AgentDependencies, type ModelCallResult } from "./agents.js";
import {
  findCompatibleAlternatives,
  findFreshCatalogOffers,
  findVerifiedInventoryMatches,
  type CatalogDependencies,
} from "./catalog.js";

export interface DiscoveryDependencies extends AgentDependencies {
  retrieve: (query: string) => Promise<RetrievalResult[]>;
  catalog: CatalogDependencies;
}

export interface DiscoveryResult {
  intent: BuildIntent;
  safety: SafetyDecision;
  proposal: BuildProposal | null;
  model: ModelCallResult<BuildIntent>;
}

const blocked = (category: "mains_ac" | "lipo", reason: "mains_ac" | "lipo_charging", callout: string): SafetyDecision =>
  SafetyDecisionSchema.parse({ outcome: "blocked", categories: [category], blockReasons: [reason], callout });

const primaryPart = {
  id: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  slug: "esp32-devkit",
  name: "ESP32 DevKit",
  category: "compute" as const,
  electricalSpecs: {},
  cadAssetIds: [],
};

function uniqueCitations(citations: readonly Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.sourceUrl}\u0000${citation.locator}\u0000${citation.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const citationKey = (citation: Citation): string => `${citation.sourceUrl}\u0000${citation.locator}\u0000${citation.title}`;

const guidedLessonJsonSchema = {
  type: "object",
  required: ["proposalId", "title", "steps", "troubleshooting"],
  additionalProperties: false,
  properties: {
    proposalId: { type: "string", format: "uuid" },
    title: { type: "string", minLength: 1 },
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "order", "title", "safetyCategory", "safetyCallout", "instruction", "completionCondition", "citations", "matingSelections"],
        additionalProperties: false,
      },
    },
    troubleshooting: { type: "array" },
  },
} as const;

function fixtureGuidedLesson(proposal: BuildProposal): GuidedLesson {
  const citation = proposal.citations[0];
  if (!citation) throw new Error("A guided lesson requires at least one proposal citation.");
  const part = proposal.billOfMaterials[0]?.part.name ?? "selected low-voltage part";
  return GuidedLessonSchema.parse({
    proposalId: proposal.id,
    title: `${proposal.summary} — guided lesson`,
    steps: [{
      id: "10000000-0000-4000-8000-000000000010",
      order: 1,
      title: `Prepare the ${part}`,
      safetyCategory: "none",
      safetyCallout: "Keep the assembly disconnected from power while preparing parts.",
      instruction: `Place the ${part} and its cited supporting parts on the work surface before making connections.`,
      completionCondition: "All required parts are identified and remain disconnected from power.",
      citations: [citation],
      skills: [{
        title: citation.title,
        sourceUrl: citation.sourceUrl,
        locator: citation.locator,
        relevance: "Explains the connection and assembly concepts used in this step.",
      }],
      matingSelections: [],
    }],
    troubleshooting: [{
      problem: "A required part is not available.",
      explanation: "Recheck the cited proposal alternatives and verified inventory before substituting any part.",
      citations: [citation],
    }],
  });
}

function guidedLessonSchemaFor(proposal: BuildProposal) {
  const permittedCitations = new Set(proposal.citations.map(citationKey));
  return GuidedLessonSchema.superRefine((lesson, context) => {
    if (lesson.proposalId !== proposal.id) {
      context.addIssue({ code: "custom", path: ["proposalId"], message: "Guided lesson must belong to the selected proposal." });
    }
    for (const [index, step] of lesson.steps.entries()) {
      step.citations.forEach((citation, citationIndex) => {
        if (!permittedCitations.has(citationKey(citation))) {
          context.addIssue({ code: "custom", path: ["steps", index, "citations", citationIndex], message: "Lesson citations must come from the proposal retrieval set." });
        }
      });
    }
    for (const [index, item] of lesson.troubleshooting.entries()) {
      item.citations.forEach((citation, citationIndex) => {
        if (!permittedCitations.has(citationKey(citation))) {
          context.addIssue({ code: "custom", path: ["troubleshooting", index, "citations", citationIndex], message: "Troubleshooting citations must come from the proposal retrieval set." });
        }
      });
    }
  });
}

/** Generates only schema-validated, proposal-cited lesson data; fixture mode never calls a model. */
export async function generateGuidedLesson(proposal: BuildProposal, dependencies: AgentDependencies): Promise<ModelCallResult<GuidedLesson>> {
  if (proposal.safety.outcome !== "approved") throw new Error("Guided lessons require an approved proposal.");
  const fallback = () => fixtureGuidedLesson(proposal);
  return callModel<GuidedLesson>({
    schema: guidedLessonSchemaFor(proposal) as z.ZodType<GuidedLesson>,
    jsonSchema: guidedLessonJsonSchema,
    prompt: `Generate a beginner guided hardware lesson for this approved proposal. Return only JSON. Every step must provide a safety callout before its instruction, cite only the supplied proposal citations, use symbolic mating IDs only, and never emit coordinates, transforms, matrices, or electrical design values.\n\nProposal: ${JSON.stringify(proposal)}`,
    model: "llama3.1:8b",
    temperature: 0.2,
    fallback,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
}

/** Relevance boundary, independent of the local model's structured output. */
export function preflightSafety(prompt: string, intent: BuildIntent): SafetyDecision {
  const text = `${prompt} ${intent.normalizedGoal} ${intent.constraints.join(" ")}`.toLowerCase();
  if (/\b(kill|sabotage|weaponize|evade safeguards|harm someone)\b/.test(text)) {
    return SafetyDecisionSchema.parse({ outcome: "blocked", categories: ["none"], blockReasons: ["malicious"], callout: "This request is rejected because it expresses malicious intent." });
  }
  if (/\b(write (an )?essay|recipe|vacation|celebrity gossip|sports score)\b/.test(text)) {
    return SafetyDecisionSchema.parse({ outcome: "blocked", categories: ["none"], blockReasons: ["off_topic"], callout: "This request is outside technical hardware building." });
  }
  return SafetyDecisionSchema.parse({ ...intent.safety, outcome: "approved", blockReasons: [], callout: "Relevant technical hardware request." });
}

export async function discoverBuild(request: DiscoveryRequest, dependencies: DiscoveryDependencies): Promise<DiscoveryResult> {
  const model = await runDiscoveryIntent(request.prompt, dependencies);
  const safety = preflightSafety(request.prompt, model.value);
  const intent = { ...model.value, safety };
  if (safety.outcome !== "approved") return { intent, safety, proposal: null, model: { ...model, value: intent } };

  const retrieved = await dependencies.retrieve(intent.retrievalTerms.join(" "));
  const retrievalCitations = retrieved.flatMap((item) => item.citations);
  if (retrievalCitations.length === 0) throw new Error("Discovery requires locally retrieved citations.");

  const [inventoryMatches, alternatives, cachedOffers] = await Promise.all([
    findVerifiedInventoryMatches(request.userId, request.inventoryPartIds, dependencies.catalog),
    findCompatibleAlternatives(primaryPart.id, dependencies.catalog),
    findFreshCatalogOffers([primaryPart.id], new Date(), dependencies.catalog),
  ]);
  const inventoryMatch = inventoryMatches.find((match) => match.partId === primaryPart.id) ?? null;
  // A currently cached but unavailable offer is not an approved choice. It may
  // remain in the catalog for audit purposes, but must not become the learner's
  // only recommendation.
  const offers = cachedOffers.filter((offer) => offer.availability === "in_stock");
  const freshness = offers.length > 0 ? "fresh" : "stale";
  const citations = uniqueCitations([
    ...retrievalCitations,
    ...alternatives.map((alternative) => alternative.citation),
    ...offers.map((offer) => offer.citation),
  ]);
  const proposal = BuildProposalSchema.parse({
    id: "30000000-0000-4000-8000-000000000001",
    discoveryRequestId: "20000000-0000-4000-8000-000000000001",
    intent,
    safety,
    summary: intent.normalizedGoal,
    billOfMaterials: [{
      part: primaryPart,
      quantity: 1,
      rationale: inventoryMatch
        ? "Verified learner inventory is preferred for this locally supported part."
        : "Selected from the locally verified catalog with cited compatible alternatives.",
      citations,
      inventoryMatch,
      offers,
      alternatives: alternatives.map((alternative) => alternative.part),
      freshness,
    }],
    citations,
    freshness,
    selected: false,
  });
  return { intent, safety, proposal, model: { ...model, value: intent } };
}
