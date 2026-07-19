import { lazy, StrictMode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";
import {
  demoParts,
  demoPipelineStages,
  demoSubstitution,
  runSolverRetryDemo,
  type SolverRetryDemo,
} from "./demo-flow.js";
import type { MechViewPart } from "./components/MechView.js";
import { assertSolverTraces, solverTracedFixtureParts } from "./spatial-integration.js";

import "./sandbox.css";

const sessionId = "workshop-demo";
const tabs = ["Dashboard", "Research", "Build", "Parts", "Workshop"] as const;
const LazyMechView = lazy(async () => ({ default: (await import("./components/MechView.js")).MechView }));

type Tab = typeof tabs[number];
type Progress = { stage: string; message: string; percent?: number };

async function requestStep(stepId: string): Promise<{ error?: string }> {
  const response = await fetch(`/api/workshop/steps/${stepId}?sessionId=${sessionId}`);
  return response.ok ? {} : { error: (await response.json() as { error: string }).error };
}

function AppTabs({ active, hasStarted, onSelect }: { active: Tab; hasStarted: boolean; onSelect: (tab: Tab) => void }) {
  return <nav aria-label="Workshop sections">{tabs.map((tab) => <button key={tab} className={tab === active ? "tab active" : "tab"} disabled={tab !== "Dashboard" && !hasStarted} onClick={() => onSelect(tab)}>{tab}</button>)}</nav>;
}

function Pipeline({ stages }: { stages: readonly Progress[] }) {
  return <ol className="pipeline" aria-label="Guided build pipeline">{demoPipelineStages.map((definition) => {
    const stage = stages.find((entry) => entry.stage === definition.stage);
    const state = stage ? "done" : "pending";
    return <li key={definition.stage} className={state}><strong>{definition.stage}</strong><span>{stage?.message ?? definition.message}</span></li>;
  })}</ol>;
}

function Dashboard({ prompt, progress, stages, onPromptChange, onStart, onOpenBuild }: {
  prompt: string;
  progress: Progress;
  stages: readonly Progress[];
  onPromptChange: (value: string) => void;
  onStart: () => void;
  onOpenBuild: () => void;
}) {
  const complete = progress.stage === "complete";
  return <section className="dashboard-grid">
    <section className="panel prompt-panel">
      <p className="eyebrow">1. Describe a build</p><h2>What would you like to build?</h2>
      <label htmlFor="project-prompt">Project prompt</label>
      <textarea id="project-prompt" value={prompt} onChange={(event) => onPromptChange(event.target.value)} />
      <button className="primary" onClick={onStart}>Generate guided plan</button>
      <p className="helper">Demo-safe mode keeps this authored weather-station path deterministic while preserving typed progress events.</p>
    </section>
    <section className="panel" aria-live="polite">
      <p className="eyebrow">2. Pipeline status</p><h2>{progress.message}</h2>
      <Pipeline stages={stages} />
      {complete ? <button className="primary" onClick={onOpenBuild}>Review the build plan</button> : <p className="helper">Watch the validated pipeline stages complete before moving to the plan.</p>}
    </section>
  </section>;
}

function ResearchPanel() {
  const citations = weatherStationGoldenSteps.slice(0, 3).flatMap((step) => step.lesson.citations);
  return <section className="panel"><p className="eyebrow">Grounded research</p><h2>Cited guidance for the weather station</h2><p>The authored path uses the following sources; the lesson and build remain tied to them in fixture mode.</p><ul className="source-list">{citations.map((citation) => <li key={citation.sourceUrl}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a><span>{citation.locator}</span></li>)}</ul></section>;
}

function BuildPanel({ onOpenWorkshop }: { onOpenWorkshop: () => void }) {
  return <section className="panel"><p className="eyebrow">Generated plan</p><h2>ESP32 weather station</h2><ol className="plan-list">{weatherStationGoldenSteps.map((step) => <li key={step.id}><strong>{step.order}. {step.title}</strong><span>{step.instruction}</span></li>)}</ol><button className="primary" onClick={onOpenWorkshop}>Start the guided workshop</button></section>;
}

function PartsPanel({ onOpenWorkshop }: { onOpenWorkshop: () => void }) {
  return <section className="parts-layout"><section className="panel"><p className="eyebrow">Parts and inventory</p><h2>Available for this build</h2><ul className="part-list">{demoParts.map((part) => <li key={part.name}><strong>{part.name}</strong><span>{part.role}</span><em>{part.status}</em></li>)}</ul></section><section className="panel substitution"><p className="eyebrow">Substitution decision</p><h2>{demoSubstitution.selected}</h2><p><strong>Instead of:</strong> {demoSubstitution.requested}</p><p>{demoSubstitution.justification}</p><button className="primary" onClick={onOpenWorkshop}>Continue to the workshop</button></section></section>;
}

function WorkshopPanel({ activeIndex, complete, message, retryDemo, explodeFactor, onMove, onAnswer, onRetry, onComplete, onExplode }: {
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

  if (complete) return <section className="completion panel"><p className="eyebrow">Build complete</p><h2>Your weather station is ready for its final inspection.</h2><p>You completed a cited, checkpoint-gated path and used deterministic spatial validation for the 3D assembly.</p><button className="primary" onClick={() => onMove(0)}>Review the first step</button></section>;

  return <section className="workshop-layout">
    <aside className="steps panel"><h2>Build steps</h2>{weatherStationGoldenSteps.map((item, index) => <button key={item.id} className={index === activeIndex ? "step active" : "step"} onClick={() => onMove(index)}><span>{item.order}</span>{item.title}{item.checkpoint ? <small>checkpoint</small> : null}</button>)}</aside>
    <section className="lesson panel"><p className="eyebrow">Step {step.order}</p><h2>{step.title}</h2><p className="instruction">{step.instruction}</p><h3>{step.lesson.title}</h3><p>{step.lesson.content}</p><ul>{step.lesson.citations.map((citation) => <li key={citation.sourceUrl}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul>
      {step.checkpoint ? <section className="checkpoint"><h3>Checkpoint</h3><p>{step.checkpoint.prompt}</p><div>{step.checkpoint.choices?.map((choice) => <button key={choice} onClick={() => onAnswer(choice)}>{choice}</button>)}</div></section> : null}
      {step.order === 8 ? <section className="retry"><h3>Assembly retry beat</h3><p>The assembly agent proposes symbolic features; the deterministic solver either rejects them with a reason or returns a transform.</p><button onClick={onRetry}>Show symbolic retry</button>{retryDemo?.ok ? <div className="retry-result"><p><strong>Solver rejection:</strong> {retryDemo.firstAttempt}</p><p><strong>Corrected retry:</strong> {retryDemo.retry}</p></div> : retryDemo ? <p className="message">{retryDemo.message}</p> : null}</section> : null}
      <p className="message" aria-live="polite">{message}</p><div className="pagination"><button disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)}>Previous</button><button disabled={activeIndex === weatherStationGoldenSteps.length - 1} onClick={() => onMove(activeIndex + 1)}>Next</button>{activeIndex === weatherStationGoldenSteps.length - 1 ? <button className="primary" onClick={onComplete}>Complete build</button> : null}</div>
    </section>
    <section className="viewer panel"><h2>3D Mech View</h2><label className="explode-control" htmlFor="explode-view">Exploded view <input id="explode-view" type="range" min="0" max="1" step="0.05" value={explodeFactor} onChange={(event) => onExplode(Number(event.target.value))} /></label><div className="canvas"><Suspense fallback={<p>Loading the 3D fixture…</p>}><LazyMechView parts={mechViewParts} highlightIds={[highlightedPart.id]} explodeFactor={explodeFactor} cameraTarget={cameraTarget} /></Suspense></div><p>Deterministic solver transform synchronized to step {step.order}.</p></section>
  </section>;
}

function Workshop() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [message, setMessage] = useState("Start with a project prompt to begin the guided build.");
  const [projectPrompt, setProjectPrompt] = useState("Build a beginner ESP32 weather station that explains every wiring decision.");
  const [progress, setProgress] = useState<Progress>({ stage: "queued", message: "Waiting to start", percent: 0 });
  const [pipelineStages, setPipelineStages] = useState<Progress[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [retryDemo, setRetryDemo] = useState<SolverRetryDemo>();
  const eventSource = useRef<EventSource | undefined>(undefined);

  useEffect(() => () => eventSource.current?.close(), []);

  function startPipeline() {
    eventSource.current?.close();
    setHasStarted(true);
    setComplete(false);
    setActiveIndex(0);
    setRetryDemo(undefined);
    setMessage("The fixture-backed guided build is ready to begin.");
    setProgress({ stage: "queued", message: "Preparing the guided build", percent: 0 });
    setPipelineStages([]);
    const stream = new EventSource("/api/agents/progress");
    eventSource.current = stream;
    stream.addEventListener("progress", (event) => {
      const update = JSON.parse((event as MessageEvent<string>).data) as Progress;
      setProgress(update);
      setPipelineStages((previous) => previous.some((item) => item.stage === update.stage) ? previous : [...previous, update]);
      if (update.stage === "complete") stream.close();
    });
    stream.onerror = () => {
      stream.close();
      setMessage("The progress stream stopped. The authored fixture remains available for the demo.");
    };
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

  async function answer(answer: string) {
    const step = weatherStationGoldenSteps[activeIndex]!;
    if (!step.checkpoint) return;
    const response = await fetch("/api/workshop/checkpoints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, checkpointId: step.checkpoint.id, answer }),
    });
    const result = await response.json() as { correct?: boolean; reexplanation?: string; error?: string };
    setMessage(result.correct ? "Correct. The next step is now unlocked." : result.reexplanation ?? result.error ?? "The checkpoint could not be graded.");
  }

  const content = activeTab === "Dashboard" ? <Dashboard prompt={projectPrompt} progress={progress} stages={pipelineStages} onPromptChange={setProjectPrompt} onStart={startPipeline} onOpenBuild={() => setActiveTab("Build")} />
    : activeTab === "Research" ? <ResearchPanel />
      : activeTab === "Build" ? <BuildPanel onOpenWorkshop={() => setActiveTab("Workshop")} />
        : activeTab === "Parts" ? <PartsPanel onOpenWorkshop={() => setActiveTab("Workshop")} />
          : <WorkshopPanel activeIndex={activeIndex} complete={complete} message={message} retryDemo={retryDemo} explodeFactor={explodeFactor} onMove={(index) => void moveTo(index)} onAnswer={(response) => void answer(response)} onRetry={() => setRetryDemo(runSolverRetryDemo())} onComplete={() => setComplete(true)} onExplode={setExplodeFactor} />;

  return <main>
    <header className="hero"><div><p className="eyebrow">Educational Hardware Builder</p><h1>ESP32 weather station workshop</h1><p>Fixture-backed guided learning with cited lessons, typed agent progress, and server-enforced checkpoints.</p></div><output aria-live="polite"><strong>{progress.stage}</strong> · {progress.message} {progress.percent !== undefined ? `(${progress.percent}%)` : ""}</output></header>
    <AppTabs active={activeTab} hasStarted={hasStarted} onSelect={setActiveTab} />
    {content}
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workshop /></StrictMode>);
