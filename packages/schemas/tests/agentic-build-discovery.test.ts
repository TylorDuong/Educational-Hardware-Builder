import { describe, expect, it } from "vitest";

import {
  BuildProposalSchema,
  CitationSchema,
  DiscoveryRequestSchema,
  GuidedLessonSchema,
  IngestUpsertSchema,
  SafetyDecisionSchema,
  SourcePolicySchema,
} from "../src/index.js";

const ids = {
  user: "10000000-0000-4000-8000-000000000001",
  request: "20000000-0000-4000-8000-000000000001",
  proposal: "30000000-0000-4000-8000-000000000001",
  part: "40000000-0000-4000-8000-000000000001",
  alternative: "40000000-0000-4000-8000-000000000002",
  step: "50000000-0000-4000-8000-000000000001",
};

const citation = {
  sourceUrl: "https://docs.example.test/guide",
  locator: "section 2",
  title: "Safe low-voltage guide",
};
const safeDecision = {
  outcome: "approved" as const,
  categories: ["none"] as const,
  blockReasons: [],
  callout: "Use USB power only.",
};
const blockedDecision = {
  outcome: "blocked" as const,
  categories: ["mains_ac"] as const,
  blockReasons: ["mains_ac"] as const,
  callout: "Mains AC builds are not supported in Beginner mode.",
};
const part = {
  id: ids.part,
  slug: "usb-led-module",
  name: "USB LED Module",
  category: "passive" as const,
  electricalSpecs: {},
  cadAssetIds: [],
};
const alternativePart = {
  ...part,
  id: ids.alternative,
  slug: "usb-led-module-alt",
  name: "USB LED Module Alternative",
};
const intent = {
  normalizedGoal: "Build a beginner USB desk light.",
  capabilities: ["low-voltage assembly"],
  exclusions: ["mains power"],
  constraints: ["usb-power-only"],
  retrievalTerms: ["USB LED module"],
  safety: safeDecision,
};
const staleOffer = {
  externalId: "adafruit-1234",
  partId: ids.part,
  provider: "Approved Vendor",
  providerSku: "1234",
  purchaseUrl: "https://shop.example.test/products/1234",
  availability: "in_stock" as const,
  price: 4.95,
  currency: "USD",
  observedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-02T00:00:00.000Z",
  sourceUrl: "https://shop.example.test/products/1234",
  citation,
};

