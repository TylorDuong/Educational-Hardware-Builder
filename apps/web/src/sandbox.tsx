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
import { assertSolverTraces, solveSelectedProposalParts, solverTracedFixtureParts } from "./spatial-integration.js";

import "./sandbox.css";

const sessionId = "workshop-demo";
const discoveryUserId = "40000000-0000-4000-8000-000000000001";
const discoveryInventoryPartIds = ["7e893f29-068e-43e2-9c3c-b9ba2d9ed6db"];
const tabs = ["Dashboard", "Research", "Parts", "Build", "Workshop"] as const;
const LazyMechView = lazy(async () => ({ default: (await import("./components/MechView.js")).MechView }));

type Tab = typeof tabs[number];
type Progress = Omit<DiscoveryProgressEvent, "operationId">;
type DiscoveryView = { operationId: string; prompt: string; classification: RequestClassification; proposal: BuildProposal | null };
type SelectedWorkshop = { sessionId: string; buildId: string; lesson: PublicGuidedLesson };

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
  return <nav aria-label="Workshop sections">{tabs.map((tab) => <button key={tab} className={tab === active ? "tab active" : "tab"} disabled={tab !== "Dashboard" && !hasStarted} onClick={() => onSelect(tab)}>{tab}</button>)}</nav>;
}

