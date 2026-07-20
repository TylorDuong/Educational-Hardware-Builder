import { lazy, StrictMode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  BuildProposalSchema,
  DiscoveryProgressEventSchema,
  DiscoveryRequestSchema,
  WorkshopPromotionResponseSchema,
  RequestClassificationSchema,
  type BuildProposal,
  type DiscoveryProgressEvent,
  type PublicGuidedLesson,
  type RequestClassification,
} from "@educational-hardware-builder/schemas";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";
import {
  demoParts,
  demoSubstitution,
  runSolverRetryDemo,
  type SolverRetryDemo,
} from "./demo-flow.js";
import type { MechViewPart } from "./components/MechView.js";
import { matchedInventoryPartIds, parseOwnedParts, type OwnedPartInput } from "./owned-parts.js";
import { applicationSourcePolicies } from "./source-policies.js";
import { assertSolverTraces, solveSelectedProposalParts, solverTracedFixtureParts } from "./spatial-integration.js";

import "./sandbox.css";

const sessionId = "workshop-demo";
const discoveryUserId = "40000000-0000-4000-8000-000000000001";
const tabs = ["Dashboard", "Research", "Parts", "Build", "Workshop"] as const;
const LazyMechView = lazy(async () => ({ default: (await import("./components/MechView.js")).MechView }));

type Tab = typeof tabs[number];
type Progress = Omit<DiscoveryProgressEvent, "operationId">;
type DiscoveryView = { operationId: string; prompt: string; classification: RequestClassification; proposal: BuildProposal | null };
type SelectedWorkshop = { sessionId: string; buildId: string; lesson: PublicGuidedLesson };
type SkillReference = { title: string; sourceUrl: string; locator: string; relevance: string };

const boundaryPolicies = [
  ["DIRECT_CREDENTIALS", "BLOCK"],
  ["BROWSER_AUTOMATION", "BLOCK"],
  ["LIVE_VENDOR_LOOKUP", "INGEST_ONLY"],
  ["LOCAL_CITATIONS", "REQUIRED"],
] as const;

const symbolicMatingPreview = JSON.stringify({
  partA: "sensor",
  partB: "base",
  mate_type: "snap_fit",
}, null, 2);

const discoveryPipelineStages: readonly Progress[] = [
  { stage: "queued", message: "Queueing your discovery request", percent: 0 },
  { stage: "classifying", message: "Checking technical relevance and good-faith use", percent: 20 },
  { stage: "intent", message: "Interpreting your build goal", percent: 40 },
  { stage: "retrieving", message: "Retrieving local cited knowledge", percent: 65 },
  { stage: "catalog", message: "Validating the local proposal", percent: 85 },
  { stage: "ready", message: "Discovery proposal is ready", percent: 100 },
];

async function requestStep(stepId: string, selected?: Pick<SelectedWorkshop, "sessionId" | "buildId">): Promise<{ error?: string }> {
  const query = selected
    ? new URLSearchParams({ sessionId: selected.sessionId, buildId: selected.buildId })
    : new URLSearchParams({ sessionId });
  const response = await fetch(`/api/workshop/steps/${stepId}?${query.toString()}`);
  return response.ok ? {} : { error: (await response.json() as { error: string }).error };
}

function AppTabs({ active, hasStarted, onSelect }: { active: Tab; hasStarted: boolean; onSelect: (tab: Tab) => void }) {
  return <nav className="app-tabs" aria-label="Workshop sections" data-flow-ready={hasStarted ? "true" : "false"}>{tabs.map((tab) => <button key={tab} className={tab === active ? "tab active" : "tab"} aria-current={tab === active ? "page" : undefined} disabled={tab !== "Dashboard" && !hasStarted} onClick={() => onSelect(tab)}>[ {tab.toUpperCase()} ]</button>)}</nav>;
}

function Pipeline({ stages }: { stages: readonly Progress[] }) {
  return <ol className="pipeline terminal-log" aria-label="Discovery pipeline">{discoveryPipelineStages.map((definition) => {
    const stage = stages.find((entry) => entry.stage === definition.stage);
    const state = stage ? "done" : "pending";
    return <li key={definition.stage} className={state}><strong>&gt; {definition.stage}</strong><span>{stage?.message ?? definition.message}</span></li>;
  })}</ol>;
}

function ServerStatus() {
  return <section className="panel server-status" aria-label="Server status">
    <div className="panel-heading"><p className="eyebrow">SERVER_STATUS</p><span className="status-indicator">FIXTURE</span></div>
    <dl>
      <div><dt>API</dt><dd>READY</dd></div>
      <div><dt>POSTGRES / OLLAMA</dt><dd>OFFLINE (FIXTURE MODE ACTIVE)</dd></div>
      <div><dt>SPATIAL SOLVER</dt><dd>DETERMINISTIC</dd></div>
    </dl>
  </section>;
}

