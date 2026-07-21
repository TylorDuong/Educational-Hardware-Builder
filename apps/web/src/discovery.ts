import {
  BuildProposalSchema,
  GuidedLessonSchema,
  RequestClassificationSchema,
  type Citation,
  type BuildIntent,
  type BuildProposal,
  type DiscoveryRequest,
  type GuidedLesson,
  type RetrievalResult,
  type RequestClassification,
} from "@educational-hardware-builder/schemas";
import { z } from "zod";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";

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

/** Lesson generation receives local source excerpts so the model can explain them instead of guessing from a link. */
export interface LessonGenerationDependencies extends AgentDependencies {
  retrieve: (query: string) => Promise<RetrievalResult[]>;
}

export interface DiscoveryResult {
  intent: BuildIntent;
  classification: RequestClassification;
  proposal: BuildProposal | null;
  model: ModelCallResult<BuildIntent>;
}

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

function citedSourceExcerpts(proposal: BuildProposal, retrieved: readonly RetrievalResult[]) {
  const permittedCitations = new Set(proposal.citations.map(citationKey));
  return retrieved
    .map((item) => ({
      content: item.content.slice(0, 3_000),
      citations: item.citations.filter((citation) => permittedCitations.has(citationKey(citation))),
    }))
    .filter((item) => item.citations.length > 0)
    .slice(0, 8);
}

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
        required: ["id", "order", "title", "safetyCategory", "safetyCallout", "instruction", "completionCondition", "whyItMatters", "concepts", "sourceDigest", "citations", "skills", "matingSelections"],
        additionalProperties: false,
        properties: {
          id: { type: "string", format: "uuid" },
          order: { type: "integer", minimum: 1 },
          title: { type: "string", minLength: 1 },
          safetyCategory: { type: "string" },
          safetyCallout: { type: "string", minLength: 1 },
          instruction: { type: "string", minLength: 1 },
          completionCondition: { type: "string", minLength: 1 },
          whyItMatters: { type: "string", minLength: 1 },
          concepts: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["title", "explanation"],
              additionalProperties: false,
              properties: {
                title: { type: "string", minLength: 1 },
                explanation: { type: "string", minLength: 1 },
              },
            },
          },
          sourceDigest: {
            type: "object",
            required: ["summary", "citation"],
            additionalProperties: false,
            properties: {
              summary: { type: "string", minLength: 1 },
              citation: { type: "object" },
            },
          },
          citations: { type: "array", minItems: 1 },
          skills: { type: "array" },
          matingSelections: { type: "array" },
        },
      },
    },
    troubleshooting: { type: "array" },
  },
} as const;

function fixtureGuidedLesson(proposal: BuildProposal): GuidedLesson {
  const citation = proposal.citations[0];
  if (!citation) throw new Error("A guided lesson requires at least one proposal citation.");
  return GuidedLessonSchema.parse({
    proposalId: proposal.id,
    title: `${proposal.summary} - guided lesson`,
    steps: weatherStationGoldenSteps.map((step) => ({
      id: step.id,
      order: step.order,
      title: step.title,
      safetyCategory: step.safetyCategory,
      safetyCallout: `Review the cited guidance before ${step.title.toLowerCase()}.`,
      instruction: step.instruction,
      completionCondition: step.completionCondition ?? `Complete ${step.title.toLowerCase()} as described in the cited guidance.`,
      whyItMatters: step.whyItMatters ?? step.lesson.content,
      concepts: step.concepts.length > 0 ? step.concepts : [{
        title: step.lesson.title,
        explanation: step.lesson.content,
      }],
      sourceDigest: {
        summary: step.sourceDigest.summary,
        citation,
      },
      citations: [citation],
      skills: step.skills,
      matingSelections: step.matingSelections,
    })),
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
      if (!step.citations.some((citation) => citationKey(citation) === citationKey(step.sourceDigest.citation))) {
        context.addIssue({ code: "custom", path: ["steps", index, "sourceDigest", "citation"], message: "A source digest must point to one of the step citations." });
      }
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
export async function generateGuidedLesson(proposal: BuildProposal, dependencies: LessonGenerationDependencies): Promise<ModelCallResult<GuidedLesson>> {
  if (proposal.classification.outcome !== "approved") throw new Error("Guided lessons require an approved proposal.");
  const fallback = () => fixtureGuidedLesson(proposal);
  const retrieved = await dependencies.retrieve(proposal.intent.retrievalTerms.join(" ")).catch(() => []);
  const sourceExcerpts = citedSourceExcerpts(proposal, retrieved);
  return callModel<GuidedLesson>({
    schema: guidedLessonSchemaFor(proposal) as z.ZodType<GuidedLesson>,
    jsonSchema: guidedLessonJsonSchema,
    prompt: `Generate a beginner guided hardware lesson for this approved proposal. Return only JSON. Use the grounded local source excerpts below as the source of truth. Every step must provide a safety callout before its instruction, a cited whyItMatters explanation, one or more named concepts with learner-friendly explanations, and a sourceDigest. sourceDigest is the learner's primary explanation: summarize the relevant excerpt in plain language, name no facts that are absent from the excerpts, and copy the matching citation object exactly. Whenever an instruction names an abbreviated or product-style part, pair it with a plain-language role the learner can say aloud. For example, write "ESP32 microcontroller" rather than only "ESP32". Source links are only optional follow-up reading. Cite only the supplied proposal citations, use symbolic mating IDs only, and never emit coordinates, transforms, matrices, or electrical design values.\n\nProposal: ${JSON.stringify(proposal)}\n\nGrounded local source excerpts: ${JSON.stringify(sourceExcerpts)}`,
    model: "llama3.1:8b",
    temperature: 0.2,
    fallback,
    fetcher: dependencies.fetcher,
    ollamaUrl: dependencies.ollamaUrl,
    demoSafeMode: dependencies.demoSafeMode,
  });
}

/** Relevance boundary, independent of the local model's structured output. */
export function classifyRequest(prompt: string, intent: BuildIntent): RequestClassification {
  const text = `${prompt} ${intent.normalizedGoal} ${intent.constraints.join(" ")}`.toLowerCase();
  if (/\b(kill|sabotage|weaponize|evade safeguards|harm someone)\b/.test(text)) {
    return RequestClassificationSchema.parse({ outcome: "rejected", reason: "malicious", message: "This request is rejected because it expresses malicious intent." });
  }
  if (/\b(write (an )?essay|recipe|vacation|celebrity gossip|sports score)\b/.test(text)) {
    return RequestClassificationSchema.parse({ outcome: "rejected", reason: "off_topic", message: "This request is outside technical hardware building." });
  }
  return RequestClassificationSchema.parse({ outcome: "approved", reason: "Relevant technical hardware request." });
}

export async function discoverBuild(request: DiscoveryRequest, dependencies: DiscoveryDependencies): Promise<DiscoveryResult> {
  const model = await runDiscoveryIntent(request.prompt, dependencies);
  const classification = classifyRequest(request.prompt, model.value);
  const intent = { ...model.value, classification };
  if (classification.outcome !== "approved") return { intent, classification, proposal: null, model: { ...model, value: intent } };

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
    classification,
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
  return { intent, classification, proposal, model: { ...model, value: intent } };
}