function Pipeline({ stages }: { stages: readonly Progress[] }) {
  return <ol className="pipeline" aria-label="Discovery pipeline">{discoveryPipelineStages.map((definition) => {
    const stage = stages.find((entry) => entry.stage === definition.stage);
    const state = stage ? "done" : "pending";
    return <li key={definition.stage} className={state}><strong>{definition.stage}</strong><span>{stage?.message ?? definition.message}</span></li>;
  })}</ol>;
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

function Dashboard({ prompt, progress, stages, discovery, error, isDiscovering, onPromptChange, onStart, onOpenBuild }: {
  prompt: string;
  progress: Progress;
  stages: readonly Progress[];
  discovery?: DiscoveryView;
  error?: string;
  isDiscovering: boolean;
  onPromptChange: (value: string) => void;
  onStart: () => void;
  onOpenBuild: () => void;
}) {
  const complete = progress.stage === "ready";
  const rejected = progress.stage === "rejected";
  return <section className="dashboard-grid">
    <section className="panel prompt-panel">
      <p className="eyebrow">1. Describe a build</p><h2>What would you like to build?</h2>
      <label htmlFor="project-prompt">Project prompt</label>
      <textarea id="project-prompt" value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder="For example: I want a beginner USB desk light using parts I already own." disabled={isDiscovering} />
      <button className="primary" onClick={onStart} disabled={isDiscovering || prompt.trim().length === 0}>{isDiscovering ? "Checking your request…" : "Discover a safe build"}</button>
      <p className="helper">Requests use only local catalog and cited knowledge. Beginner safety blocks happen before any proposal is shown.</p>
    </section>
    <section className="panel" aria-live="polite">
      <p className="eyebrow">2. Pipeline status</p><h2>{progress.message}</h2>
      <Pipeline stages={stages} />
      {error ? <p className="message" role="alert">{error}</p> : rejected ? <p className="message" role="alert">This request was rejected before any parts or build steps were available.</p> : null}
      {discovery ? <DiscoverySummary discovery={discovery} /> : null}
      {complete && discovery?.proposal ? <button className="primary" onClick={onOpenBuild}>Review the build plan</button> : <p className="helper">Watch the validated pipeline stages complete before moving to the plan.</p>}
    </section>
  </section>;
}

function ResearchPanel({ discovery }: { discovery?: DiscoveryView }) {
  const proposal = discovery?.proposal;
  const citations = proposal?.citations ?? weatherStationGoldenSteps.slice(0, 3).flatMap((step) => step.lesson.citations);
  const title = proposal ? `Cited research for ${proposal.intent.normalizedGoal}` : "Cited guidance for the weather station";
  const description = proposal ? "These local sources support the current discovery proposal." : "The authored path uses the following sources; the lesson and build remain tied to them in fixture mode.";
  const offers = proposal?.billOfMaterials.flatMap((entry) => entry.offers) ?? [];
  return <section className="panel"><p className="eyebrow">Grounded research</p><h2>{title}</h2><p>{description}</p>
    {proposal ? <section className="catalog-provenance"><h3>Catalog provenance</h3><p className={proposal.freshness === "stale" ? "freshness stale" : "freshness fresh"}>{proposal.freshness === "stale" ? "Some recommendations need a fresh offer or a verified inventory match." : "Catalog offers are currently cached and fresh."}</p>
      {offers.length > 0 ? <ul className="source-list">{offers.map((offer) => <li key={offer.externalId}><strong>{offer.provider} · {offer.providerSku}</strong><span>Observed {new Date(offer.observedAt).toLocaleDateString()} · {offer.availability.replaceAll("_", " ")}</span><a href={offer.sourceUrl} target="_blank" rel="noreferrer">Source record: {offer.citation.title}</a><span>{offer.citation.locator}</span></li>)}</ul> : <p className="helper">No current in-stock cached offer is shown here. The cited local sources remain available below.</p>}
    </section> : null}
    <ul className="source-list">{citations.map((citation) => <li key={`${citation.sourceUrl}:${citation.locator}`}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a><span>{citation.locator}</span></li>)}</ul>
  </section>;
}

function BuildPanel({ onOpenWorkshop, isStartingWorkshop }: { onOpenWorkshop: () => void; isStartingWorkshop: boolean }) {
  return <section className="panel"><p className="eyebrow">Generated plan</p><h2>ESP32 weather station</h2><ol className="plan-list">{weatherStationGoldenSteps.map((step) => <li key={step.id}><strong>{step.order}. {step.title}</strong><span>{step.instruction}</span></li>)}</ol><button className="primary" onClick={onOpenWorkshop} disabled={isStartingWorkshop}>{isStartingWorkshop ? "Opening the Workshop..." : "Start the guided workshop"}</button></section>;
}

function ComponentBreakdown() {
  return <section className="panel"><p className="eyebrow">Workshop components</p><h2>Individual parts breakdown</h2><p className="helper">These components are used across the weather-station steps. A current, cited shop link appears beside a part only when it exists in the local catalog.</p><ul className="part-list">{demoParts.map((part) => <li key={part.name}><strong>{part.name}</strong><span>{part.role}</span><em>{part.status}</em></li>)}</ul></section>;
}

function PartsDetails({ discovery, onOpenWorkshop }: { discovery?: DiscoveryView; onOpenWorkshop: () => void }) {
  const proposal = discovery?.proposal;
  if (proposal) return <section className="parts-layout"><section className="panel"><p className="eyebrow">Parts and inventory</p><h2>Validated parts for this build</h2><ul className="part-list">{proposal.billOfMaterials.map((entry) => <li key={entry.part.id}><strong>{entry.part.name} × {entry.quantity}</strong><span>{entry.rationale}</span><em className={entry.freshness === "stale" ? "freshness stale" : "freshness fresh"}>{entry.freshness === "stale" ? "Stale or unavailable offer data" : "Fresh cached offer data"}</em>
    {entry.inventoryMatch ? <p><strong>Verified inventory:</strong> {entry.inventoryMatch.quantity} on hand{entry.inventoryMatch.rawLabel ? ` (${entry.inventoryMatch.rawLabel})` : ""}.</p> : <p className="inventory-gap"><strong>Inventory gap:</strong> No verified item is recorded; choose a current cached offer or compatible alternative.</p>}
    <section className="part-detail"><h3>Cached source options</h3>{entry.offers.length > 0 ? <ul className="source-list">{entry.offers.map((offer) => <li key={offer.externalId}><strong>{offer.provider} · {offer.providerSku}</strong><span>{offer.availability.replaceAll("_", " ")} · {offer.price !== undefined && offer.currency ? `${offer.currency} ${offer.price.toFixed(2)}` : "Price not captured"} · observed {new Date(offer.observedAt).toLocaleDateString()}</span><a href={offer.purchaseUrl} target="_blank" rel="noreferrer">Open cached shop link</a><a href={offer.sourceUrl} target="_blank" rel="noreferrer">View source provenance</a></li>)}</ul> : <p className="helper">No fresh in-stock cached offer. Use verified inventory or review an alternative below.</p>}</section>
    <section className="part-detail"><h3>Compatible alternatives</h3>{entry.alternatives.length > 0 ? <ul className="source-list">{entry.alternatives.map((alternative) => <li key={alternative.id}><strong>{alternative.name}</strong><span>{alternative.category}</span>{alternative.datasheetUrl ? <a href={alternative.datasheetUrl} target="_blank" rel="noreferrer">View compatible-part source</a> : null}</li>)}</ul> : <p className="helper">No locally validated alternatives are available for this part.</p>}</section>
  </li>)}</ul></section><section className="panel substitution"><p className="eyebrow">Sourcing decision</p><h2>Use cited local choices</h2><p>Only verified inventory, cached offers, and compatibility records are shown. Checkout and live shop calls stay outside this workshop.</p><button className="primary" onClick={onOpenWorkshop}>Continue to the workshop</button></section></section>;
  return <section className="parts-layout"><section className="panel"><p className="eyebrow">Parts and inventory</p><h2>Available for this build</h2><ul className="part-list">{demoParts.map((part) => <li key={part.name}><strong>{part.name}</strong><span>{part.role}</span><em>{part.status}</em></li>)}</ul></section><section className="panel substitution"><p className="eyebrow">Substitution decision</p><h2>{demoSubstitution.selected}</h2><p><strong>Instead of:</strong> {demoSubstitution.requested}</p><p>{demoSubstitution.justification}</p><button className="primary" onClick={onOpenWorkshop}>Continue to the workshop</button></section></section>;
}

function PartsPanel({ discovery, onOpenWorkshop }: { discovery?: DiscoveryView; onOpenWorkshop: () => void }) {
  return <><ComponentBreakdown /><PartsDetails discovery={discovery} onOpenWorkshop={onOpenWorkshop} /></>;
}

function WorkshopPanel({ activeIndex, complete, message, retryDemo, explodeFactor, onMove, onRetry, onComplete, onExplode }: {
  activeIndex: number;
  complete: boolean;
  message: string;
  retryDemo?: SolverRetryDemo;
  explodeFactor: number;
  onMove: (index: number) => void;
  onAnswer: (answer: string) => void;
  onRetry: () => void;
  onComplete: () => void;
  onExplode: (value: number) => void;
}) {
  const step = weatherStationGoldenSteps[activeIndex]!;
  const mechViewParts: MechViewPart[] = useMemo(() => {
    const parts = solverTracedFixtureParts(step.id);
    assertSolverTraces(parts);
    return parts;
  }, [step.id]);
  const highlightedPart = mechViewParts[activeIndex % mechViewParts.length]!;
  const cameraTarget = useMemo(() => highlightedPart.transform.positionMm, [highlightedPart]);

  if (complete) return <section className="completion panel"><p className="eyebrow">Build complete</p><h2>Your weather station is ready for its final inspection.</h2><p>You completed a cited, self-directed path and used deterministic spatial validation for the 3D assembly.</p><button className="primary" onClick={() => onMove(0)}>Review the first step</button></section>;

  return <section className="workshop-layout">
    <aside className="steps panel"><h2>Build steps</h2>{weatherStationGoldenSteps.map((item, index) => <button key={item.id} className={index === activeIndex ? "step active" : "step"} onClick={() => onMove(index)}><span>{item.order}</span>{item.title}</button>)}</aside>
    <section className="lesson panel"><p className="eyebrow">Step {step.order}</p><h2>{step.title}</h2><p className="instruction">{step.instruction}</p><h3>{step.lesson.title}</h3><p>{step.lesson.content}</p><ul>{step.lesson.citations.map((citation) => <li key={citation.sourceUrl}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul>
      <section className="part-detail"><h3>Skills to review</h3>{step.skills.length > 0 ? <ul className="source-list">{step.skills.map((skill) => <li key={`${skill.sourceUrl}:${skill.locator}`}><a href={skill.sourceUrl} target="_blank" rel="noreferrer">{skill.title}</a><span>{skill.relevance} · {skill.locator}</span></li>)}</ul> : <p className="helper">No separate skill material is required for this fixture step.</p>}</section>
      {step.order === 8 ? <section className="retry"><h3>Assembly retry beat</h3><p>The assembly agent proposes symbolic features; the deterministic solver either rejects them with a reason or returns a transform.</p><button onClick={onRetry}>Show symbolic retry</button>{retryDemo?.ok ? <div className="retry-result"><p><strong>Solver rejection:</strong> {retryDemo.firstAttempt}</p><p><strong>Corrected retry:</strong> {retryDemo.retry}</p></div> : retryDemo ? <p className="message">{retryDemo.message}</p> : null}</section> : null}
      <p className="message" aria-live="polite">{message}</p><div className="pagination"><button disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)}>Previous</button><button disabled={activeIndex === weatherStationGoldenSteps.length - 1} onClick={() => onMove(activeIndex + 1)}>Next</button>{activeIndex === weatherStationGoldenSteps.length - 1 ? <button className="primary" onClick={onComplete}>Complete build</button> : null}</div>
    </section>
    <section className="viewer panel"><h2>3D Mech View</h2><label className="explode-control" htmlFor="explode-view">Exploded view <input id="explode-view" type="range" min="0" max="1" step="0.05" value={explodeFactor} onChange={(event) => onExplode(Number(event.target.value))} /></label><div className="canvas"><Suspense fallback={<p>Loading the 3D fixture…</p>}><LazyMechView parts={mechViewParts} highlightIds={[highlightedPart.id]} explodeFactor={explodeFactor} cameraTarget={cameraTarget} /></Suspense></div><p>Deterministic solver transform synchronized to step {step.order}.</p></section>
  </section>;
}

function SelectedWorkshopPanel({ workshop, activeIndex, complete, message, onMove, onComplete }: {
  workshop: SelectedWorkshop;
  activeIndex: number;
  complete: boolean;
  message: string;
  onMove: (index: number) => void;
  onComplete: () => void;
}) {
  const step = workshop.lesson.steps[activeIndex]!;
  const solverResult = useMemo(() => solveSelectedProposalParts(workshop.lesson), [workshop.lesson]);

  if (complete) return <section className="completion panel"><p className="eyebrow">Build complete</p><h2>{workshop.lesson.title}</h2><p>You completed the cited, self-directed selected proposal.</p><button className="primary" onClick={() => onMove(0)}>Review the first step</button></section>;

  return <section className="workshop-layout">
    <aside className="steps panel"><h2>Build steps</h2>{workshop.lesson.steps.map((item, index) => <button key={item.id} className={index === activeIndex ? "step active" : "step"} onClick={() => onMove(index)}><span>{item.order}</span>{item.title}</button>)}</aside>
    <section className="lesson panel"><p className="eyebrow">Selected lesson · Step {step.order}</p><h2>{step.title}</h2><section className="checkpoint"><h3>Safety first</h3><p>{step.safetyCallout}</p></section><p className="instruction">{step.instruction}</p><p><strong>Complete when:</strong> {step.completionCondition}</p><h3>Citations</h3><ul>{step.citations.map((citation) => <li key={`${citation.sourceUrl}:${citation.locator}`}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul>
      <section className="part-detail"><h3>Skills to review</h3>{step.skills.length > 0 ? <ul className="source-list">{step.skills.map((skill) => <li key={`${skill.sourceUrl}:${skill.locator}`}><a href={skill.sourceUrl} target="_blank" rel="noreferrer">{skill.title}</a><span>{skill.relevance} · {skill.locator}</span></li>)}</ul> : <p className="helper">No separate skill material is required for this step.</p>}</section>
      {workshop.lesson.troubleshooting.length > 0 ? <section className="retry"><h3>Troubleshooting</h3>{workshop.lesson.troubleshooting.map((item) => <article key={item.problem}><p><strong>{item.problem}</strong></p><p>{item.explanation}</p><ul>{item.citations.map((citation) => <li key={`${citation.sourceUrl}:${citation.locator}`}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul></article>)}</section> : null}
      <p className="message" aria-live="polite">{message}</p><div className="pagination"><button disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)}>Previous</button><button disabled={activeIndex === workshop.lesson.steps.length - 1} onClick={() => onMove(activeIndex + 1)}>Next</button>{activeIndex === workshop.lesson.steps.length - 1 ? <button className="primary" onClick={onComplete}>Complete build</button> : null}</div>
    </section>
    <section className="viewer panel"><h2>Deterministic assembly</h2>{solverResult.ok ? <><p>{solverResult.message}</p><ul className="source-list">{solverResult.traces.map((trace) => <li key={`${trace.transform.stepId}:${trace.selection.movingPartId}:${trace.selection.targetPartId}`}><strong>Step {trace.transform.stepId}</strong><span>Approved symbolic mate validated by the deterministic solver.</span></li>)}</ul></> : <section className="retry" role="alert"><h3>Symbolic mate needs correction</h3><p>{solverResult.rejection.message}</p><p>{solverResult.rejection.retryInstruction}</p></section>}</section>
  </section>;
}

function Workshop() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [message, setMessage] = useState("Start with a project prompt to begin the guided build.");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [progress, setProgress] = useState<Progress>({ stage: "queued", message: "Waiting to start", percent: 0 });
  const [pipelineStages, setPipelineStages] = useState<Progress[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryView>();
  const [discoveryError, setDiscoveryError] = useState<string>();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [retryDemo, setRetryDemo] = useState<SolverRetryDemo>();
  const [selectedWorkshop, setSelectedWorkshop] = useState<SelectedWorkshop>();
  const [isStartingWorkshop, setIsStartingWorkshop] = useState(false);
  const eventSource = useRef<EventSource | undefined>(undefined);

  useEffect(() => () => eventSource.current?.close(), []);

  async function startDiscovery() {
    eventSource.current?.close();
    setHasStarted(false);
    setComplete(false);
    setActiveIndex(0);
    setRetryDemo(undefined);
    setDiscovery(undefined);
    setSelectedWorkshop(undefined);
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
        inventoryPartIds: discoveryInventoryPartIds,
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
        setMessage("Your safe, cited proposal is ready to review.");
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

  const content = activeTab === "Dashboard" ? <Dashboard prompt={projectPrompt} progress={progress} stages={pipelineStages} discovery={discovery} error={discoveryError} isDiscovering={isDiscovering} onPromptChange={setProjectPrompt} onStart={() => void startDiscovery()} onOpenBuild={() => setActiveTab("Build")} />
    : activeTab === "Research" ? <ResearchPanel discovery={discovery} />
      : activeTab === "Build" ? <BuildPanel onOpenWorkshop={() => void startSelectedWorkshop()} isStartingWorkshop={isStartingWorkshop} />
        : activeTab === "Parts" ? <PartsPanel discovery={discovery} onOpenWorkshop={() => void startSelectedWorkshop()} />
          : isStartingWorkshop
            ? <section className="completion panel"><p className="eyebrow">Workshop</p><h2>Opening your cited lesson...</h2><p>{message}</p></section>
            : selectedWorkshop
            ? <SelectedWorkshopPanel workshop={selectedWorkshop} activeIndex={activeIndex} complete={complete} message={message} onMove={(index) => void moveSelectedTo(index)} onComplete={() => setComplete(true)} />
            : <WorkshopPanel activeIndex={activeIndex} complete={complete} message={message} retryDemo={retryDemo} explodeFactor={explodeFactor} onMove={(index) => void moveTo(index)} onRetry={() => setRetryDemo(runSolverRetryDemo())} onComplete={() => setComplete(true)} onExplode={setExplodeFactor} />;

  return <main>
    <header className="hero"><div><p className="eyebrow">Educational Hardware Builder</p><h1>ESP32 weather station workshop</h1><p>Fixture-backed self-directed learning with cited lessons and typed agent progress.</p></div><output aria-live="polite"><strong>{progress.stage}</strong> · {progress.message} {progress.percent !== undefined ? `(${progress.percent}%)` : ""}</output></header>
    <AppTabs active={activeTab} hasStarted={hasStarted} onSelect={setActiveTab} />
    {content}
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workshop /></StrictMode>);