function DiscoverySummary({ discovery }: { discovery: DiscoveryView }) {
  const interpretedRequest = discovery.proposal?.intent.normalizedGoal ?? discovery.prompt;
  const { classification, proposal } = discovery;
  return <section className="discovery-summary">
    <p className="eyebrow">Interpreted request</p><h3>{interpretedRequest}</h3>
    <p><strong>Request outcome:</strong> {classification.outcome}</p>
    <p className="message">{classification.outcome === "approved" ? classification.reason : classification.message}</p>
    {proposal ? <><p className="eyebrow">Cited proposal</p><h3>{proposal.summary}</h3><p>{proposal.billOfMaterials.length} validated part {proposal.billOfMaterials.length === 1 ? "recommendation" : "recommendations"} with {proposal.freshness} source data.</p><ul className="source-list">{proposal.citations.map((citation) => <li key={`${citation.sourceUrl}:${citation.locator}`}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a><span>{citation.locator}</span></li>)}</ul></> : null}
  </section>;
}

function Dashboard({ prompt, ownedPartsText, progress, stages, discovery, error, isDiscovering, onPromptChange, onOwnedPartsChange, onStart, onOpenBuild }: {
  prompt: string;
  ownedPartsText: string;
  progress: Progress;
  stages: readonly Progress[];
  discovery?: DiscoveryView;
  error?: string;
  isDiscovering: boolean;
  onPromptChange: (value: string) => void;
  onOwnedPartsChange: (value: string) => void;
  onStart: () => void;
  onOpenBuild: () => void;
}) {
  const complete = progress.stage === "ready";
  const rejected = progress.stage === "rejected";
  return <section className="dashboard-view">
    <header className="page-heading"><p className="eyebrow">DASHBOARD / AGENTIC_BUILD_DISCOVERY</p><h2>DISCOVERY_CONSOLE</h2><p>Describe a hardware goal. Local fixtures, cited knowledge, and deterministic validation stay in the loop.</p></header>
    <div className="dashboard-grid">
      <section className="panel prompt-panel prompt-console">
        <div className="panel-heading"><p className="eyebrow">ENTER_DISCOVERY_REQUEST</p><span className="status-indicator">INPUT_READY</span></div>
        <label htmlFor="project-prompt">ENTER DISCOVERY REQUEST</label>
        <textarea id="project-prompt" value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder={'e.g., "Build a USB desk light"'} disabled={isDiscovering} />
        <label htmlFor="owned-parts">CURRENT PARTS (OPTIONAL)</label>
        <textarea id="owned-parts" value={ownedPartsText} onChange={(event) => onOwnedPartsChange(event.target.value)} placeholder="For example: ESP32 starter kit, BME280 sensor, breadboard and jumpers" disabled={isDiscovering} />
        <p className="helper">Enter one component or kit per line, or separate them with commas. Recognized parts are preferred in the build plan; every entry remains visible in Parts.</p>
        <button className="primary" onClick={onStart} disabled={isDiscovering || prompt.trim().length === 0}>{isDiscovering ? "DISCOVERY_IN_PROGRESS" : "DISCOVER_BUILD"}</button>
        <p className="helper">Requests use local catalog data and cited knowledge. Typed progress remains visible while discovery runs.</p>
      </section>
      <section className="panel discovery-log" aria-live="polite">
        <div className="panel-heading"><p className="eyebrow">DISCOVERY_LOG</p><span className="status-indicator">STREAM</span></div>
        <h3 className="typed-status">{progress.message}</h3>
        <Pipeline stages={stages} />
        {error ? <p className="message" role="alert">{error}</p> : rejected ? <p className="message" role="alert">This request was rejected before any parts or build steps were available.</p> : null}
        {discovery ? <DiscoverySummary discovery={discovery} /> : null}
        {complete && discovery?.proposal ? <button className="primary" onClick={onOpenBuild}>Review cited research</button> : <p className="helper">Watch the validated pipeline stages complete before moving to the plan.</p>}
      </section>
      <ServerStatus />
    </div>
  </section>;
}

