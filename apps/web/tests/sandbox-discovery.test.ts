import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function sandboxSource(): Promise<string> {
  return readFile(new URL("../src/sandbox.tsx", import.meta.url), "utf8");
}

test("Dashboard preserves discovery behavior, five-tab navigation, and section help", async () => {
  const source = await sandboxSource();

  assert.match(source, /const tabs = \["Dashboard", "Research", "Parts", "Build", "Workshop"\] as const/);
  assert.match(source, /function PageHeading/);
  assert.match(source, /function SectionHelpModal/);
  assert.match(source, /className="help-trigger"/);
  assert.match(source, /const sectionGuides/);

  assert.match(source, /DiscoveryRequestSchema\.parse/);
  assert.match(source, /inventoryPartIds: ownedInventoryPartIds/);
  assert.match(source, /fetch\("\/api\/discovery"/);
  assert.match(source, /new EventSource\("\/api\/discovery\/" \+ payload\.operationId \+ "\/events"\)/);
  assert.match(source, /DiscoveryProgressEventSchema\.parse/);
  assert.match(source, /RequestClassificationSchema\.parse/);
  assert.match(source, /BuildProposalSchema\.parse/);
  assert.match(source, /function DiscoverySummary/);
  assert.match(source, /YOUR PLAN/);

  assert.match(source, /function ResearchPanel/);
  assert.match(source, /Saved parts data/);
  assert.match(source, /See the research/);
  assert.match(source, /onOpenBuild=\{\(\) => setActiveTab\("Research"\)\}/);
  assert.match(source, /setActiveTab\("Parts"\)/);

  assert.match(source, /function PartsPanel/);
  assert.match(source, /What parts do you have\? \(optional\)/);
  assert.match(source, /function ReportedOwnedParts/);
  assert.match(source, /Ready for planning/);
  assert.match(source, /Needs a check/);
  assert.match(source, /parseOwnedParts\(ownedPartsText\)/);
  assert.match(source, /function ComponentBreakdown/);
  assert.match(source, /Parts you need/);
  assert.match(source, /Still needed:/);
  assert.match(source, /Saved options/);
  assert.match(source, /function OfferCard/);
  assert.match(source, /thumbnailDataUrl/);
  assert.match(source, /Other options/);
  assert.match(source, /Open \{offer\.provider\}/);
  assert.match(source, /See the build/);
  assert.match(source, /onOpenWorkshop=\{\(\) => setActiveTab\("Build"\)\}/);
  assert.match(source, /See source/);
  assert.match(source, /Saved option needs a check/);

  assert.match(source, /WorkshopPromotionResponseSchema\.parse/);
  assert.match(source, /"\/api\/discovery\/" \+ discovery\.operationId \+ "\/select"/);
  assert.match(source, /setActiveTab\("Workshop"\)/);
  assert.match(source, /Opening your lesson/);
  assert.match(source, /function SelectedWorkshopPanel/);
  assert.match(source, /function InteractiveAssemblyViewer/);
  assert.match(source, /createSchematicScene/);
  assert.match(source, /routes=\{schematicScene\.routes\}/);
  assert.match(source, /cameraTarget=\{cameraTarget\}/);
  assert.doesNotMatch(source, /solverTracedFixtureParts/);
  assert.doesNotMatch(source, /assertSolverTraces/);
  assert.match(source, /Parts in this model/);
  assert.match(source, /focusPartId=\{focusedPart\?\.id\}/);
  assert.match(source, /onHover=\{setHoveredPartId\}/);
  assert.match(source, /Center &amp; reset model/);
  assert.match(source, /className=\{part\.id === focusedPart\?\.id \? "part-picker active" : "part-picker"\}/);
  assert.doesNotMatch(source, /Spread parts out/);
  assert.match(source, /Safety tip/);
  assert.match(source, /Fix a problem/);
  assert.match(source, /Fit check/);
  assert.match(source, /solveSelectedProposalParts/);
  assert.match(source, /role="alert"/);
});
