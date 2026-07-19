import {
  BuildProposalSchema,
  SafetyDecisionSchema,
  type Citation,
  type BuildIntent,
  type BuildProposal,
  type DiscoveryRequest,
  type RetrievalResult,
  type SafetyDecision,
} from "@educational-hardware-builder/schemas";

import { runDiscoveryIntent, type AgentDependencies, type ModelCallResult } from "./agents.js";
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

/** Hard policy boundary, independent of the local model's structured output. */
export function preflightSafety(prompt: string, intent: BuildIntent): SafetyDecision {
  const text = `${prompt} ${intent.normalizedGoal} ${intent.constraints.join(" ")}`.toLowerCase();
  if (/\b(mains|120\s*v|240\s*v|ac outlet|line voltage)\b/.test(text)) return blocked("mains_ac", "mains_ac", "Mains AC projects are hard-blocked in Beginner mode.");
  if (/\b(lipo|li-po|lithium polymer|battery charging)\b/.test(text)) return blocked("lipo", "lipo_charging", "LiPo charging projects are hard-blocked in Beginner mode.");
  if (/\b(unverified electrical|design a regulator|choose a resistor value)\b/.test(text)) {
    return SafetyDecisionSchema.parse({ outcome: "blocked", categories: ["none"], blockReasons: ["unverified_electrical_values"], callout: "Unverified electrical design values are not supported." });
  }
  return SafetyDecisionSchema.parse({ ...intent.safety, outcome: "approved", blockReasons: [] });
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