function ResearchPanel({ discovery }: { discovery?: DiscoveryView }) {
  const proposal = discovery?.proposal;
  const citations = proposal?.citations ?? weatherStationGoldenSteps.slice(0, 3).flatMap((step) => step.lesson.citations);
  const title = proposal ? `Cited research for ${proposal.intent.normalizedGoal}` : "Cited guidance for the weather station";
  const description = proposal ? "These local sources support the current discovery proposal." : "The authored path uses the following sources; the lesson and build remain tied to them in fixture mode.";
  const offers = proposal?.billOfMaterials.flatMap((entry) => entry.offers) ?? [];
  return <section className="research-view">
    <header className="page-heading"><p className="eyebrow">RESEARCH / LOCAL_CORPUS</p><h2>CITED_KNOWLEDGE_BASE</h2><p>{description}</p></header>
    <div className="research-layout">
      <section className="research-content">
        <div className="research-context"><h3>{title}</h3>{proposal ? <section className="catalog-provenance"><h4>Catalog provenance</h4><p className={proposal.freshness === "stale" ? "freshness stale" : "freshness fresh"}>{proposal.freshness === "stale" ? "Some recommendations need a fresh offer or a verified inventory match." : "Catalog offers are currently cached and fresh."}</p>
          {offers.length > 0 ? <ul className="source-list compact-list">{offers.map((offer) => <li key={offer.externalId}><strong>{offer.provider} / {offer.providerSku}</strong><span>Observed {new Date(offer.observedAt).toLocaleDateString()} / {offer.availability.replaceAll("_", " ")}</span><a href={offer.sourceUrl} target="_blank" rel="noreferrer">Source record: {offer.citation.title}</a><span>{offer.citation.locator}</span></li>)}</ul> : <p className="helper">No current in-stock cached offer is shown here. The cited local sources remain available below.</p>}
        </section> : null}</div>
        <div className="research-card-grid">{citations.map((citation, index) => <article className="research-card" key={`${citation.sourceUrl}:${citation.locator}`}><span className="citation-code">SRC_{String(index + 1).padStart(2, "0")}</span><h3>{citation.title}</h3><p>Local cited material available to support the active learning path.</p><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.sourceUrl}</a><span className="locator">LOCATOR: {citation.locator}</span></article>)}</div>
      </section>
      <aside className="panel policy-panel"><p className="eyebrow">INGESTION_BOUNDARY_POLICY</p><h3>LOCAL FIRST</h3><dl>{boundaryPolicies.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="helper">{applicationSourcePolicies.length} source policies enforce cited records, cached links, and no credentialed checkout at runtime.</p></aside>
    </div>
  </section>;
}

function BuildPanel({ onOpenWorkshop, isStartingWorkshop }: { onOpenWorkshop: () => void; isStartingWorkshop: boolean }) {
  return <section className="build-view">
    <header className="page-heading"><p className="eyebrow">BUILD / VALIDATION_LAYER</p><h2>SPATIAL_SOLVER_RULES</h2><p>Assembly language stays symbolic until deterministic validation produces a permitted transform.</p></header>
    <div className="build-layout">
      <section className="panel build-plan"><p className="eyebrow">GENERATED_PLAN</p><h3>ESP32 weather station</h3><ol className="plan-list">{weatherStationGoldenSteps.map((step) => <li key={step.id}><strong>{String(step.order).padStart(2, "0")} / {step.title}</strong><span>{step.instruction}</span></li>)}</ol><button className="primary" onClick={onOpenWorkshop} disabled={isStartingWorkshop}>{isStartingWorkshop ? "OPENING_WORKSHOP" : "START_WORKSHOP"}</button></section>
      <section className="panel solver-console"><div className="panel-heading"><p className="eyebrow">DETERMINISTIC_DATA_FLOW</p><span className="status-indicator">GUARDED</span></div><div className="solver-flow" aria-label="Symbolic selection validation flow"><div className="solver-node">LLM<br />SYMBOLIC OUTPUT</div><span className="flow-arrow" aria-hidden="true">&gt;</span><div className="solver-node active">VALIDATION ADAPTER<br />OPENSCAD</div><span className="flow-arrow" aria-hidden="true">&gt;</span><div className="solver-node success">SOLVER<br />APPROVED</div></div><div className="solver-deny">RAW COORDINATE MATRICES: BLOCKED</div><pre aria-label="Example symbolic mating selection">{symbolicMatingPreview}</pre></section>
    </div>
  </section>;
}

function ReportedOwnedParts({ ownedParts }: { ownedParts: readonly OwnedPartInput[] }) {
  if (ownedParts.length === 0) return null;
  return <section className="panel"><p className="eyebrow">Your reported inventory</p><h2>Parts and kits you already own</h2><p className="helper">Recognized catalog parts are preferred when applicable. Other labels stay visible here until you verify their exact component.</p><ul className="part-list">{ownedParts.map((part) => <li key={part.label}><strong>{part.label}</strong><span>{part.matchedName ? `Matched to ${part.matchedName}; preferred in the plan when applicable.` : "Self-reported kit or component; not yet verified against the catalog."}</span><em>{part.matchedName ? "Recognized for planning" : "Needs verification"}</em></li>)}</ul></section>;
}

