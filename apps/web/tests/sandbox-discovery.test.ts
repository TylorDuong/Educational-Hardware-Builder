import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function sandboxSource(): Promise<string> {
  return readFile(new URL("../src/sandbox.tsx", import.meta.url), "utf8");
}

async function sandboxCss(): Promise<string> {
  return readFile(new URL("../src/sandbox.css", import.meta.url), "utf8");
}

async function redesignCss(): Promise<string> {
  return readFile(new URL("../src/redesign.css", import.meta.url), "utf8");
}

test("Dashboard preserves discovery behavior, four-tab navigation, and section help", async () => {
  const [source, css, redesign] = await Promise.all([sandboxSource(), sandboxCss(), redesignCss()]);

  assert.match(source, /const tabs = \["Dashboard", "Research", "Parts", "Workshop"\] as const/);
  assert.match(source, /function PageHeading/);
  assert.match(source, /function AppTabs/);
  assert.match(source, /aria-label="Primary navigation"/);
  assert.match(source, /function SectionHelpModal/);
  assert.match(source, /className="help-trigger"/);
  assert.match(source, /const sectionGuides/);

  assert.match(source, /DiscoveryRequestSchema\.parse/);
  assert.match(source, /parseApiJson/);
  assert.match(source, /inventoryPartIds: ownedInventoryPartIds/);
  assert.match(source, /fetch\("\/api\/discovery"/);
  assert.match(source, /new EventSource\("\/api\/discovery\/" \+ payload\.operationId \+ "\/events"\)/);
  assert.match(source, /DiscoveryProgressEventSchema\.parse/);
  assert.match(source, /RequestClassificationSchema\.parse/);
  assert.match(source, /BuildProposalSchema\.parse/);
  assert.match(source, /function DiscoverySummary/);
  assert.match(source, /YOUR PLAN/);
  assert.match(source, /if \(classification\.outcome === "approved" && proposal\) \{[\s\S]*setActiveTab\("Research"\)/);

  assert.match(source, /function ResearchPanel/);
  assert.match(source, /function researchBriefFor/);
  assert.match(source, /What you will make/);
  assert.match(source, /Conceptual parts you need/);
  assert.match(source, /Potential use cases/);
  assert.match(source, /Alternative builds/);
  assert.match(source, /Saved parts data/);
  assert.match(source, /activeTab === "Dashboard"/);
  assert.match(source, /const shellClassName = hasFloatingWorkshopTimeline/);
  assert.match(source, /has-floating-workflow-navigation/);
  assert.match(source, /function WorkflowNavigation/);
  assert.match(source, /aria-label="Section navigation"/);
  assert.match(source, /YOUR PATH/);
  assert.match(source, /Previous: /);
  assert.match(source, /Next: /);
  assert.doesNotMatch(source, /workflow-navigation-actions[\s\S]*tabs\.map/);
  assert.match(source, /activeTab !== "Workshop" \? \(/);
  assert.match(css, /\.app-tabs[\s\S]*position: sticky/);
  assert.match(css, /\.workflow-navigation[\s\S]*position: fixed/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(redesign, /\.workflow-navigation \{\s+position: fixed;/);
  assert.match(css, /\.workshop-timeline[\s\S]*position: fixed/);
  assert.match(css, /\.app-shell\.has-floating-workshop-timeline/);

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
  assert.match(source, /startSelectedWorkshop/);
  assert.doesNotMatch(source, /function BuildPanel/);
  assert.doesNotMatch(source, /activeTab === "Build"/);
  assert.match(source, /See source/);
  assert.match(source, /Saved option needs a check/);

  assert.match(source, /WorkshopPromotionResponseSchema\.parse/);
  assert.match(source, /"\/api\/discovery\/" \+ discovery\.operationId \+ "\/select"/);
  assert.match(source, /setActiveTab\("Workshop"\)/);
  assert.match(source, /Opening your lesson/);
  assert.match(source, /function SelectedWorkshopPanel/);
  assert.doesNotMatch(source, /function WiringPanel/);
  assert.doesNotMatch(source, /activeTab === "Wiring"/);
  assert.match(source, /function WorkshopStepVisual/);
  assert.doesNotMatch(source, /function SimilarProjects/);
  assert.doesNotMatch(source, /Build with confidence\./);
  assert.doesNotMatch(source, /References for your next iteration\./);
  assert.match(source, /supportsWeatherStationWiring/);
  assert.match(source, /WiringDiagram key=\{`\$\{step\.id\}/);
  assert.match(source, /function InteractiveAssemblyViewer/);
  assert.match(source, /createSchematicScene/);
  assert.match(source, /routes=\{schematicScene\.routes\}/);
  assert.match(source, /cameraTarget=\{cameraTarget\}/);
  assert.doesNotMatch(source, /solverTracedFixtureParts/);
  assert.doesNotMatch(source, /assertSolverTraces/);
  assert.match(source, /Parts in this model/);
  assert.match(source, /selectedPartId=\{selectedPart\?\.id\}/);
  assert.match(source, /hoveredPartId=\{hoveredPart\?\.id\}/);
  assert.match(source, /disassembleOnHover=\{disassembleOnHover\}/);
  assert.match(source, /selectEnclosures=\{selectEnclosures\}/);
  assert.match(source, /nextSelectedPartId/);
  assert.match(source, /onHover=\{previewPart\}/);
  assert.match(source, /const \[disassembleOnHover, setDisassembleOnHover\] = useState\(false\)/);
  assert.match(source, /Disassemble on hover/);
  assert.match(source, /Hover preview is off; click a part to select and inspect it/);
  assert.match(source, /Select enclosures/);
  assert.match(source, /Automatic: click through enclosures to the parts inside/);
  assert.match(source, /Enclosures can be selected and inspected without separating the model/);
  assert.match(source, /Center &amp; reset model/);
  assert.match(source, /disabled=\{part\.isContainer === true && !selectEnclosures\}/);
  assert.match(source, /className=\{part\.id === selectedPart\?\.id \? "part-picker active" : "part-picker"\}/);
  assert.doesNotMatch(source, /Spread parts out/);
  assert.match(source, /function WorkshopTimeline/);
  assert.match(source, /timelineTrackRef/);
  assert.match(source, /scrollTo\(/);
  assert.match(source, /data-timeline-step=\{index\}/);
  assert.match(source, /timeline-step-title/);
  assert.match(css, /\.timeline-track > li/);
  assert.match(css, /inline-size: fit-content/);
  assert.doesNotMatch(css, /flex-basis: 8\.25rem/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /Mark complete and continue/);
  assert.match(source, /workshop-completion-action/);
  assert.doesNotMatch(source, /workshop-footer-navigation/);
  assert.match(source, /Full 3D build overview/);
  assert.match(source, /LEARNING PLAN/);
  assert.match(source, /See the whole build, then zoom into each action\./);
  assert.match(source, /learnerFriendlyText/);
  assert.match(source, /learnerPartName/);
  assert.match(source, /In plain language/);
  assert.match(source, /Why this matters/);
  assert.match(source, /Concepts to notice/);
  assert.match(source, /Need a deeper explanation\?/);
  assert.match(source, /Check the original source/);
  assert.match(source, /Before you begin/);
  assert.match(source, /When something does not work/);
  assert.match(source, /Fit check/);
  assert.match(source, /solveSelectedProposalParts/);
  assert.match(source, /role="alert"/);
});
