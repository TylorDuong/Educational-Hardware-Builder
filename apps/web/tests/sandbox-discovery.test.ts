import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function sandboxSource(): Promise<string> {
  return readFile(new URL("../src/sandbox.tsx", import.meta.url), "utf8");
}

test("Dashboard renders validated discovery results and preserves the existing five-tab navigation", async () => {
  const source = await sandboxSource();
  assert.match(source, /const tabs = \["Dashboard", "Research", "Build", "Parts", "Workshop"\] as const/);
  assert.match(source, /DiscoveryRequestSchema\.parse/);
  assert.match(source, /fetch\("\/api\/discovery"/);
  assert.match(source, /new EventSource\(`\/api\/discovery\/\$\{payload\.operationId\}\/events`\)/);
  assert.match(source, /DiscoveryProgressEventSchema\.parse/);
  assert.match(source, /RequestClassificationSchema\.parse/);
  assert.match(source, /BuildProposalSchema\.parse/);
  assert.match(source, /function DiscoverySummary/);
  assert.match(source, /Cited proposal/);
  assert.match(source, /function ResearchPanel\(\{ discovery \}/);
  assert.match(source, /Catalog provenance/);
  assert.match(source, /function PartsPanel\(\{ discovery, onOpenWorkshop \}/);
  assert.match(source, /Inventory gap/);
  assert.match(source, /Cached source options/);
  assert.match(source, /Compatible alternatives/);
  assert.match(source, /Open cached shop link/);
  assert.match(source, /View source provenance/);
  assert.match(source, /Stale or unavailable offer data/);
  assert.match(source, /WorkshopPromotionResponseSchema\.parse/);
  assert.match(source, /\/api\/discovery\/\$\{discovery\.operationId\}\/select/);
  assert.match(source, /function SelectedWorkshopPanel/);
  assert.match(source, /Safety first/);
  assert.match(source, /Troubleshooting/);
  assert.match(source, /Deterministic assembly/);
  assert.match(source, /solveSelectedProposalParts/);
  assert.match(source, /role="alert"/);
});