function ComponentBreakdown() {
  return <section className="parts-overview"><header className="page-heading"><p className="eyebrow">PARTS / LOCAL_CATALOG</p><h2>CACHED_INVENTORY_&amp;_SOURCING</h2><p>Inventory stays local. Offer details appear only after a cited cache record has been validated.</p></header><section className="panel inventory-table" role="table" aria-label="Cached inventory and sourcing"><div className="inventory-row inventory-header" role="row"><span role="columnheader">COMPONENT</span><span role="columnheader">LOCAL ROLE</span><span role="columnheader">CACHED SOURCE</span><span role="columnheader">REFRESH RULE</span></div>{demoParts.map((part) => <div className="inventory-row" role="row" key={part.name}><div className="inventory-component" role="cell"><div className="part-thumbnail" aria-hidden="true">{part.name.slice(0, 3).toUpperCase()}</div><span><strong>{part.name}</strong><small>{part.status}</small></span></div><span role="cell">{part.role}</span><span role="cell">{part.name === "ESP32 DevKit" ? "USD 9.99 cached" : "Awaiting cited cache"}</span><span className="ttl-tag" role="cell">TTL: LOCAL CACHE</span></div>)}</section></section>;
}

function OfferCard({ offer }: { offer: BuildProposal["billOfMaterials"][number]["offers"][number] }) {
  const price = offer.price !== undefined && offer.currency ? `${offer.currency} ${offer.price.toFixed(2)}` : "Price not captured";
  return <li className="offer-card">
    {offer.thumbnailDataUrl ? <img src={offer.thumbnailDataUrl} alt={`${offer.provider} listing thumbnail`} loading="lazy" /> : <div className="offer-placeholder" aria-hidden="true">NO IMAGE</div>}
    <div><strong>{offer.provider} / {offer.providerSku}</strong><span>{offer.availability.replaceAll("_", " ")} / {price}</span><span>Checked {new Date(offer.observedAt).toLocaleDateString()}</span><a href={offer.purchaseUrl} target="_blank" rel="noreferrer">View on {offer.provider}</a><a href={offer.sourceUrl} target="_blank" rel="noreferrer">View source provenance</a></div>
  </li>;
}

function PartsDetails({ discovery, onOpenWorkshop }: { discovery?: DiscoveryView; onOpenWorkshop: () => void }) {
  const proposal = discovery?.proposal;
  if (proposal) return <section className="parts-layout"><section className="panel"><p className="eyebrow">Parts and inventory</p><h2>Validated parts for this build</h2><ul className="part-list">{proposal.billOfMaterials.map((entry) => <li key={entry.part.id}><strong>{entry.part.name} × {entry.quantity}</strong><span>{entry.rationale}</span><em className={entry.freshness === "stale" ? "freshness stale" : "freshness fresh"}>{entry.freshness === "stale" ? "Stale or unavailable offer data" : "Fresh cached offer data"}</em>
    {entry.inventoryMatch ? <p><strong>Verified inventory:</strong> {entry.inventoryMatch.quantity} on hand{entry.inventoryMatch.rawLabel ? ` (${entry.inventoryMatch.rawLabel})` : ""}.</p> : <p className="inventory-gap"><strong>Inventory gap:</strong> No verified item is recorded; choose a current cached offer or compatible alternative.</p>}
    <section className="part-detail"><h3>Cached source options</h3>{entry.offers.length > 0 ? <ul className="source-list offer-list">{entry.offers.map((offer) => <OfferCard key={offer.externalId} offer={offer} />)}</ul> : <p className="helper">No fresh in-stock cached offer. Use verified inventory or review an alternative below.</p>}</section>
    <details className="part-detail alternatives"><summary>Suggested alternate parts ({entry.alternatives.length})</summary>{entry.alternatives.length > 0 ? <ul className="source-list">{entry.alternatives.map((alternative) => <li key={alternative.id}><strong>{alternative.name}</strong><span>{alternative.category}</span>{alternative.datasheetUrl ? <a href={alternative.datasheetUrl} target="_blank" rel="noreferrer">View compatible-part source</a> : null}</li>)}</ul> : <p className="helper">No locally validated alternatives are available for this part.</p>}</details>
  </li>)}</ul></section><section className="panel substitution"><p className="eyebrow">Sourcing decision</p><h2>Use cited local choices</h2><p>Only verified inventory, cached offers, and compatibility records are shown. Checkout and live shop calls stay outside this workshop.</p><button className="primary" onClick={onOpenWorkshop}>Review the build plan</button></section></section>;
  return <section className="parts-layout"><section className="panel"><p className="eyebrow">Parts and inventory</p><h2>Available for this build</h2><ul className="part-list">{demoParts.map((part) => <li key={part.name}><strong>{part.name}</strong><span>{part.role}</span><em>{part.status}</em></li>)}</ul></section><section className="panel substitution"><p className="eyebrow">Substitution decision</p><h2>{demoSubstitution.selected}</h2><p><strong>Instead of:</strong> {demoSubstitution.requested}</p><p>{demoSubstitution.justification}</p><button className="primary" onClick={onOpenWorkshop}>Review the build plan</button></section></section>;
}

function PartsPanel({ discovery, ownedParts, onOpenWorkshop }: { discovery?: DiscoveryView; ownedParts: readonly OwnedPartInput[]; onOpenWorkshop: () => void }) {
  return <><ReportedOwnedParts ownedParts={ownedParts} /><ComponentBreakdown /><PartsDetails discovery={discovery} onOpenWorkshop={onOpenWorkshop} /></>;
}

