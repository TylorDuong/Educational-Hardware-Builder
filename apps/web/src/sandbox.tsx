import { lazy, StrictMode, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";
import type { MechViewPart } from "./components/MechView.js";
import { assertSolverTraces, solverTracedFixtureParts } from "./spatial-integration.js";

import "./sandbox.css";

const sessionId = "workshop-demo";
const tabs = ["Dashboard", "Inventory", "Workshop", "Gallery"] as const;
const LazyMechView = lazy(async () => ({ default: (await import("./components/MechView.js")).MechView }));

type Progress = { stage: string; message: string; percent?: number };

async function requestStep(stepId: string): Promise<{ error?: string }> {
  const response = await fetch(`/api/workshop/steps/${stepId}?sessionId=${sessionId}`);
  return response.ok ? {} : { error: (await response.json() as { error: string }).error };
}

function AppTabs({ active, onSelect }: { active: typeof tabs[number]; onSelect: (tab: typeof tabs[number]) => void }) {
  return <nav aria-label="Workshop sections">{tabs.map((tab) => <button key={tab} className={tab === active ? "tab active" : "tab"} onClick={() => onSelect(tab)}>{tab}</button>)}</nav>;
}

function Workshop() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Workshop");
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState("Choose a step to begin the guided build.");
  const [progress, setProgress] = useState<Progress>({ stage: "queued", message: "Waiting to start", percent: 0 });
  const step = weatherStationGoldenSteps[activeIndex]!;
  const mechViewParts: MechViewPart[] = useMemo(() => {
    const parts = solverTracedFixtureParts(step.id);
    assertSolverTraces(parts);
    return parts;
  }, [step.id]);
  const highlightedPart = mechViewParts[activeIndex % mechViewParts.length]!;
  const cameraTarget = useMemo(() => highlightedPart.transform.positionMm, [highlightedPart]);

  useEffect(() => {
    const events = new EventSource("/api/agents/progress");
    const updateProgress = (event: MessageEvent<string>) => setProgress(JSON.parse(event.data) as Progress);
    events.addEventListener("progress", updateProgress as EventListener);
    return () => events.close();
  }, []);

  async function moveTo(index: number) {
    const target = weatherStationGoldenSteps[index];
    if (!target) return;
    const result = await requestStep(target.id);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setActiveIndex(index);
    setMessage(`Step ${target.order} is ready.`);
  }

  async function answer(answer: string) {
    if (!step.checkpoint) return;
    const response = await fetch("/api/workshop/checkpoints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, checkpointId: step.checkpoint.id, answer }),
    });
    const result = await response.json() as { correct?: boolean; reexplanation?: string; error?: string };
    if (result.correct) {
      setMessage("Correct. The next step is now unlocked.");
      return;
    }
    setMessage(result.reexplanation ?? result.error ?? "The checkpoint could not be graded.");
  }

  return <main>
    <header className="hero">
      <div><p className="eyebrow">Educational Hardware Builder</p><h1>ESP32 weather station workshop</h1><p>Fixture-backed guided learning with cited lessons, typed agent progress, and server-enforced checkpoints.</p></div>
      <output aria-live="polite"><strong>{progress.stage}</strong> · {progress.message} {progress.percent !== undefined ? `(${progress.percent}%)` : ""}</output>
    </header>
    <AppTabs active={activeTab} onSelect={setActiveTab} />
    {activeTab !== "Workshop" ? <section className="panel"><h2>{activeTab}</h2><p>{activeTab === "Dashboard" ? "Start or resume the weather-station reference build." : activeTab === "Inventory" ? "Fixture inventory is available for the golden path." : "Completion history will appear here after the guided build."}</p></section> : <section className="workshop-layout">
      <aside className="steps panel"><h2>Build steps</h2>{weatherStationGoldenSteps.map((item, index) => <button key={item.id} className={index === activeIndex ? "step active" : "step"} onClick={() => void moveTo(index)}><span>{item.order}</span>{item.title}{item.checkpoint ? <small>checkpoint</small> : null}</button>)}</aside>
      <section className="lesson panel"><p className="eyebrow">Step {step.order}</p><h2>{step.title}</h2><p className="instruction">{step.instruction}</p><h3>{step.lesson.title}</h3><p>{step.lesson.content}</p><ul>{step.lesson.citations.map((citation) => <li key={citation.sourceUrl}><a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a> · {citation.locator}</li>)}</ul>
        {step.checkpoint ? <section className="checkpoint"><h3>Checkpoint</h3><p>{step.checkpoint.prompt}</p><div>{step.checkpoint.choices?.map((choice) => <button key={choice} onClick={() => void answer(choice)}>{choice}</button>)}</div></section> : null}
        <p className="message" aria-live="polite">{message}</p><div className="pagination"><button disabled={activeIndex === 0} onClick={() => void moveTo(activeIndex - 1)}>Previous</button><button disabled={activeIndex === weatherStationGoldenSteps.length - 1} onClick={() => void moveTo(activeIndex + 1)}>Next</button></div>
      </section>
      <section className="viewer panel"><h2>3D Mech View</h2><div className="canvas"><Suspense fallback={<p>Loading the 3D fixture…</p>}><LazyMechView parts={mechViewParts} highlightIds={[highlightedPart.id]} explodeFactor={0} cameraTarget={cameraTarget} /></Suspense></div><p>Deterministic solver transform synchronized to step {step.order}.</p></section>
    </section>}
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workshop /></StrictMode>);