describe("agentic build discovery contracts", () => {
  it("rejects malformed free-form requests and unknown request fields", () => {
    const request = {
      prompt: "Build a USB desk light",
      mode: "beginner",
      userId: ids.user,
      inventoryPartIds: [],
      constraints: ["usb-power-only"],
    };

    expect(DiscoveryRequestSchema.parse(request)).toEqual(request);
    expect(() => DiscoveryRequestSchema.parse({ ...request, prompt: "  " })).toThrow();
    expect(() => DiscoveryRequestSchema.parse({ ...request, rawCoordinates: [0, 0, 0] })).toThrow();
  });

  it("requires strict, attributable citations on ingestion and lesson content", () => {
    expect(() => CitationSchema.parse({ ...citation, unsupported: true })).toThrow();
    expect(() => IngestUpsertSchema.parse({
      version: "v2",
      sourcePolicyId: "adafruit-catalog",
      sourcePolicyRevision: 1,
      idempotencyKey: "catalog:1234:v1",
      source: {
        externalId: "catalog:1234",
        canonicalUrl: "https://shop.example.test/products/1234",
        title: citation.title,
        locator: citation.locator,
        contentHash: "a".repeat(64),
        license: "catalog terms recorded",
        termsStatus: "public-catalog",
        fetchedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-02T00:00:00.000Z",
      },
      chunks: [{ externalId: "catalog:1234:summary", content: "A cited product description.", citation: undefined }],
    })).toThrow();
    expect(() => GuidedLessonSchema.parse({
      proposalId: ids.proposal,
      title: "USB desk light",
      steps: [{
        id: ids.step,
        order: 1,
        title: "Connect the module",
        safetyCategory: "none",
        safetyCallout: safeDecision.callout,
        instruction: "Connect the USB LED module.",
        completionCondition: "The LED module is seated.",
        citations: [],
      }],
      troubleshooting: [],
    })).toThrow();
  });

  it("rejects unapproved CAD licenses in source policies", () => {
    const policy = {
      id: "example-documentation",
      revision: 1,
      enabled: true,
      sourceClass: "documentation" as const,
      allowedUrlPatterns: ["https://docs.example.test/**"],
      allowedFacts: ["citation", "documentation", "cad_metadata"] as const,
      refresh: { intervalHours: 24, maxStalenessHours: 72 },
      terms: {
        evidenceRequired: true as const,
        acceptedStatuses: ["public-documentation"] as const,
        prohibitedUses: ["unapproved-scraping"],
      },
      cadAssets: {
        sourceUrlRequired: true as const,
        identifiableLicenseRequired: true as const,
        allowedLicenses: ["CC-BY-4.0"] as const,
        rejectAmbiguousLicense: true as const,
      },
    };

    expect(SourcePolicySchema.parse(policy)).toEqual(policy);
    expect(() => SourcePolicySchema.parse({
      ...policy,
      cadAssets: { ...policy.cadAssets, allowedLicenses: ["CC-BY-NC-4.0"] },
    })).toThrow();
  });

  it("requires a safe alternative or verified inventory when an offer is stale", () => {
    const proposal = {
      id: ids.proposal,
      discoveryRequestId: ids.request,
      intent,
      safety: safeDecision,
      summary: "A safe USB desk-light proposal.",
      billOfMaterials: [{
        part,
        quantity: 1,
        rationale: "The part is compatible with USB power.",
        citations: [citation],
        inventoryMatch: null,
        offers: [staleOffer],
        alternatives: [alternativePart],
        freshness: "stale" as const,
      }],
      citations: [citation],
      freshness: "stale" as const,
      selected: false,
    };

    expect(BuildProposalSchema.parse(proposal)).toEqual(proposal);
    expect(() => BuildProposalSchema.parse({
      ...proposal,
      billOfMaterials: [{ ...proposal.billOfMaterials[0], alternatives: [] }],
    })).toThrow();
    expect(() => IngestUpsertSchema.parse({
      version: "v2",
      sourcePolicyId: "adafruit-catalog",
      sourcePolicyRevision: 1,
      idempotencyKey: "catalog:bad-expiry",
      source: {
        externalId: "catalog:bad-expiry",
        canonicalUrl: "https://shop.example.test/products/1234",
        title: citation.title,
        locator: citation.locator,
        contentHash: "b".repeat(64),
        license: "catalog terms recorded",
        termsStatus: "public-catalog",
        fetchedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-02T00:00:00.000Z",
      },
      chunks: [{ externalId: "catalog:bad-expiry:summary", content: "A cited product description.", citation }],
      offers: [{ ...staleOffer, expiresAt: "2025-12-31T00:00:00.000Z" }],
    })).toThrow();
  });

  it("rejects raw coordinates and prevents forbidden hazards from exposing a BOM", () => {
    expect(() => GuidedLessonSchema.parse({
      proposalId: ids.proposal,
      title: "USB desk light",
      steps: [{
        id: ids.step,
        order: 1,
        title: "Connect the module",
        safetyCategory: "none",
        safetyCallout: safeDecision.callout,
        instruction: "Connect the USB LED module.",
        completionCondition: "The LED module is seated.",
        citations: [citation],
        matingSelections: [{
          movingPartId: ids.part,
          movingFeatureId: "module-port",
          targetPartId: ids.alternative,
          targetFeatureId: "mount",
          positionMm: [0, 0, 0],
        }],
      }],
    })).toThrow();
    expect(() => SafetyDecisionSchema.parse({ ...blockedDecision, blockReasons: [] })).toThrow();
    expect(() => BuildProposalSchema.parse({
      id: ids.proposal,
      discoveryRequestId: ids.request,
      intent: { ...intent, safety: blockedDecision },
      safety: blockedDecision,
      summary: "A blocked proposal.",
      billOfMaterials: [{
        part,
        quantity: 1,
        rationale: "This must not be exposed.",
        citations: [citation],
        inventoryMatch: null,
        offers: [],
        alternatives: [],
        freshness: "fresh",
      }],
      citations: [citation],
      freshness: "fresh",
      selected: false,
    })).toThrow();
  });
});