function SkillReferenceList({ skills, onOpen }: { skills: readonly SkillReference[]; onOpen: (skill: SkillReference) => void }) {
  return <section className="part-detail skill-references"><h3>Skills to review</h3>{skills.length > 0 ? <ul className="source-list">{skills.map((skill) => <li key={`${skill.sourceUrl}:${skill.locator}`}><button type="button" className="skill-reference" onClick={() => onOpen(skill)}><strong>{skill.title}</strong><span>{skill.relevance} / {skill.locator}</span><small>OPEN_REFERENCE</small></button></li>)}</ul> : <p className="helper">No separate skill material is required for this fixture step.</p>}</section>;
}

function SkillReferenceModal({ skill, onClose }: { skill?: SkillReference; onClose: () => void }) {
  if (!skill) return null;
  return <div className="skill-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="skill-modal" role="dialog" aria-modal="true" aria-labelledby="skill-reference-title" onMouseDown={(event) => event.stopPropagation()}><div className="panel-heading"><p className="eyebrow">SKILL_REFERENCE</p><button type="button" className="icon-button" aria-label="Close skill reference" onClick={onClose}>CLOSE</button></div><h2 id="skill-reference-title">{skill.title}</h2><p>{skill.relevance}</p><dl><div><dt>LOCATOR</dt><dd>{skill.locator}</dd></div><div><dt>SOURCE</dt><dd><a href={skill.sourceUrl} target="_blank" rel="noreferrer">OPEN_CITED_SOURCE</a></dd></div></dl></section></div>;
}

function InteractiveAssemblyViewer({ parts, heading, stepOrder, explodeFactor, onExplode }: { parts: readonly MechViewPart[]; heading: string; stepOrder: number; explodeFactor: number; onExplode: (value: number) => void }) {
  const [selectedPartId, setSelectedPartId] = useState(() => parts[0]?.id ?? "");
  const selectedPart = parts.find((part) => part.id === selectedPartId) ?? parts[0];
  if (!selectedPart) return <section className="viewer panel"><h2>{heading}</h2><p className="helper">No validated assembly parts are available for this step.</p></section>;

  return <section className="viewer panel"><h2>{heading}</h2><label className="explode-control" htmlFor="assembly-explode-view">Exploded view <input id="assembly-explode-view" type="range" min="0" max="1" step="0.05" value={explodeFactor} onChange={(event) => onExplode(Number(event.target.value))} /></label><div className="canvas"><Suspense fallback={<p>Loading the 3D fixture…</p>}><LazyMechView parts={[...parts]} highlightIds={[selectedPart.id]} explodeFactor={explodeFactor} cameraTarget={selectedPart.transform.positionMm} onSelect={setSelectedPartId} /></Suspense></div>
    <section className="part-detail" aria-live="polite"><p className="eyebrow">Selected part</p><h3>{selectedPart.name}</h3><p>{selectedPart.purpose}</p></section>
    <section className="part-detail"><h3>All assembly parts ({parts.length})</h3><ul className="part-list">{parts.map((part) => <li key={part.id}><button className={part.id === selectedPart.id ? "step active" : "step"} aria-pressed={part.id === selectedPart.id} onClick={() => setSelectedPartId(part.id)}><strong>{part.name}</strong><span>{part.purpose}</span></button></li>)}</ul></section>
    <p>Deterministic solver transform synchronized to step {stepOrder}.</p>
  </section>;
}

function WorkshopPanel({ activeIndex, complete, message, retryDemo, explodeFactor, onMove, onRetry, onComplete, onExplode, onOpenSkill }: {
  activeIndex: number;
  complete: boolean;
  message: string;
  retryDemo?: SolverRetryDemo;
  explodeFactor: number;
  onMove: (index: number) => void;
  onRetry: () => void;
  onComplete: () => void;
  onExplode: (value: number) => void;
  onOpenSkill: (skill: SkillReference) => void;
}) {
  const step = weatherStationGoldenSteps[activeIndex]!;
  const mechViewParts: MechViewPart[] = useMemo(() => {
    const parts = solverTracedFixtureParts(step.id);
    assertSolverTraces(parts);
    return parts;
  }, [step.id]);

  if (complete) return <section className="completion panel"><p className="eyebrow">Build complete</p><h2>Your weather station is ready for its final inspection.</h2><p>You completed a cited, self-directed path and used deterministic spatial validation for the 3D assembly.</p><button className="primary" onClick={() => onMove(0)}>Review the first step</button></section>;

  return <section className="workshop-view"><header className="page-heading"><p className="eyebrow">WORKSHOP / LIVE_ASSEMBLY</p><h2>INTERACTIVE_3D_SANDBOX</h2><p>Inspect solver-owned assembly state while every cited lesson step remains directly reachable.</p></header><div className="workshop-layout">
    <aside className="steps panel"><h2>Build steps</h2>{weatherStationGoldenSteps.map((item, index) => <button key={item.id} className={index === activeIndex ? "step active" : "step"} onClick={() => onMove(index)}><span>{item.order}</span>{item.title}</button>)}</aside>
    <section className="lesson panel"><p className="eyebrow">Step {step.order}</p><h2>{step.title}</h2><p className="instruction">{step.instruction}</p><h3>{step.lesson.title}</h3><p>{step.lesson.content}</p><ul>{step.lesson.citations.map((citation) => <li key={citation.sourceUrl}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul>
      <SkillReferenceList skills={step.skills} onOpen={onOpenSkill} />
      {step.order === 8 ? <section className="retry"><h3>Assembly retry beat</h3><p>The assembly agent proposes symbolic features; the deterministic solver either rejects them with a reason or returns a transform.</p><button onClick={onRetry}>Show symbolic retry</button>{retryDemo?.ok ? <div className="retry-result"><p><strong>Solver rejection:</strong> {retryDemo.firstAttempt}</p><p><strong>Corrected retry:</strong> {retryDemo.retry}</p></div> : retryDemo ? <p className="message">{retryDemo.message}</p> : null}</section> : null}
      <p className="message" aria-live="polite">{message}</p><div className="pagination"><button disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)}>Previous</button><button disabled={activeIndex === weatherStationGoldenSteps.length - 1} onClick={() => onMove(activeIndex + 1)}>Next</button>{activeIndex === weatherStationGoldenSteps.length - 1 ? <button className="primary" onClick={onComplete}>Complete build</button> : null}</div>
    </section>
    <InteractiveAssemblyViewer parts={mechViewParts} heading="3D Mech View" stepOrder={step.order} explodeFactor={explodeFactor} onExplode={onExplode} />
  </div></section>;
}

function SelectedWorkshopPanel({ workshop, activeIndex, complete, message, onMove, onComplete, onOpenSkill }: {
  workshop: SelectedWorkshop;
  activeIndex: number;
  complete: boolean;
  message: string;
  onMove: (index: number) => void;
  onComplete: () => void;
  onOpenSkill: (skill: SkillReference) => void;
}) {
  const step = workshop.lesson.steps[activeIndex]!;
  const solverResult = useMemo(() => solveSelectedProposalParts(workshop.lesson), [workshop.lesson]);
  const mechViewParts: MechViewPart[] = useMemo(() => {
    const parts = solverTracedFixtureParts(step.id);
    assertSolverTraces(parts);
    return parts;
  }, [step.id]);
  const [explodeFactor, setExplodeFactor] = useState(0);

  if (complete) return <section className="completion panel"><p className="eyebrow">Build complete</p><h2>{workshop.lesson.title}</h2><p>You completed the cited, self-directed selected proposal.</p><button className="primary" onClick={() => onMove(0)}>Review the first step</button></section>;

  return <section className="workshop-view"><header className="page-heading"><p className="eyebrow">WORKSHOP / SELECTED_LESSON</p><h2>INTERACTIVE_3D_SANDBOX</h2><p>Every cited step remains available in any order. The 3D view renders solver-owned assembly state.</p></header><div className="workshop-layout">
    <aside className="steps panel"><h2>Build steps</h2>{workshop.lesson.steps.map((item, index) => <button key={item.id} className={index === activeIndex ? "step active" : "step"} onClick={() => onMove(index)}><span>{item.order}</span>{item.title}</button>)}</aside>
    <section className="lesson panel"><p className="eyebrow">Selected lesson · Step {step.order}</p><h2>{step.title}</h2><section className="checkpoint"><h3>Safety first</h3><p>{step.safetyCallout}</p></section><p className="instruction">{step.instruction}</p><p><strong>Complete when:</strong> {step.completionCondition}</p><h3>Citations</h3><ul>{step.citations.map((citation) => <li key={`${citation.sourceUrl}:${citation.locator}`}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul>
      <SkillReferenceList skills={step.skills} onOpen={onOpenSkill} />
      {workshop.lesson.troubleshooting.length > 0 ? <section className="retry"><h3>Troubleshooting</h3>{workshop.lesson.troubleshooting.map((item) => <article key={item.problem}><p><strong>{item.problem}</strong></p><p>{item.explanation}</p><ul>{item.citations.map((citation) => <li key={`${citation.sourceUrl}:${citation.locator}`}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul></article>)}</section> : null}
      <p className="message" aria-live="polite">{message}</p><div className="pagination"><button disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)}>Previous</button><button disabled={activeIndex === workshop.lesson.steps.length - 1} onClick={() => onMove(activeIndex + 1)}>Next</button>{activeIndex === workshop.lesson.steps.length - 1 ? <button className="primary" onClick={onComplete}>Complete build</button> : null}</div>
    </section>
    <div className="assembly-stack"><InteractiveAssemblyViewer parts={mechViewParts} heading="3D Assembly View" stepOrder={step.order} explodeFactor={explodeFactor} onExplode={setExplodeFactor} /><section className="viewer panel"><h2>Deterministic assembly</h2>{solverResult.ok ? <><p>{solverResult.message}</p><ul className="source-list">{solverResult.traces.map((trace) => <li key={`${trace.transform.stepId}:${trace.selection.movingPartId}:${trace.selection.targetPartId}`}><strong>Step {trace.transform.stepId}</strong><span>Approved symbolic mate validated by the deterministic solver.</span></li>)}</ul></> : <section className="retry" role="alert"><h3>Symbolic mate needs correction</h3><p>{solverResult.rejection.message}</p><p>{solverResult.rejection.retryInstruction}</p></section>}</section></div>
  </div></section>;
}

function Workshop() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [message, setMessage] = useState("Start with a project prompt to begin the guided build.");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [ownedPartsText, setOwnedPartsText] = useState("");
  const [progress, setProgress] = useState<Progress>({ stage: "queued", message: "Waiting to start", percent: 0 });
  const [pipelineStages, setPipelineStages] = useState<Progress[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryView>();
  const [discoveryError, setDiscoveryError] = useState<string>();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [retryDemo, setRetryDemo] = useState<SolverRetryDemo>();
  const [selectedWorkshop, setSelectedWorkshop] = useState<SelectedWorkshop>();
  const [selectedSkill, setSelectedSkill] = useState<SkillReference>();
  const [isStartingWorkshop, setIsStartingWorkshop] = useState(false);
  const eventSource = useRef<EventSource | undefined>(undefined);
  const ownedParts = useMemo(() => parseOwnedParts(ownedPartsText), [ownedPartsText]);
  const ownedInventoryPartIds = useMemo(() => matchedInventoryPartIds(ownedParts), [ownedParts]);

  useEffect(() => () => eventSource.current?.close(), []);

  async function startDiscovery() {
    eventSource.current?.close();
    setHasStarted(false);
    setComplete(false);
    setActiveIndex(0);
    setRetryDemo(undefined);
    setDiscovery(undefined);
    setSelectedWorkshop(undefined);
    setSelectedSkill(undefined);
    setDiscoveryError(undefined);
    setIsDiscovering(true);
    setMessage("Checking the discovery request.");
    setProgress({ stage: "queued", message: "Queueing your discovery request", percent: 0 });
    setPipelineStages([]);
    try {
      const request = DiscoveryRequestSchema.parse({
        prompt: projectPrompt,
        mode: "beginner",
        userId: discoveryUserId,
        inventoryPartIds: ownedInventoryPartIds,
        constraints: ["local catalog only"],
      });
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = await response.json() as { operationId?: unknown; error?: unknown };
      if (!response.ok || typeof payload.operationId !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Discovery could not be started.");
      }
      const stream = new EventSource(`/api/discovery/${payload.operationId}/events`);
      eventSource.current = stream;
      stream.addEventListener("progress", (event) => {
        try {
          const update = DiscoveryProgressEventSchema.parse(JSON.parse((event as MessageEvent<string>).data));
          const { operationId: _operationId, ...nextProgress } = update;
          setProgress(nextProgress);
          setPipelineStages((previous) => previous.some((item) => item.stage === nextProgress.stage) ? previous : [...previous, nextProgress]);
          if (nextProgress.stage === "ready") {
            stream.close();
            void loadDiscoveryResult(payload.operationId);
          }
          if (nextProgress.stage === "rejected") {
            stream.close();
            void loadDiscoveryResult(payload.operationId);
          }
          if (nextProgress.stage === "error") {
            setIsDiscovering(false);
            setDiscoveryError(nextProgress.message);
            setMessage(nextProgress.message);
            stream.close();
          }
        } catch {
          setIsDiscovering(false);
          setDiscoveryError("Discovery returned an invalid progress update.");
          setProgress({ stage: "error", message: "Discovery returned an invalid progress update.", percent: 100 });
          stream.close();
        }
      });
      stream.onerror = () => {
        stream.close();
        setIsDiscovering(false);
        setDiscoveryError("The discovery progress stream stopped before completion.");
        setProgress({ stage: "error", message: "The discovery progress stream stopped before completion.", percent: 100 });
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Discovery could not be started.";
      setIsDiscovering(false);
      setDiscoveryError(message);
      setProgress({ stage: "error", message, percent: 100 });
    }
  }

  async function loadDiscoveryResult(operationId: string) {
    try {
      const response = await fetch(`/api/discovery/${operationId}`);
      const payload = await response.json() as { status?: unknown; classification?: unknown; proposal?: unknown; error?: unknown };
      if (!response.ok || (payload.status !== "ready" && payload.status !== "rejected")) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Discovery status could not be loaded.");
      }
      const classification = RequestClassificationSchema.parse(payload.classification);
      const proposal = payload.proposal === null ? null : BuildProposalSchema.parse(payload.proposal);
      setDiscovery({ operationId, prompt: projectPrompt, classification, proposal });
      setIsDiscovering(false);
      if (classification.outcome === "approved" && proposal) {
        setHasStarted(true);
        setMessage("Your cited build proposal is ready to review.");
      } else {
        setHasStarted(false);
        setDiscoveryError(classification.message);
        setMessage(classification.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Discovery status could not be loaded.";
      setIsDiscovering(false);
      setDiscoveryError(message);
      setProgress({ stage: "error", message, percent: 100 });
    }
  }

  async function moveTo(index: number) {
    if (!hasStarted) {
      setActiveTab("Dashboard");
      setMessage("Generate the guided plan before opening workshop steps.");
      return;
    }
    const target = weatherStationGoldenSteps[index];
    if (!target) return;
    const result = await requestStep(target.id);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setActiveIndex(index);
    setRetryDemo(undefined);
    setMessage(`Step ${target.order} is ready.`);
  }

  async function startSelectedWorkshop() {
    setActiveTab("Workshop");
    if (!discovery?.proposal) {
      return;
    }
    if (selectedWorkshop) {
      return;
    }
    setIsStartingWorkshop(true);
    setMessage("Opening your selected cited lesson.");
    try {
      const response = await fetch(`/api/discovery/${discovery.operationId}/select`, { method: "POST" });
      const payload = WorkshopPromotionResponseSchema.parse(await response.json());
      setSelectedWorkshop(payload);
      setActiveIndex(0);
      setComplete(false);
      setMessage("Your selected cited lesson is ready. Every step is available in any order.");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "The selected lesson could not be started.";
      setMessage(nextMessage);
      setDiscoveryError(nextMessage);
    } finally {
      setIsStartingWorkshop(false);
    }
  }

  async function moveSelectedTo(index: number) {
    const workshop = selectedWorkshop;
    const target = workshop?.lesson.steps[index];
    if (!workshop || !target) return;
    const result = await requestStep(target.id, workshop);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setActiveIndex(index);
    setMessage(`Step ${target.order} is ready.`);
  }

  const content = activeTab === "Dashboard" ? <Dashboard prompt={projectPrompt} ownedPartsText={ownedPartsText} progress={progress} stages={pipelineStages} discovery={discovery} error={discoveryError} isDiscovering={isDiscovering} onPromptChange={setProjectPrompt} onOwnedPartsChange={setOwnedPartsText} onStart={() => void startDiscovery()} onOpenBuild={() => setActiveTab("Research")} />
    : activeTab === "Research" ? <><ResearchPanel discovery={discovery} /><section className="panel"><button className="primary" onClick={() => setActiveTab("Parts")}>Review parts and inventory</button></section></>
      : activeTab === "Build" ? <BuildPanel onOpenWorkshop={() => void startSelectedWorkshop()} isStartingWorkshop={isStartingWorkshop} />
        : activeTab === "Parts" ? <PartsPanel discovery={discovery} ownedParts={ownedParts} onOpenWorkshop={() => setActiveTab("Build")} />
          : isStartingWorkshop
            ? <section className="completion panel"><p className="eyebrow">Workshop</p><h2>Opening your cited lesson...</h2><p>{message}</p></section>
            : selectedWorkshop
            ? <SelectedWorkshopPanel workshop={selectedWorkshop} activeIndex={activeIndex} complete={complete} message={message} onMove={(index) => void moveSelectedTo(index)} onComplete={() => setComplete(true)} onOpenSkill={setSelectedSkill} />
            : <WorkshopPanel activeIndex={activeIndex} complete={complete} message={message} retryDemo={retryDemo} explodeFactor={explodeFactor} onMove={(index) => void moveTo(index)} onRetry={() => setRetryDemo(runSolverRetryDemo())} onComplete={() => setComplete(true)} onExplode={setExplodeFactor} onOpenSkill={setSelectedSkill} />;

  return <main className="app-shell">
    <header className="hero"><div><p className="eyebrow">LOCAL_FIRST / GUIDED_WORKSHOP</p><h1><span className="title-name">EDUCATIONAL_<wbr />HARDWARE_<wbr />BUILDER</span><span className="title-mode"><i aria-hidden="true">|</i> DEMO_SAFE_MODE: ON</span></h1><p>Technical learning paths with cited research, cached sourcing, and deterministic spatial validation.</p></div><output className="system-output" aria-live="polite"><strong>{progress.stage}</strong><span>{progress.message}</span>{progress.percent !== undefined ? <small>{progress.percent}%</small> : null}</output></header>
    <AppTabs active={activeTab} hasStarted={hasStarted} onSelect={setActiveTab} />
    {content}
    <SkillReferenceModal skill={selectedSkill} onClose={() => setSelectedSkill(undefined)} />
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workshop /></StrictMode>);
