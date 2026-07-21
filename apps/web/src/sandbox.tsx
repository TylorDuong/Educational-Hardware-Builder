import { lazy, StrictMode, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import {
  BuildProposalSchema,
  DiscoveryProgressEventSchema,
  DiscoveryRequestSchema,
  RequestClassificationSchema,
  WorkshopPromotionResponseSchema,
  type BuildProposal,
  type Citation,
  type DiscoveryProgressEvent,
  type LearningConcept,
  type PublicGuidedLesson,
  type RequestClassification,
  type SourceDigest,
} from "@educational-hardware-builder/schemas";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";
import { parseApiJson } from "./api-response.js";
import {
  demoParts,
  demoSubstitution,
  runSolverRetryDemo,
  type SolverRetryDemo,
} from "./demo-flow.js";
import { type MechViewPart, type MechViewRoute } from "./components/MechView.js";
import { matchedInventoryPartIds, parseOwnedParts, type OwnedPartInput } from "./owned-parts.js";
import { createSchematicScene } from "./schematic-scene.js";
import { applicationSourcePolicies } from "./source-policies.js";
import { solveSelectedProposalParts } from "./spatial-integration.js";
import { nextSelectedPartId } from "./workshop-selection.js";
import { learnerFriendlyText, learnerPartName } from "./learner-language.js";
import { weatherStationWiringNetlist } from "../../../packages/schemas/fixtures/weather-station-wiring.js";
import { WiringDiagram } from "./components/WiringDiagram.js";
import {
  BorderGlow,
  LineSidebar,
  ScrollReveal,
  ShapeGrid,
  SpecularButton,
  SplitText,
  SpotlightCard,
  TiltedCard,
} from "./components/react-bits.js";
import {
  AnimatedList,
  CountUp,
  CurvedInput,
  Masonry,
  Stepper,
  TextType,
} from "./components/experience-primitives.js";

import "./sandbox.css";
import "./redesign.css";

const sessionId = "workshop-demo";
const discoveryUserId = "40000000-0000-4000-8000-000000000001";
const tabs = ["Dashboard", "Research", "Parts", "Workshop"] as const;
const LazyMechView = lazy(async () => ({
  default: (await import("./components/MechView.js")).MechView,
}));

type Tab = typeof tabs[number];
type Progress = Omit<DiscoveryProgressEvent, "operationId">;
type DiscoveryOptions = {
  maxBudget?: number;
  preferredMicrocontroller?: string;
  formFactor?: string;
};
type DiscoveryView = {
  operationId: string;
  prompt: string;
  classification: RequestClassification;
  proposal: BuildProposal | null;
};
type SelectedWorkshop = {
  sessionId: string;
  buildId: string;
  lesson: PublicGuidedLesson;
};
type SkillReference = {
  title: string;
  sourceUrl: string;
  locator: string;
  relevance: string;
};
type WorkshopMatingSelection = {
  movingPartId: string;
  targetPartId: string;
  fastener?: string;
};
type WorkshopStepView = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  citations: readonly Citation[];
  skills: readonly SkillReference[];
  matingSelections: readonly WorkshopMatingSelection[];
  completionCondition?: string;
  safetyCallout?: string;
  whyItMatters?: string;
  concepts: readonly LearningConcept[];
  sourceDigest: SourceDigest;
};
type ModelVisualGuide = {
  title: string;
  description: string;
  focusPartIds?: readonly string[];
  routeIds?: readonly string[];
  showRoutes?: boolean;
};
type StepVisualGuide =
  | { kind: "diagram"; title: string; description: string; initialNet?: string }
  | { kind: "model"; model: ModelVisualGuide };
type SectionGuide = {
  title: string;
  detail: string;
};

const rotatingPromptExamples = [
  "Build an automated plant watering system with a water pump, under $40, no soldering.",
  "Design a smart garage door opener using a Raspberry Pi Pico that connects to WiFi.",
  "Create an indoor air quality monitor with an OLED screen to track CO2 and humidity, beginner-friendly.",
  "Build a motion-activated LED stair lighting system, intermediate level.",
  "Design a custom 6-key macropad with a rotary encoder for video editing, under $50.",
  "Build a physical Pomodoro timer with a satisfying mechanical reset switch and a digital display.",
  "Create a sound-reactive LED matrix for my desk using an ESP32 and WS2812B strips.",
  "Design a live subscriber counter for YouTube using an e-ink display.",
  "Build a handheld retro gaming console using a Raspberry Pi Zero, must run on battery power.",
  "Create a digital D&D dice roller with an LCD screen and a physical shake sensor.",
  "Design a mini tabletop arcade cabinet using a 5-inch screen and generic USB arcade buttons.",
  "Design a glowing, sound-reactive cyberpunk visor, battery-powered and lightweight.",
  "Build a wearable heart-rate monitor using sewable components and a LilyPad Arduino.",
  "Create a light-up Iron Man arc reactor prop, under $30, no soldering required.",
  "Build a portable, solar-powered weather station that logs temperature and barometric pressure.",
  "Design a digital tape measure using an ultrasonic sensor and a 7-segment display.",
  "Create a motion-activated wildlife camera trap, battery-powered for outdoor use.",
  "Build an RFID-triggered secret drawer lock, intermediate level.",
] as const;

const commonPromptModifiers = [
  { label: "+ Battery powered", value: "battery-powered" },
  { label: "+ No soldering", value: "no soldering" },
  { label: "+ Under $50", value: "under $50" },
  { label: "+ Use Arduino", value: "use an Arduino" },
  { label: "+ Beginner friendly", value: "beginner-friendly" },
  { label: "+ Fits a shoebox", value: "fits in a shoebox" },
] as const;

const fixtureWorkshopSteps: readonly WorkshopStepView[] = weatherStationGoldenSteps.map((step) => ({
  id: step.id,
  order: step.order,
  title: step.title,
  instruction: step.instruction,
  citations: step.lesson.citations,
  skills: step.skills,
  matingSelections: step.matingSelections,
  completionCondition: step.completionCondition,
  whyItMatters: step.whyItMatters ?? step.lesson.content,
  concepts: step.concepts.length > 0 ? step.concepts : [{
    title: step.lesson.title,
    explanation: step.lesson.content,
  }],
  sourceDigest: step.sourceDigest,
}));

type ResearchBrief = {
  build: string;
  conceptualParts: readonly { title: string; detail: string }[];
  useCases: readonly string[];
  alternativeBuilds: readonly string[];
};

const weatherStationResearchBrief: ResearchBrief = {
  build: "A compact weather station that reads temperature, humidity, and pressure through an ESP32.",
  conceptualParts: [
    { title: "A controller", detail: "Reads the sensor and turns its values into something you can check." },
    { title: "An environmental sensor", detail: "Measures the conditions you want the project to report." },
    { title: "Power and connections", detail: "Supplies the electronics and carries the named signals between modules." },
    { title: "A mount or casing", detail: "Keeps the build together while leaving the sensor exposed to the air." },
  ],
  useCases: [
    "Monitor conditions in a room, greenhouse, or workshop.",
    "Learn how a controller reads a digital I2C sensor.",
    "Use it as the starting point for a small data-logging or display project.",
  ],
  alternativeBuilds: [
    "A USB-powered desk sensor without an enclosure.",
    "A weather display that adds a small screen to the same sensing core.",
    "A battery-powered logger built around the same measurements.",
  ],
};

const conceptualPartByCategory: Record<string, { title: string; detail: string }> = {
  compute: { title: "A controller", detail: "Reads inputs and coordinates what the build does." },
  sensor: { title: "A sensor or input", detail: "Turns something in the physical world into a signal the controller can use." },
  power: { title: "A suitable power path", detail: "Supplies the electronics in the way the cited build documents." },
  passive: { title: "Supporting electronics", detail: "Shapes, protects, or stabilizes the main circuit." },
  fastener: { title: "Fasteners or mounting hardware", detail: "Keeps parts in the intended physical relationship." },
  mechanical: { title: "A mount or casing", detail: "Supports and protects the electronics while keeping the useful parts accessible." },
};

function distinctText(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function researchBriefFor(proposal?: BuildProposal): ResearchBrief {
  if (!proposal) return weatherStationResearchBrief;

  const conceptualParts = distinctText(proposal.billOfMaterials.map((entry) => entry.part.category))
    .map((category) => conceptualPartByCategory[category])
    .filter((part): part is { title: string; detail: string } => part !== undefined);

  const projectLanguage = [
    proposal.summary,
    proposal.intent.normalizedGoal,
    ...proposal.intent.capabilities,
  ].join(" ").toLowerCase();
  const impliedFunctionalPart = /sensor|measure|detect|weather|temperature|humidity|pressure/.test(projectLanguage)
    ? conceptualPartByCategory.sensor
    : /light|led|display|motor|actuator|output/.test(projectLanguage)
      ? { title: "An output or actuator", detail: "Makes the build's result visible or creates a physical response." }
      : undefined;

  for (const additionalPart of [
    impliedFunctionalPart,
    conceptualPartByCategory.power,
    conceptualPartByCategory.mechanical,
  ]) {
    if (!additionalPart) continue;
    if (conceptualParts.length >= 4 || conceptualParts.some((part) => part.title === additionalPart.title)) continue;
    conceptualParts.push(additionalPart);
  }

  const capabilities = proposal.intent.capabilities
    .slice(0, 3)
    .map((capability) => `Explore ${capability.toLowerCase()} in a hands-on prototype.`);
  const useCases = capabilities.length > 0 ? capabilities : [
    "Learn the core system before turning it into a more focused project.",
    "Build a working prototype you can inspect, adapt, and improve.",
  ];
  const alternatives = proposal.billOfMaterials.flatMap((entry) => (
    entry.alternatives.map((alternative) => (
      `${learnerPartName(alternative.name, alternative.category)} in place of ${learnerPartName(entry.part.name, entry.part.category)} when the cited catalog marks it as compatible.`
    ))
  ));

  return {
    build: proposal.summary,
    conceptualParts: conceptualParts.length > 0 ? conceptualParts : weatherStationResearchBrief.conceptualParts,
    useCases,
    alternativeBuilds: alternatives.length > 0 ? distinctText(alternatives) : [
      "A simpler bench prototype before adding a casing.",
      "A version that changes the input or output module while keeping the same core goal.",
    ],
  };
}

function visualGuideForStep(step: WorkshopStepView): StepVisualGuide {
  const title = step.title.toLowerCase();
  const supportsWeatherStationWiring = weatherStationGoldenSteps.some((fixtureStep) => fixtureStep.id === step.id);
  if (supportsWeatherStationWiring && title === "connect ground") {
    return { kind: "diagram", title: "Trace the shared ground", description: "The highlighted net shows the two named pins that share the circuit reference.", initialNet: "GND" };
  }
  if (supportsWeatherStationWiring && title === "connect sensor power") {
    return { kind: "diagram", title: "Trace the 3.3 V supply", description: "The highlighted power net shows the documented source and destination for the sensor supply.", initialNet: "3V3" };
  }
  if (supportsWeatherStationWiring && title === "wire i2c data") {
    return { kind: "diagram", title: "Trace the I2C data line", description: "The highlighted net makes the sensor and controller data endpoints explicit.", initialNet: "I2C_SDA" };
  }
  if (supportsWeatherStationWiring && title === "wire i2c clock") {
    return { kind: "diagram", title: "Trace the I2C clock line", description: "The highlighted net makes the timing connection distinct from the I2C data line.", initialNet: "I2C_SCL" };
  }
  const mate = step.matingSelections[0];
  if (mate) {
    return {
      kind: "model",
      model: {
        title: "See the parts that meet in this step",
        description: mate.fastener
          ? `The highlighted parts show the validated relationship for the ${mate.fastener} connection.`
          : "The highlighted parts show the relationship you are preparing in this step.",
        focusPartIds: [mate.movingPartId, mate.targetPartId],
        showRoutes: title.includes("power"),
        routeIds: title.includes("power") ? ["usb-power"] : [],
      },
    };
  }
  if (title.includes("sensor values")) {
    return {
      kind: "model",
      model: {
        title: "Relate the reading to the assembly",
        description: "The model keeps the sensor, controller, and checked connection route visible while you review the result.",
        showRoutes: true,
        routeIds: ["jumper-i2c"],
      },
    };
  }
  return {
    kind: "model",
    model: {
      title: "Use the complete model as your reference",
      description: "Inspect the complete assembly, then select a part to see where it sits in the source-backed model.",
      showRoutes: title.includes("review"),
    },
  };
}

const sectionGuides: Record<Tab, SectionGuide> = {
  Dashboard: {
    title: "How SparkBuild works",
    detail: "Tell SparkBuild what you want to build. It researches real, cited parts and generates a hands-on, self-paced build guide so you learn the skills as you go.",
  },
  Research: {
    title: "Using the research",
    detail: "These saved sources support your plan. Open a link when you want to see where a recommendation came from.",
  },
  Parts: {
    title: "Checking your parts",
    detail: "See the parts you already have, the parts you may need, and saved sourcing details. No live shopping happens here.",
  },
  Workshop: {
    title: "Using the workshop",
    detail: "The Workshop combines the build plan, fit checks, 3D inspection, and step-by-step guidance. Choose any step in any order.",
  },
};

const boundaryPolicies = [
  ["DIRECT LOGINS", "BLOCKED"],
  ["BROWSER TOOLS", "BLOCKED"],
  ["LIVE SHOPPING", "SAVED DATA ONLY"],
  ["SOURCES", "REQUIRED"],
] as const;

const discoveryPipelineStages: readonly Progress[] = [
  { stage: "queued", message: "Queueing your discovery request", percent: 0 },
  { stage: "classifying", message: "Checking technical relevance and good-faith use", percent: 20 },
  { stage: "intent", message: "Interpreting your build goal", percent: 40 },
  { stage: "retrieving", message: "Retrieving local cited knowledge", percent: 65 },
  { stage: "catalog", message: "Validating the local proposal", percent: 85 },
  { stage: "ready", message: "Discovery proposal is ready", percent: 100 },
];

async function requestStep(
  stepId: string,
  selected?: Pick<SelectedWorkshop, "sessionId" | "buildId">,
): Promise<{ error?: string }> {
  const query = selected
    ? new URLSearchParams({ sessionId: selected.sessionId, buildId: selected.buildId })
    : new URLSearchParams({ sessionId });
  const response = await fetch("/api/workshop/steps/" + stepId + "?" + query.toString());
  if (response.ok) return {};
  try {
    const payload = await parseApiJson<{ error?: unknown }>(response);
    return { error: typeof payload.error === "string" ? payload.error : "Workshop step could not be opened." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Workshop step could not be opened." };
  }
}

function AppTabs({
  active,
  hasStarted,
  onSelect,
}: {
  active: Tab;
  hasStarted: boolean;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <nav className="app-tabs" aria-label="Primary navigation" data-flow-ready={hasStarted ? "true" : "false"}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={tab === active ? "tab active" : "tab"}
          aria-current={tab === active ? "page" : undefined}
          disabled={tab !== "Dashboard" && !hasStarted}
          onClick={() => onSelect(tab)}
        >
          {tab === "Dashboard" ? "Home" : tab}
        </button>
      ))}
    </nav>
  );
}

function WorkflowNavigation({
  active,
  hasStarted,
  onSelect,
}: {
  active: Tab;
  hasStarted: boolean;
  onSelect: (tab: Tab) => void;
}) {
  const activeIndex = tabs.indexOf(active);
  const previousTab = activeIndex > 0 ? tabs[activeIndex - 1] : undefined;
  const nextTab = activeIndex < tabs.length - 1 ? tabs[activeIndex + 1] : undefined;
  const displayTab = (tab?: Tab) => tab === "Dashboard" ? "Home" : tab;

  return (
    <nav className="workflow-navigation" aria-label="Section navigation" data-flow-ready={hasStarted ? "true" : "false"}>
      <div>
        <p className="eyebrow">YOUR PATH</p>
        <p className="workflow-navigation-copy">Move from an idea to sources, parts, and the hands-on Workshop.</p>
      </div>
      <div className="workflow-navigation-actions">
        <button
          type="button"
          className="workflow-navigation-button"
          disabled={previousTab === undefined || (!hasStarted && previousTab !== "Dashboard")}
          onClick={() => previousTab && onSelect(previousTab)}
        >
          {previousTab ? "Previous: " + displayTab(previousTab) : "Previous"}
        </button>
        <button
          type="button"
          className="workflow-navigation-button primary"
          disabled={nextTab === undefined || !hasStarted}
          onClick={() => nextTab && onSelect(nextTab)}
        >
          {nextTab ? "Next: " + displayTab(nextTab) : "Next"}
        </button>
      </div>
    </nav>
  );
}

function PageHeading({
  section,
  title,
  caption,
  onOpenHelp,
}: {
  section: Tab;
  title: string;
  caption: string;
  onOpenHelp: (section: Tab) => void;
}) {
  const displaySection = section === "Dashboard" ? "Home" : section;
  return (
    <header className="page-heading">
      <div className="heading-row">
        <p className="eyebrow">{displaySection}</p>
        <button
          type="button"
          className="help-trigger"
          aria-label={"Learn more about " + section}
          aria-haspopup="dialog"
          onClick={() => onOpenHelp(section)}
        >
          ?
        </button>
      </div>
      <h2>{title}</h2>
      <p>{caption}</p>
    </header>
  );
}

function SectionHelpModal({ section, onClose }: { section?: Tab; onClose: () => void }) {
  if (!section) return null;
  const guide = sectionGuides[section];
  return (
    <div className="skill-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="skill-modal section-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-heading">
          <p className="eyebrow">MORE ABOUT THIS PAGE</p>
          <button type="button" className="icon-button" aria-label="Close page help" onClick={onClose}>CLOSE</button>
        </div>
        <h2 id="section-help-title">{guide.title}</h2>
        <p>{guide.detail}</p>
      </section>
    </div>
  );
}

function Pipeline({ stages }: { stages: readonly Progress[] }) {
  return (
    <ol className="pipeline terminal-log" aria-label="Discovery pipeline">
      {discoveryPipelineStages.map((definition) => {
        const stage = stages.find((entry) => entry.stage === definition.stage);
        const state = stage ? "done" : "pending";
        return (
          <li key={definition.stage} className={state}>
            <strong>{definition.stage}</strong>
            <span>{stage?.message ?? definition.message}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ServerStatus() {
  return (
    <section className="panel server-status" aria-label="Server status">
      <div className="panel-heading">
        <p className="eyebrow">SYSTEM CHECK</p>
        <span className="status-indicator">DEMO</span>
      </div>
      <dl>
        <div><dt>APP</dt><dd>READY</dd></div>
        <div><dt>DATA</dt><dd>SAVED DEMO DATA</dd></div>
        <div><dt>FIT CHECK</dt><dd>ON</dd></div>
      </dl>
    </section>
  );
}

function DiscoverySummary({ discovery }: { discovery: DiscoveryView }) {
  const interpretedRequest = discovery.proposal?.intent.normalizedGoal ?? discovery.prompt;
  const { classification, proposal } = discovery;
  return (
    <section className="discovery-summary">
      <p className="eyebrow">YOUR IDEA</p>
      <h3>{learnerFriendlyText(interpretedRequest)}</h3>
      <p><strong>Status:</strong> {classification.outcome}</p>
      <p className="message">{classification.outcome === "approved" ? classification.reason : classification.message}</p>
      {proposal ? (
        <>
          <p className="eyebrow">YOUR PLAN</p>
          <h3>{learnerFriendlyText(proposal.summary)}</h3>
          <p>{proposal.billOfMaterials.length} parts, with saved source details.</p>
          <ul className="source-list">
            {proposal.citations.map((citation) => (
              <li key={citation.sourceUrl + ":" + citation.locator}>
                <a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.title}</a>
                <span>{citation.locator}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Dashboard({
  prompt,
  ownedPartsText,
  progress,
  stages,
  discovery,
  error,
  isDiscovering,
  onPromptChange,
  onOwnedPartsChange,
  onStart,
  onOpenHelp,
}: {
  prompt: string;
  ownedPartsText: string;
  progress: Progress;
  stages: readonly Progress[];
  discovery?: DiscoveryView;
  error?: string;
  isDiscovering: boolean;
  onPromptChange: (value: string) => void;
  onOwnedPartsChange: (value: string) => void;
  onStart: (options: DiscoveryOptions) => void;
  onOpenHelp: (section: Tab) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [microcontroller, setMicrocontroller] = useState("");
  const [formFactor, setFormFactor] = useState("");
  const complete = progress.stage === "ready";
  const rejected = progress.stage === "rejected";
  const parsedBudget = Number(budget);

  const addModifier = (modifier: string) => {
    const existing = prompt.trim();
    if (existing.toLowerCase().includes(modifier.toLowerCase())) return;
    const base = existing || "Build a beginner-friendly hardware project";
    const joiner = /[.!?]$/.test(base) ? " " : ", ";
    onPromptChange(base + joiner + modifier + (/[.!?]$/.test(base) ? "" : "."));
  };

  const startWithParameters = () => {
    onStart({
      maxBudget: Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
      preferredMicrocontroller: microcontroller || undefined,
      formFactor: formFactor.trim() || undefined,
    });
  };

  return (
    <section className="landing-view">
      <section className="landing-hero">
        <ShapeGrid
          className="landing-hero__grid"
          direction="left"
          speed={0.22}
          squareSize={46}
          borderColor="rgb(216 207 182 / 0.82)"
          hoverFillColor="#0172E4"
          hoverTrailAmount={4}
        />
        <div className="landing-hero__wash" aria-hidden="true" />
        <div className="landing-hero__copy">
          <p className="eyebrow">SPARKBUILD</p>
          <SplitText text="Ignite your next tech project." className="landing-title" tag="h1" />
          <p className="landing-lede">Tell SparkBuild what you want to build. It researches real, cited parts and generates a hands-on, self-paced build guide so you actually learn the skills as you go.</p>
          <button type="button" className="landing-help-link" onClick={() => onOpenHelp("Dashboard")}>
            How SparkBuild works
          </button>
        </div>

        <BorderGlow
          className="landing-prompt"
          backgroundColor="#FFFDF5"
          glowColor="210 99% 45%"
          borderRadius={14}
          glowRadius={0}
          glowIntensity={0}
        >
          <div className="landing-prompt__heading">
            <div>
              <p className="eyebrow">START WITH A SPARK</p>
              <h2>What do you want to make?</h2>
            </div>
            <span className="landing-prompt__state">{isDiscovering ? "SOURCING" : "READY"}</span>
          </div>
          <label className="landing-prompt__label" htmlFor="project-prompt">Describe the project, outcome, or problem you want to solve.</label>
          <div className="idea-input-wrap">
            <textarea
              id="project-prompt"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              aria-describedby="project-prompt-help"
              placeholder=""
              disabled={isDiscovering}
              rows={4}
            />
            {!prompt ? <TextType examples={rotatingPromptExamples} /> : null}
          </div>
          <p id="project-prompt-help" className="landing-prompt__helper">Use the examples to see how budget, skill level, power, and size can shape a plan.</p>

          <div className="prompt-modifiers" aria-label="Common project constraints">
            {commonPromptModifiers.map((modifier) => {
              const applied = prompt.toLowerCase().includes(modifier.value.toLowerCase());
              return (
                <SpecularButton
                  key={modifier.value}
                  type="button"
                  size="sm"
                  className={applied ? "prompt-modifier active" : "prompt-modifier"}
                  aria-pressed={applied}
                  disabled={isDiscovering}
                  onClick={() => addModifier(modifier.value)}
                >
                  {modifier.label}
                </SpecularButton>
              );
            })}
          </div>

          <button
            className="advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="advanced-parameters"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <span>Advanced parameters</span>
            <span aria-hidden="true">{advancedOpen ? "-" : "+"}</span>
          </button>
          {advancedOpen ? (
            <div id="advanced-parameters" className="advanced-parameters">
              <CurvedInput
                label="Max budget ($)"
                type="number"
                min="1"
                inputMode="decimal"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="50"
                disabled={isDiscovering}
                helper="Optional. Saved catalog prices only."
              />
              <label className="curved-input">
                <span>Preferred microcontroller</span>
                <select value={microcontroller} onChange={(event) => setMicrocontroller(event.target.value)} disabled={isDiscovering}>
                  <option value="">No preference</option>
                  <option value="Arduino">Arduino</option>
                  <option value="Raspberry Pi">Raspberry Pi</option>
                  <option value="ESP32">ESP32</option>
                </select>
              </label>
              <CurvedInput
                label="Form factor"
                type="text"
                value={formFactor}
                onChange={(event) => setFormFactor(event.target.value)}
                placeholder="Fits in a shoebox"
                disabled={isDiscovering}
              />
              <label className="owned-parts-input" htmlFor="owned-parts">
                <span>What parts do you have? (optional)</span>
                <textarea
                  id="owned-parts"
                  value={ownedPartsText}
                  onChange={(event) => onOwnedPartsChange(event.target.value)}
                  placeholder="ESP32 starter kit, BME280 sensor, breadboard and jumpers"
                  disabled={isDiscovering}
                  rows={3}
                />
                <small>One part or kit per line.</small>
              </label>
            </div>
          ) : null}

          <SpecularButton
            size="lg"
            type="button"
            onClick={startWithParameters}
            disabled={isDiscovering || prompt.trim().length === 0}
          >
            {isDiscovering ? "Making your plan" : "Make my plan"}
          </SpecularButton>
        </BorderGlow>
      </section>

      <section className="landing-result" aria-live="polite">
        <div className="landing-result__heading">
          <p className="eyebrow">DISCOVERY STATUS</p>
          <h2>{progress.message}</h2>
        </div>
        <div className="landing-result__body">
          <Pipeline stages={stages} />
          {error ? <p className="message" role="alert">{error}</p> : null}
          {!error && rejected ? <p className="message" role="alert">This request cannot make a hardware plan.</p> : null}
          {discovery ? <DiscoverySummary discovery={discovery} /> : null}
          {complete && discovery?.proposal
            ? <p className="helper">Your plan is ready. Research, Parts, and Workshop are now open.</p>
            : <p className="helper">Your sources, parts, and build steps will appear here when discovery is ready.</p>}
        </div>
      </section>

      <section className="how-it-works">
        <div className="how-it-works__intro">
          <p className="eyebrow">FROM IDEA TO BENCH</p>
          <ScrollReveal>One clear prompt becomes a source-backed path to a real build.</ScrollReveal>
        </div>
        <div className="how-it-works__steps">
          <article>
            <span>01</span>
            <h3>Describe what matters</h3>
            <p>Say what you want, then add the constraints that make it yours.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Review the plan</h3>
            <p>Check cited concepts, compatible parts, and saved sourcing details.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Build at your pace</h3>
            <p>Use the 3D model and open any step whenever it helps.</p>
          </article>
        </div>
      </section>

      <section className="template-section">
        <div className="template-section__intro">
          <p className="eyebrow">STARTING POINTS</p>
          <h2>Try a build with a little personality.</h2>
        </div>
        <div className="template-grid">
          <SpotlightCard className="template-card template-card--plant">
            <span className="template-card__type">Smart Home</span>
            <h3>Plant guardian</h3>
            <p>Water a plant only when it needs it, with a pump and a simple controller.</p>
            <button type="button" onClick={() => onPromptChange(rotatingPromptExamples[0])}>Use this prompt</button>
          </SpotlightCard>
          <SpotlightCard className="template-card template-card--macro">
            <span className="template-card__type">Desk Upgrade</span>
            <h3>Editing macropad</h3>
            <p>Make a tactile six-key controller with a rotary encoder for focused work.</p>
            <button type="button" onClick={() => onPromptChange(rotatingPromptExamples[4])}>Use this prompt</button>
          </SpotlightCard>
          <SpotlightCard className="template-card template-card--lamp">
            <img src="/images/lumos-smart-lamp.jpg" alt="LUMOS smart lamp project reference" loading="lazy" />
            <div>
              <span className="template-card__type">Referenced project</span>
              <h3>Smart light study</h3>
              <p>Explore an open hardware lighting project before shaping your own version.</p>
              <a href="https://www.hackster.io/JontyDIY/lumos-smart-lamp-for-better-sleep-d5987e" target="_blank" rel="noreferrer">View source</a>
              <small>Image: Jonty, CC BY via Hackster</small>
            </div>
          </SpotlightCard>
          <SpotlightCard className="template-card template-card--retro">
            <span className="template-card__type">Retro Gaming</span>
            <h3>Pocket arcade</h3>
            <p>Plan a compact cabinet with a small screen and familiar arcade controls.</p>
            <button type="button" onClick={() => onPromptChange(rotatingPromptExamples[10])}>Use this prompt</button>
          </SpotlightCard>
          <SpotlightCard className="template-card template-card--utility">
            <span className="template-card__type">Practical Utility</span>
            <h3>Wildlife camera trap</h3>
            <p>Combine a motion trigger, a battery, and a weather-ready housing.</p>
            <button type="button" onClick={() => onPromptChange(rotatingPromptExamples[16])}>Use this prompt</button>
          </SpotlightCard>
        </div>
      </section>
    </section>
  );
}

function ResearchPanel({
  discovery,
  onOpenHelp,
}: {
  discovery?: DiscoveryView;
  onOpenHelp: (section: Tab) => void;
}) {
  const proposal = discovery?.proposal;
  const citations = proposal?.citations ?? weatherStationGoldenSteps.slice(0, 3).flatMap((step) => step.lesson.citations);
  const title = proposal ? proposal.intent.normalizedGoal : "Weather station";
  const offers = proposal?.billOfMaterials.flatMap((entry) => entry.offers) ?? [];
  const brief = researchBriefFor(proposal);
  const categories = ["Concepts", "Pinouts", "External Links"] as const;
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("Concepts");

  return (
    <section className="research-view research-view--redesigned">
      <header className="research-hero">
        <div>
          <p className="eyebrow">RESEARCH LIBRARY</p>
          <h1>{learnerFriendlyText(title)}</h1>
          <p>Understand the concepts first, then follow the cited detail when you need it.</p>
        </div>
        <button type="button" className="landing-help-link" onClick={() => onOpenHelp("Research")}>How to use research</button>
      </header>

      <div className="research-workspace">
        <aside className="research-category-nav">
          <LineSidebar
            items={categories}
            activeIndex={categories.indexOf(activeCategory)}
            onItemClick={(_, label) => setActiveCategory(label as (typeof categories)[number])}
          />
        </aside>
        <section className="research-reader" aria-live="polite">
          {activeCategory === "Concepts" ? (
            <>
              <header className="research-reader__heading">
                <p className="eyebrow">BUILD BRIEF</p>
                <h2>What you will make</h2>
                <p>{learnerFriendlyText(brief.build)}</p>
              </header>
              <div className="research-concept-grid">
                <section>
                  <h3>Conceptual parts you need</h3>
                  {brief.conceptualParts.map((part) => (
                    <article key={part.title}>
                      <h4>{part.title}</h4>
                      <p>{part.detail}</p>
                    </article>
                  ))}
                </section>
                <section>
                  <h3>Potential use cases</h3>
                  {brief.useCases.map((useCase) => <p className="research-note" key={useCase}>{useCase}</p>)}
                  <h3 className="research-subheading">Alternative builds</h3>
                  {brief.alternativeBuilds.map((alternative) => <p className="research-note" key={alternative}>{learnerFriendlyText(alternative)}</p>)}
                </section>
              </div>
            </>
          ) : null}

          {activeCategory === "Pinouts" ? (
            <>
              <header className="research-reader__heading">
                <p className="eyebrow">CONNECTION REFERENCE</p>
                <h2>Follow the named signals.</h2>
                <p>Pin and wiring guidance stays tied to its source. Use the Workshop visual guide when you are ready to make a connection.</p>
              </header>
              <div className="pinout-source-stack">
                {citations.map((citation, index) => (
                  <article key={citation.sourceUrl + ":" + citation.locator}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{citation.title}</h3>
                      <p>Find the named connection detail at {citation.locator}.</p>
                    </div>
                    <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open source</a>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activeCategory === "External Links" ? (
            <>
              <header className="research-reader__heading">
                <p className="eyebrow">SAVED SOURCES</p>
                <h2>Every recommendation has a trail.</h2>
                <p>Open a source record when you want more detail than the plain-language build brief provides.</p>
              </header>
              <div className="source-card-grid">
                {citations.map((citation, index) => (
                  <article key={citation.sourceUrl + ":" + citation.locator}>
                    <span>Source {String(index + 1).padStart(2, "0")}</span>
                    <h3>{citation.title}</h3>
                    <p>{citation.locator}</p>
                    <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open reference</a>
                  </article>
                ))}
              </div>
              {proposal ? (
                <section className="saved-offers">
                  <h3>Saved parts data</h3>
                  <p className={proposal.freshness === "stale" ? "freshness stale" : "freshness fresh"}>
                    {proposal.freshness === "stale" ? "Some saved options need checking." : "Saved options are ready to use."}
                  </p>
                  {offers.length > 0 ? offers.map((offer) => (
                    <a key={offer.externalId} href={offer.sourceUrl} target="_blank" rel="noreferrer">
                      {offer.provider} / {offer.providerSku} <span>{offer.citation.locator}</span>
                    </a>
                  )) : <p className="helper">No saved offer is ready right now.</p>}
                </section>
              ) : null}
            </>
          ) : null}
        </section>
        <aside className="research-policy">
          <p className="eyebrow">LOCAL FIRST</p>
          <h2>Saved, cited, and ready when you are.</h2>
          <dl>
            {boundaryPolicies.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <p>{applicationSourcePolicies.length} source rules keep this learning material grounded.</p>
        </aside>
      </div>
    </section>
  );
}

function ReportedOwnedParts({ ownedParts }: { ownedParts: readonly OwnedPartInput[] }) {
  if (ownedParts.length === 0) return null;
  return (
    <section className="panel">
      <p className="eyebrow">YOUR PARTS</p>
      <h2>Already on your bench</h2>
      <p className="helper">We will use these when they fit.</p>
      <ul className="part-list">
        {ownedParts.map((part) => (
          <li key={part.label}>
            <strong>{part.label}</strong>
            <span>{part.matchedName ? "Matches " + learnerPartName(part.matchedName) + "." : "Check this part before you use it."}</span>
            <em>{part.matchedName ? "Ready for planning" : "Needs a check"}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComponentBreakdown({ onOpenHelp }: { onOpenHelp: (section: Tab) => void }) {
  return (
    <section className="parts-overview">
      <PageHeading section="Parts" title="Parts you need" caption="Check what you have and what to get." onOpenHelp={onOpenHelp} />
      <section className="panel inventory-table" role="table" aria-label="Cached inventory and sourcing">
        <div className="inventory-row inventory-header" role="row">
          <span role="columnheader">PART</span>
          <span role="columnheader">USE</span>
          <span role="columnheader">SAVED PRICE</span>
          <span role="columnheader">UPDATE</span>
        </div>
        {demoParts.map((part) => (
          <div className="inventory-row" role="row" key={part.name}>
            <div className="inventory-component" role="cell">
              <div className="part-thumbnail" aria-hidden="true">{part.name.slice(0, 3).toUpperCase()}</div>
              <span><strong>{learnerPartName(part.name)}</strong><small>{part.status}</small></span>
            </div>
            <span role="cell">{part.role}</span>
            <span role="cell">{part.name === "ESP32 DevKit" ? "USD 9.99 saved" : "No saved price"}</span>
            <span className="ttl-tag" role="cell">SAVED LOCALLY</span>
          </div>
        ))}
      </section>
    </section>
  );
}

function OfferCard({ offer }: { offer: BuildProposal["billOfMaterials"][number]["offers"][number] }) {
  const price = offer.price !== undefined && offer.currency
    ? offer.currency + " " + offer.price.toFixed(2)
    : "Price not captured";

  return (
    <li className="offer-card">
      {offer.thumbnailDataUrl
        ? <img src={offer.thumbnailDataUrl} alt={offer.provider + " listing thumbnail"} loading="lazy" />
        : <div className="offer-placeholder" aria-hidden="true">NO IMAGE</div>}
      <div>
        <strong>{offer.provider} / {offer.providerSku}</strong>
        <span>{offer.availability.replaceAll("_", " ")} / {price}</span>
        <span>Saved {new Date(offer.observedAt).toLocaleDateString()}</span>
        <a href={offer.purchaseUrl} target="_blank" rel="noreferrer">Open {offer.provider}</a>
        <a href={offer.sourceUrl} target="_blank" rel="noreferrer">See source</a>
      </div>
    </li>
  );
}

function PartsDetails({ discovery }: { discovery?: DiscoveryView }) {
  const proposal = discovery?.proposal;

  if (proposal) {
    return (
      <section className="parts-layout">
        <section className="panel">
          <p className="eyebrow">YOUR LIST</p>
          <h2>Ready for this build</h2>
          <ul className="part-list">
            {proposal.billOfMaterials.map((entry) => (
              <li key={entry.part.id}>
                <strong>{learnerPartName(entry.part.name, entry.part.category)} x {entry.quantity}</strong>
                <span>{learnerFriendlyText(entry.rationale)}</span>
                <em className={entry.freshness === "stale" ? "freshness stale" : "freshness fresh"}>
                  {entry.freshness === "stale" ? "Saved option needs a check" : "Saved option is ready"}
                </em>
                {entry.inventoryMatch ? (
                  <p>
                    <strong>You have:</strong> {entry.inventoryMatch.quantity}
                    {entry.inventoryMatch.rawLabel ? " (" + entry.inventoryMatch.rawLabel + ")" : ""}.
                  </p>
                ) : (
                  <p className="inventory-gap"><strong>Still needed:</strong> Choose a saved option or a match below.</p>
                )}
                <section className="part-detail">
                  <h3>Saved options</h3>
                  {entry.offers.length > 0
                    ? <ul className="source-list offer-list">{entry.offers.map((offer) => <OfferCard key={offer.externalId} offer={offer} />)}</ul>
                    : <p className="helper">No saved option is ready right now.</p>}
                </section>
                <details className="part-detail alternatives">
                  <summary>Other options ({entry.alternatives.length})</summary>
                  {entry.alternatives.length > 0 ? (
                    <ul className="source-list">
                      {entry.alternatives.map((alternative) => (
                        <li key={alternative.id}>
                          <strong>{learnerPartName(alternative.name, alternative.category)}</strong>
                          <span>{alternative.category}</span>
                          {alternative.datasheetUrl
                            ? <a href={alternative.datasheetUrl} target="_blank" rel="noreferrer">See compatible part</a>
                            : null}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="helper">No other saved option is ready.</p>}
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel substitution">
          <p className="eyebrow">YOUR CHOICE</p>
          <h2>Use saved options</h2>
          <p>Everything here comes from a saved local record. Open the Workshop below when you are ready to build.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="parts-layout">
      <section className="panel">
        <p className="eyebrow">YOUR LIST</p>
        <h2>Available for this build</h2>
        <ul className="part-list">
          {demoParts.map((part) => (
            <li key={part.name}>
              <strong>{learnerPartName(part.name)}</strong>
              <span>{part.role}</span>
              <em>{part.status}</em>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel substitution">
        <p className="eyebrow">PART SWAP</p>
        <h2>{demoSubstitution.selected}</h2>
        <p><strong>Instead of:</strong> {demoSubstitution.requested}</p>
        <p>{demoSubstitution.justification}</p>
      </section>
    </section>
  );
}

type PartCardView = {
  id: string;
  name: string;
  category: string;
  role: string;
  quantity: number;
  price?: number;
  currency?: string;
  thumbnailDataUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  freshness?: "fresh" | "stale";
  alternatives: readonly { id: string; name: string; category: string }[];
};

function partCardsFor(discovery?: DiscoveryView): readonly PartCardView[] {
  if (discovery?.proposal) {
    return discovery.proposal.billOfMaterials.map((entry) => {
      const primaryOffer = entry.offers.find((offer) => offer.price !== undefined && offer.currency === "USD") ?? entry.offers[0];
      return {
        id: entry.part.id,
        name: learnerPartName(entry.part.name, entry.part.category),
        category: entry.part.category,
        role: learnerFriendlyText(entry.rationale),
        quantity: entry.quantity,
        price: primaryOffer?.currency === "USD" ? primaryOffer.price : undefined,
        currency: primaryOffer?.currency,
        thumbnailDataUrl: primaryOffer?.thumbnailDataUrl,
        sourceUrl: primaryOffer?.sourceUrl,
        sourceLabel: primaryOffer ? primaryOffer.provider + " / " + primaryOffer.providerSku : undefined,
        freshness: entry.freshness,
        alternatives: entry.alternatives.map((alternative) => ({
          id: alternative.id,
          name: learnerPartName(alternative.name, alternative.category),
          category: alternative.category,
        })),
      };
    });
  }

  return demoParts.map((part, index) => ({
    id: part.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: learnerPartName(part.name),
    category: "saved demo part",
    role: part.role,
    quantity: 1,
    price: part.name === "ESP32 DevKit" ? 9.99 : undefined,
    currency: part.name === "ESP32 DevKit" ? "USD" : undefined,
    freshness: "fresh",
    alternatives: [{ id: "demo-" + index, name: demoSubstitution.selected, category: "compatible saved option" }],
  }));
}

function PartsPanel({
  discovery,
  ownedParts,
  onOpenHelp,
}: {
  discovery?: DiscoveryView;
  ownedParts: readonly OwnedPartInput[];
  onOpenHelp: (section: Tab) => void;
}) {
  const parts = partCardsFor(discovery);
  const savedTotal = parts.reduce((sum, part) => sum + (part.price ?? 0) * part.quantity, 0);
  const pricedCount = parts.filter((part) => part.price !== undefined).length;

  return (
    <section className="parts-view parts-view--redesigned">
      <header className="parts-hero">
        <div>
          <p className="eyebrow">PARTS DESK</p>
          <h1>Everything your build needs.</h1>
          <p>Review saved parts, see what you already own, and keep the estimate in view while you compare options.</p>
        </div>
        <button type="button" className="landing-help-link" onClick={() => onOpenHelp("Parts")}>How saved sourcing works</button>
      </header>

      <div className="parts-workspace">
        <section className="parts-sourcing">
          <div className="parts-sourcing__heading">
            <div>
              <p className="eyebrow">SOURCING QUEUE</p>
              <h2>{parts.length} parts in this plan</h2>
            </div>
            <span>Saved records only</span>
          </div>
          <AnimatedList
            items={parts}
            getKey={(part) => part.id}
            renderItem={(part) => (
              <TiltedCard className="part-card" rotateAmplitude={4} scaleOnHover={1.015}>
                <div className="part-card__visual">
                  {part.thumbnailDataUrl
                    ? <img src={part.thumbnailDataUrl} alt={part.name + " listing thumbnail"} loading="lazy" />
                    : <span>{part.name.slice(0, 3).toUpperCase()}</span>}
                </div>
                <div className="part-card__copy">
                  <div className="part-card__title">
                    <span>{part.category}</span>
                    <strong>{part.name}</strong>
                  </div>
                  <p>{part.role}</p>
                  <div className="part-card__meta">
                    <span>Qty {part.quantity}</span>
                    <span className={part.freshness === "stale" ? "freshness stale" : "freshness fresh"}>
                      {part.freshness === "stale" ? "Needs a price check" : "Saved option ready"}
                    </span>
                  </div>
                  <div className="part-card__source">
                    {part.price !== undefined ? <strong>{"$" + part.price.toFixed(2)}</strong> : <strong>Price not saved</strong>}
                    {part.sourceUrl && part.sourceLabel ? <a href={part.sourceUrl} target="_blank" rel="noreferrer">{part.sourceLabel}</a> : null}
                  </div>
                  {part.alternatives.length > 0 ? (
                    <details>
                      <summary>Compatible alternatives</summary>
                      <ul>
                        {part.alternatives.map((alternative) => (
                          <li key={alternative.id}>{alternative.name} <span>{alternative.category}</span></li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </TiltedCard>
            )}
          />
        </section>

        <aside className="parts-summary">
          <BorderGlow backgroundColor="#FFFDF5" glowColor="210 99% 45%" borderRadius={14} glowRadius={0} glowIntensity={0}>
            <section className="parts-summary__inner">
              <p className="eyebrow">SAVED TOTAL</p>
              <h2>{pricedCount > 0 ? <CountUp value={savedTotal} prefix="$" /> : "Estimate in progress"}</h2>
              <p>{pricedCount} of {parts.length} parts have a USD price in the saved catalog.</p>
              <dl>
                <div><dt>Included</dt><dd>{pricedCount} priced records</dd></div>
                <div><dt>Still needed</dt><dd>{parts.length - pricedCount} price checks</dd></div>
                <div><dt>Source mode</dt><dd>Local records</dd></div>
              </dl>
            </section>
          </BorderGlow>
          <ReportedOwnedParts ownedParts={ownedParts} />
          <section className="parts-summary__note">
            <h3>Keep the estimate honest.</h3>
            <p>Totals only use prices saved with a source record. Missing or stale prices stay visible instead of being guessed.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SkillReferenceList({
  skills,
  onOpen,
}: {
  skills: readonly SkillReference[];
  onOpen: (skill: SkillReference) => void;
}) {
  return (
    <details className="skill-references">
      <summary>Need a deeper explanation?</summary>
      <p className="helper">These cited references are optional follow-up reading. The step explanation above is the place to start.</p>
      {skills.length > 0 ? (
        <ul className="learning-source-list">
          {skills.map((skill) => (
            <li key={skill.sourceUrl + ":" + skill.locator}>
              <article className="skill-reference">
                <div>
                  <h4>{skill.title}</h4>
                  <p>{learnerFriendlyText(skill.relevance)}</p>
                  <span>Find it: {skill.locator}</span>
                </div>
                <div className="source-actions">
                  <a href={skill.sourceUrl} target="_blank" rel="noreferrer">Read source</a>
                  <button type="button" onClick={() => onOpen(skill)}>Reference details</button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : <p className="helper">No separate skill reference is needed for this step.</p>}
    </details>
  );
}

function SkillReferenceModal({ skill, onClose }: { skill?: SkillReference; onClose: () => void }) {
  if (!skill) return null;
  return (
    <div className="skill-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="skill-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-reference-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-heading">
          <p className="eyebrow">SKILL REFERENCE</p>
          <button type="button" className="icon-button" aria-label="Close skill reference" onClick={onClose}>CLOSE</button>
        </div>
        <h2 id="skill-reference-title">{skill.title}</h2>
        <p>{learnerFriendlyText(skill.relevance)}</p>
        <dl>
          <div><dt>FIND IT</dt><dd>{skill.locator}</dd></div>
          <div><dt>SOURCE</dt><dd><a href={skill.sourceUrl} target="_blank" rel="noreferrer">OPEN SOURCE</a></dd></div>
        </dl>
      </section>
    </div>
  );
}

function InteractiveAssemblyViewer({
  parts,
  routes,
  layoutMessage,
  heading,
  stepOrder,
  guide,
  showPartList = true,
}: {
  parts: readonly MechViewPart[];
  routes: readonly MechViewRoute[];
  layoutMessage: string;
  heading: string;
  stepOrder: number;
  guide?: ModelVisualGuide;
  showPartList?: boolean;
}) {
  const [selectedPartId, setSelectedPartId] = useState<string>();
  const [hoveredPartId, setHoveredPartId] = useState<string>();
  const [selectEnclosures, setSelectEnclosures] = useState(false);
  const [disassembleOnHover, setDisassembleOnHover] = useState(false);
  const [resetViewKey, setResetViewKey] = useState(0);
  const selectedPart = parts.find((part) => part.id === selectedPartId);
  const hoveredPart = parts.find((part) => part.id === hoveredPartId);
  const guideFocusIds = guide?.focusPartIds ?? [];
  const visibleRoutes = guide?.showRoutes === false
    ? []
    : guide?.routeIds && guide.routeIds.length > 0
      ? routes.filter((route) => guide.routeIds?.includes(route.id))
      : routes;
  const listedParts = guideFocusIds.length > 0
    ? parts.filter((part) => guideFocusIds.includes(part.id))
    : parts;

  if (parts.length === 0) {
    return <section className="viewer panel"><h2>{learnerFriendlyText(heading)}</h2><p className="helper" role="alert">{learnerFriendlyText(layoutMessage)}</p></section>;
  }

  const modelCenter = parts.reduce<[number, number, number]>((sum, part) => [
    sum[0] + part.positionMm[0] + part.dimensionsMm[0] / 2,
    sum[1] + part.positionMm[1] + part.dimensionsMm[1] / 2,
    sum[2] + part.positionMm[2] + part.dimensionsMm[2] / 2,
  ], [0, 0, 0]).map((coordinate) => coordinate / parts.length) as [number, number, number];
  const cameraTarget: [number, number, number] = selectedPart
    ? [
      selectedPart.positionMm[0] + selectedPart.dimensionsMm[0] / 2,
      selectedPart.positionMm[1] + selectedPart.dimensionsMm[1] / 2,
      selectedPart.positionMm[2] + selectedPart.dimensionsMm[2] / 2,
    ]
    : modelCenter;
  const focusLabel = selectedPart ? "SELECTED" : hoveredPart ? "HOVER PREVIEW" : guideFocusIds.length > 0 ? "STEP FOCUS" : "EXPLORE THE MODEL";

  function canSelectPart(partId: string): boolean {
    const part = parts.find((candidate) => candidate.id === partId);
    return part !== undefined && (selectEnclosures || part.isContainer !== true);
  }

  function selectPart(partId: string | undefined): void {
    if (partId !== undefined && !canSelectPart(partId)) return;
    setSelectedPartId((current) => nextSelectedPartId(current, partId));
    setHoveredPartId(undefined);
  }

  function previewPart(partId: string | undefined): void {
    if (selectedPartId || (partId !== undefined && !canSelectPart(partId))) return;
    setHoveredPartId(partId);
  }

  function changeSelectEnclosures(nextValue: boolean): void {
    setSelectEnclosures(nextValue);
    if (!nextValue && selectedPart?.isContainer) setSelectedPartId(undefined);
    if (!nextValue && hoveredPart?.isContainer) setHoveredPartId(undefined);
  }

  function resetModelView(): void {
    setSelectedPartId(undefined);
    setHoveredPartId(undefined);
    setResetViewKey((current) => current + 1);
  }

  return (
    <section className="viewer panel">
      <h2>{learnerFriendlyText(heading)}</h2>
      <div className="viewer-stage">
        <div className="canvas">
          <Suspense fallback={<p>Loading the 3D view...</p>}>
            <LazyMechView
              parts={[...parts]}
              routes={visibleRoutes}
              highlightIds={selectedPart ? [selectedPart.id] : [...guideFocusIds]}
              selectedPartId={selectedPart?.id}
              hoveredPartId={hoveredPart?.id}
              disassembleOnHover={disassembleOnHover}
              selectEnclosures={selectEnclosures}
              cameraTarget={cameraTarget}
              resetViewKey={resetViewKey}
              onSelect={selectPart}
              onHover={previewPart}
            />
          </Suspense>
        </div>
        <aside className="part-focus-panel" aria-live="polite">
          <p className="eyebrow">{focusLabel}</p>
          {selectedPart ? (
            <>
              <h3>{learnerPartName(selectedPart.name)}</h3>
              <p>{learnerFriendlyText(selectedPart.purpose)}</p>
              <p className="focus-hint">{selectedPart.isContainer
                ? "The enclosure stays anchored so the complete build remains in place. Click it again, or click empty space, to clear the inspection."
                : "Nearby parts separate for inspection while the rest of the model stays anchored. Click it again, or click empty space, to reassemble."}
              </p>
            </>
          ) : hoveredPart ? <p>Previewing {learnerPartName(hoveredPart.name)}. Click it to select and centre it.</p> : guide ? <p>{learnerFriendlyText(guide.description)}</p> : <p>{disassembleOnHover ? "Hover over a part to preview it, or select one to keep it centred." : "Hover preview is off; click a part to select and inspect it."}</p>}
          <label className="hover-toggle">
            <input type="checkbox" checked={disassembleOnHover} onChange={(event) => {
              setDisassembleOnHover(event.target.checked);
              if (!event.target.checked) setHoveredPartId(undefined);
            }} />
            <span>Disassemble on hover</span>
            <small>{disassembleOnHover ? "Automatic: nearby parts separate as you move closer, while distant parts stay anchored." : "Hover preview is off; click a part to select and inspect it."}</small>
          </label>
          <label className="enclosure-toggle">
            <input type="checkbox" checked={selectEnclosures} onChange={(event) => changeSelectEnclosures(event.target.checked)} />
            <span>Select enclosures</span>
            <small>{selectEnclosures ? "Enclosures can be selected and inspected without separating the model." : "Automatic: click through enclosures to the parts inside."}</small>
          </label>
          <button type="button" className="view-reset" onClick={resetModelView}>Center &amp; reset model</button>
        </aside>
      </div>
      {showPartList ? (
        <section className="part-detail">
          <h3>{guideFocusIds.length > 0 ? "Parts highlighted in this step" : `Parts in this model (${parts.length})`}</h3>
          <ul className="part-list">
            {listedParts.map((part) => (
              <li key={part.id}>
                <button
                  type="button"
                  className={part.id === selectedPart?.id ? "part-picker active" : "part-picker"}
                  aria-pressed={part.id === selectedPart?.id}
                  disabled={part.isContainer === true && !selectEnclosures}
                  onClick={() => selectPart(part.id)}
                >
                  <strong>{learnerPartName(part.name)}</strong>
                  <span>{learnerFriendlyText(part.purpose)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="helper">{learnerFriendlyText(layoutMessage)} {learnerFriendlyText(guide?.description ?? `Showing step ${stepOrder}.`)}</p>
    </section>
  );
}

function SourceDigestBlock({ sourceDigest }: { sourceDigest: SourceDigest }) {
  return (
    <section className="learning-block source-digest-block">
      <h3>In plain language</h3>
      <p>{learnerFriendlyText(sourceDigest.summary)}</p>
      <span className="source-digest-citation">Based on {sourceDigest.citation.title}, {sourceDigest.citation.locator}.</span>
    </section>
  );
}

function CitationList({ citations, heading = "Check the original source" }: { citations: readonly Citation[]; heading?: string }) {
  return (
    <details className="citation-library">
      <summary>{heading}</summary>
      <p className="helper">Open a cited source if you want additional context or the step explanation does not answer your question.</p>
      <ul className="learning-source-list">
        {citations.map((citation) => (
          <li key={citation.sourceUrl + ":" + citation.locator}>
            <article className="citation-reference">
              <div>
                <h4>{citation.title}</h4>
                <p>Find it: {citation.locator}</p>
              </div>
              <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open source</a>
            </article>
          </li>
        ))}
      </ul>
    </details>
  );
}

function WorkshopTimeline({
  steps,
  activeIndex,
  completedStepIds,
  showingOverview,
  onMove,
  onShowOverview,
}: {
  steps: readonly WorkshopStepView[];
  activeIndex: number;
  completedStepIds: ReadonlySet<string>;
  showingOverview: boolean;
  onMove: (index: number) => void;
  onShowOverview: () => void;
}) {
  const timelineTrackRef = useRef<HTMLOListElement>(null);
  const completedCount = steps.filter((step) => completedStepIds.has(step.id)).length;
  const progressPercent = steps.length === 0 ? 0 : Math.round((completedCount / steps.length) * 100);

  useEffect(() => {
    const track = timelineTrackRef.current;
    if (!track) return;
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (showingOverview) {
      track.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    const currentStep = track.querySelector<HTMLLIElement>(`[data-timeline-step="${activeIndex}"]`);
    if (!currentStep) return;
    track.scrollTo({
      left: Math.max(0, currentStep.offsetLeft - (track.clientWidth - currentStep.offsetWidth) / 2),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex, completedCount, showingOverview]);

  const moveToPrevious = () => {
    if (!showingOverview && activeIndex > 0) onMove(activeIndex - 1);
  };
  const moveToNext = () => {
    if (showingOverview && steps.length > 0) onMove(0);
    else if (activeIndex < steps.length - 1) onMove(activeIndex + 1);
  };

  return (
    <section className="workshop-timeline" aria-label="Workshop learning plan">
      <div className="timeline-heading">
        <div>
          <p className="eyebrow">LEARNING PLAN</p>
          <h2>See the whole build, then zoom into each action.</h2>
        </div>
        <div className="timeline-progress" aria-label={`${progressPercent}% of Workshop steps complete`}>
          <span>{progressPercent}% complete</span>
          <div
            className="timeline-progress-meter"
            role="progressbar"
            aria-label="Workshop completion"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={completedCount}
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <small>{completedCount} of {steps.length} steps complete. Every step remains available.</small>
        </div>
      </div>
      <nav className="timeline-controls" aria-label="Workshop step navigation">
        <button
          type="button"
          className={showingOverview ? "timeline-overview active" : "timeline-overview"}
          aria-current={showingOverview ? "step" : undefined}
          onClick={onShowOverview}
        >
          <span className="timeline-step-number">VIEW</span>
          <span className="timeline-step-title">Assembly</span>
        </button>
        <button type="button" className="timeline-arrow" aria-label="Go to previous Workshop step" disabled={showingOverview || activeIndex === 0} onClick={moveToPrevious}>
          <span aria-hidden="true">‹</span>
        </button>
        <div className="timeline-viewport">
          <ol ref={timelineTrackRef} className="timeline-track">
          {steps.map((step, index) => {
            const completed = completedStepIds.has(step.id);
            const current = !showingOverview && activeIndex === index;
            const status = current ? "current" : completed ? "completed" : "available";
            return (
              <li key={step.id} data-timeline-step={index}>
                <button
                  type="button"
                  className={`timeline-step ${status}`}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${step.order}: ${learnerFriendlyText(step.title)}. ${status}.`}
                  onClick={() => onMove(index)}
                >
                  <span className="timeline-step-number">{String(step.order).padStart(2, "0")}</span>
                  <span className="timeline-step-title">{learnerFriendlyText(step.title)}</span>
                </button>
              </li>
            );
          })}
          </ol>
        </div>
        <button type="button" className="timeline-arrow" aria-label="Go to next Workshop step" disabled={!showingOverview && activeIndex === steps.length - 1} onClick={moveToNext}>
          <span aria-hidden="true">›</span>
        </button>
      </nav>
    </section>
  );
}

function WorkshopOverview({
  lessonTitle,
  firstStep,
  onOpenFirstStep,
  parts,
  routes,
  layoutMessage,
}: {
  lessonTitle: string;
  firstStep: WorkshopStepView;
  onOpenFirstStep: () => void;
  parts: readonly MechViewPart[];
  routes: readonly MechViewRoute[];
  layoutMessage: string;
}) {
  return (
    <section className="workshop-overview">
      <div className="overview-introduction panel">
        <p className="eyebrow">START WITH THE ASSEMBLY</p>
        <h2>{learnerFriendlyText(lessonTitle)}</h2>
        <p>Orient yourself with the complete model first. Then use the plan above to move freely between the practical actions, visual guides, explanations, and cited reading.</p>
        <dl className="overview-notes">
          <div><dt>Model</dt><dd>Source-backed component proxies and deterministic connection routes.</dd></div>
          <div><dt>Plan</dt><dd>Every step is available now. Reviewing a step does not lock or grade the next one.</dd></div>
        </dl>
        <button className="primary" type="button" onClick={onOpenFirstStep}>Open step {firstStep.order}: {learnerFriendlyText(firstStep.title)}</button>
      </div>
      <InteractiveAssemblyViewer
        parts={parts}
        routes={routes}
        layoutMessage={layoutMessage}
        heading="Full 3D build overview"
        stepOrder={firstStep.order}
        guide={{
          title: "Full 3D build overview",
          description: "Rotate the complete model, inspect any component, and trace the checked route before working through an individual step.",
          showRoutes: true,
        }}
      />
    </section>
  );
}

function WorkshopStepVisual({
  step,
  parts,
  routes,
  layoutMessage,
  supplement,
}: {
  step: WorkshopStepView;
  parts: readonly MechViewPart[];
  routes: readonly MechViewRoute[];
  layoutMessage: string;
  supplement?: ReactNode;
}) {
  const guide = visualGuideForStep(step);
  return (
    <section className="workshop-step-visual" aria-label={`Visual guide for ${learnerFriendlyText(step.title)}`}>
      {guide.kind === "diagram" ? (
        <section className="step-diagram panel">
          <header>
            <p className="eyebrow">VISUAL GUIDE</p>
            <h2>{learnerFriendlyText(guide.title)}</h2>
            <p>{learnerFriendlyText(guide.description)}</p>
          </header>
          <WiringDiagram key={`${step.id}:${guide.initialNet ?? "all"}`} netlist={weatherStationWiringNetlist} initialNet={guide.initialNet} />
        </section>
      ) : (
        <InteractiveAssemblyViewer
          key={step.id}
          parts={parts}
          routes={routes}
          layoutMessage={layoutMessage}
          heading={guide.model.title}
          stepOrder={step.order}
          guide={guide.model}
          showPartList={false}
        />
      )}
      {supplement}
    </section>
  );
}

function WorkshopStepDetails({
  step,
  totalSteps,
  isLastStep,
  message,
  onComplete,
  onOpenSkill,
  supplement,
}: {
  step: WorkshopStepView;
  totalSteps: number;
  isLastStep: boolean;
  message: string;
  onComplete: () => void;
  onOpenSkill: (skill: SkillReference) => void;
  supplement?: ReactNode;
}) {
  const concepts = step.concepts.length > 0
    ? step.concepts
    : step.skills.map((skill) => ({ title: skill.title, explanation: skill.relevance }));
  const completionCondition = step.completionCondition ?? `You can explain how you completed ${step.title.toLowerCase()} using the cited source.`;
  const whyItMatters = step.whyItMatters ?? "Use the cited source and further reading to understand the reason for this action before changing the assembly.";

  return (
    <article className="lesson-details panel">
      <header className="lesson-details-heading">
        <p className="step-count">Step {step.order} of {totalSteps}</p>
        <h2>{learnerFriendlyText(step.title)}</h2>
      </header>

      <section className="learning-block action-block">
        <h3>What to do</h3>
        <p>{learnerFriendlyText(step.instruction)}</p>
      </section>

      <SourceDigestBlock sourceDigest={step.sourceDigest} />

      <section className="learning-block why-block">
        <h3>Why this matters</h3>
        <p>{learnerFriendlyText(whyItMatters)}</p>
      </section>

      {step.safetyCallout ? (
        <aside className="preparation-note">
          <h3>Before you begin</h3>
          <p>{learnerFriendlyText(step.safetyCallout)}</p>
        </aside>
      ) : null}

      {concepts.length > 0 ? (
        <section className="learning-block concepts-block">
          <h3>Concepts to notice</h3>
          <ul className="concept-list">
            {concepts.map((concept) => (
              <li key={concept.title}>
                <h4>{learnerFriendlyText(concept.title)}</h4>
                {concept.explanation !== whyItMatters ? <p>{learnerFriendlyText(concept.explanation)}</p> : <p>Use the cited source below to explore this idea in more detail.</p>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="completion-condition">
        <h3>Finish this step when</h3>
        <p>{learnerFriendlyText(completionCondition)}</p>
      </section>

      <CitationList citations={step.citations} />
      <SkillReferenceList skills={step.skills} onOpen={onOpenSkill} />
      {supplement}

      <p className="message" aria-live="polite">{message}</p>
      <div className="workshop-completion-action">
        <button className="primary" type="button" onClick={onComplete}>
          {isLastStep ? "Finish build" : "Mark complete and continue"}
        </button>
      </div>
    </article>
  );
}

function SimilarProjects({ steps }: { steps: readonly WorkshopStepView[] }) {
  const citations = steps.flatMap((step) => step.citations)
    .filter((citation, index, values) => values.findIndex((value) => value.sourceUrl === citation.sourceUrl && value.locator === citation.locator) === index)
    .slice(0, 3);

  return (
    <section className="similar-projects">
      <header>
        <p className="eyebrow">SIMILAR PROJECTS</p>
        <h2>References for your next iteration.</h2>
        <p>Browse a mix of documented ideas, diagrams, and source links without leaving the build context.</p>
      </header>
      <Masonry className="similar-projects__grid">
        <SpotlightCard className="similar-project similar-project--photo">
          <img src="/images/lumos-smart-lamp.jpg" alt="LUMOS smart lamp project reference" loading="lazy" />
          <div>
            <span>Referenced project</span>
            <h3>LUMOS smart lamp</h3>
            <p>A lighting project with open source files, a clear physical form, and an electronics assembly story.</p>
            <a href="https://www.hackster.io/JontyDIY/lumos-smart-lamp-for-better-sleep-d5987e" target="_blank" rel="noreferrer">Open project</a>
            <small>Image: Jonty, CC BY via Hackster</small>
          </div>
        </SpotlightCard>
        <SpotlightCard className="similar-project similar-project--diagram">
          <span>Working diagram</span>
          <h3>Named signal paths</h3>
          <p>Use the same visual language when you compare a source-backed connection with your own build.</p>
          <WiringDiagram netlist={weatherStationWiringNetlist} initialNet="I2C_SDA" />
        </SpotlightCard>
        {citations.map((citation) => (
          <SpotlightCard className="similar-project similar-project--reference" key={citation.sourceUrl + ":" + citation.locator}>
            <span>Source link</span>
            <h3>{citation.title}</h3>
            <p>Find the relevant detail at {citation.locator}.</p>
            <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open reference</a>
          </SpotlightCard>
        ))}
      </Masonry>
    </section>
  );
}

function WorkshopExperience({
  lessonTitle,
  steps,
  activeIndex,
  complete,
  showingOverview,
  completedStepIds,
  message,
  onMove,
  onShowOverview,
  onComplete,
  onOpenSkill,
  onOpenHelp,
  visualSupplement,
  lessonSupplement,
}: {
  lessonTitle: string;
  steps: readonly WorkshopStepView[];
  activeIndex: number;
  complete: boolean;
  showingOverview: boolean;
  completedStepIds: ReadonlySet<string>;
  message: string;
  onMove: (index: number) => void;
  onShowOverview: () => void;
  onComplete: () => void;
  onOpenSkill: (skill: SkillReference) => void;
  onOpenHelp: (section: Tab) => void;
  visualSupplement?: (step: WorkshopStepView) => ReactNode;
  lessonSupplement?: (step: WorkshopStepView) => ReactNode;
}) {
  const schematicScene = useMemo(() => createSchematicScene(), []);
  const step = steps[activeIndex] ?? steps[0];

  if (!step) {
    return <section className="completion panel"><h2>No Workshop steps are available.</h2><p className="helper">Choose a cited build plan to populate the Workshop.</p></section>;
  }

  if (complete) {
    return (
      <section className="completion panel">
        <p className="eyebrow">BUILD REVIEW</p>
        <h2>{learnerFriendlyText(lessonTitle)}</h2>
        <p>You can return to the full model or revisit any step whenever you need it.</p>
        <button className="primary" type="button" onClick={onShowOverview}>Return to Workshop overview</button>
      </section>
    );
  }

  return (
    <section className="workshop-view workshop-view--redesigned">
      <header className="workshop-hero">
        <div>
          <p className="eyebrow">WORKSHOP</p>
          <h1>Build with confidence.</h1>
          <p>Move freely between the 3D model, cited instructions, and the exact action you want to understand next.</p>
        </div>
        <button type="button" className="landing-help-link" onClick={() => onOpenHelp("Workshop")}>How to use the Workshop</button>
      </header>
      <div className="workshop-experience__layout">
        <aside className="workshop-stepper">
          <div className="workshop-stepper__heading">
            <p className="eyebrow">BUILD PATH</p>
            <h2>Make it one action at a time.</h2>
            <p>{completedStepIds.size} of {steps.length} steps complete. Every step is available now.</p>
          </div>
          <Stepper
            steps={steps.map((workshopStep) => ({
              id: workshopStep.id,
              title: learnerFriendlyText(workshopStep.title),
              order: workshopStep.order,
            }))}
            activeIndex={activeIndex}
            completedStepIds={completedStepIds}
            showingOverview={showingOverview}
            onSelect={onMove}
            onShowOverview={onShowOverview}
          />
        </aside>
        <div className="workshop-experience__content">
          {showingOverview ? (
            <WorkshopOverview
              lessonTitle={lessonTitle}
              firstStep={steps[0]!}
              onOpenFirstStep={() => onMove(0)}
              parts={schematicScene.parts}
              routes={schematicScene.routes}
              layoutMessage={schematicScene.message}
            />
          ) : (
            <div className="workshop-step-layout">
              <WorkshopStepVisual
                step={step}
                parts={schematicScene.parts}
                routes={schematicScene.routes}
                layoutMessage={schematicScene.message}
                supplement={visualSupplement?.(step)}
              />
              <WorkshopStepDetails
                step={step}
                totalSteps={steps.length}
                isLastStep={activeIndex === steps.length - 1}
                message={message}
                onComplete={onComplete}
                onOpenSkill={onOpenSkill}
                supplement={lessonSupplement?.(step)}
              />
            </div>
          )}
          <SimilarProjects steps={steps} />
        </div>
      </div>
    </section>
  );
}

function FitCheck({ solverResult }: { solverResult: ReturnType<typeof solveSelectedProposalParts> }) {
  return (
    <section className="fit-check panel">
      <h3>Fit check</h3>
      {solverResult.ok ? (
        <>
          <p>{solverResult.message}</p>
          <ul className="fit-check-list">
            {solverResult.traces.map((trace) => (
              <li key={trace.transform.stepId + ":" + trace.selection.movingPartId + ":" + trace.selection.targetPartId}>
                <strong>Step {trace.transform.stepId}</strong>
                <span>Connection checked by the deterministic solver.</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <section className="retry" role="alert">
          <h3>Try a new fit</h3>
          <p>{solverResult.rejection.message}</p>
          <p>{solverResult.rejection.retryInstruction}</p>
        </section>
      )}
    </section>
  );
}

function Troubleshooting({ entries }: { entries: PublicGuidedLesson["troubleshooting"] }) {
  if (entries.length === 0) return null;
  return (
    <section className="troubleshooting">
      <h3>When something does not work</h3>
      {entries.map((item) => (
        <article key={item.problem}>
          <h4>{learnerFriendlyText(item.problem)}</h4>
          <p>{learnerFriendlyText(item.explanation)}</p>
          <CitationList citations={item.citations} heading="Troubleshooting source" />
        </article>
      ))}
    </section>
  );
}

function WorkshopPanel({
  activeIndex,
  complete,
  showingOverview,
  completedStepIds,
  message,
  retryDemo,
  onMove,
  onShowOverview,
  onRetry,
  onComplete,
  onOpenSkill,
  onOpenHelp,
}: {
  activeIndex: number;
  complete: boolean;
  showingOverview: boolean;
  completedStepIds: ReadonlySet<string>;
  message: string;
  retryDemo?: SolverRetryDemo;
  onMove: (index: number) => void;
  onShowOverview: () => void;
  onRetry: () => void;
  onComplete: () => void;
  onOpenSkill: (skill: SkillReference) => void;
  onOpenHelp: (section: Tab) => void;
}) {
  return (
    <WorkshopExperience
      lessonTitle="Weather station assembly"
      steps={fixtureWorkshopSteps}
      activeIndex={activeIndex}
      complete={complete}
      showingOverview={showingOverview}
      completedStepIds={completedStepIds}
      message={message}
      onMove={onMove}
      onShowOverview={onShowOverview}
      onComplete={onComplete}
      onOpenSkill={onOpenSkill}
      onOpenHelp={onOpenHelp}
      lessonSupplement={(step) => step.order === 8 ? (
        <section className="learning-tryout">
          <h3>Explore the fit check</h3>
          <p>The model checks a named mechanical relationship. If it does not fit, it provides a new symbolic choice instead of inventing coordinates.</p>
          <button type="button" onClick={onRetry}>Show the fit check</button>
          {retryDemo?.ok ? (
            <div className="retry-result">
              <p><strong>First try:</strong> {retryDemo.firstAttempt}</p>
              <p><strong>New try:</strong> {retryDemo.retry}</p>
            </div>
          ) : retryDemo ? <p className="message">{retryDemo.message}</p> : null}
        </section>
      ) : null}
    />
  );
}

function SelectedWorkshopPanel({
  workshop,
  activeIndex,
  complete,
  showingOverview,
  completedStepIds,
  message,
  onMove,
  onShowOverview,
  onComplete,
  onOpenSkill,
  onOpenHelp,
}: {
  workshop: SelectedWorkshop;
  activeIndex: number;
  complete: boolean;
  showingOverview: boolean;
  completedStepIds: ReadonlySet<string>;
  message: string;
  onMove: (index: number) => void;
  onShowOverview: () => void;
  onComplete: () => void;
  onOpenSkill: (skill: SkillReference) => void;
  onOpenHelp: (section: Tab) => void;
}) {
  const solverResult = useMemo(() => solveSelectedProposalParts(workshop.lesson), [workshop.lesson]);
  return (
    <WorkshopExperience
      lessonTitle={workshop.lesson.title}
      steps={workshop.lesson.steps}
      activeIndex={activeIndex}
      complete={complete}
      showingOverview={showingOverview}
      completedStepIds={completedStepIds}
      message={message}
      onMove={onMove}
      onShowOverview={onShowOverview}
      onComplete={onComplete}
      onOpenSkill={onOpenSkill}
      onOpenHelp={onOpenHelp}
      visualSupplement={() => <FitCheck solverResult={solverResult} />}
      lessonSupplement={() => <Troubleshooting entries={workshop.lesson.troubleshooting} />}
    />
  );
}

function Workshop() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState("Start with a project idea.");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [ownedPartsText, setOwnedPartsText] = useState("");
  const [progress, setProgress] = useState<Progress>({ stage: "queued", message: "Waiting to start", percent: 0 });
  const [pipelineStages, setPipelineStages] = useState<Progress[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryView>();
  const [discoveryError, setDiscoveryError] = useState<string>();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showingOverview, setShowingOverview] = useState(true);
  const [completedStepIds, setCompletedStepIds] = useState<ReadonlySet<string>>(() => new Set());
  const [retryDemo, setRetryDemo] = useState<SolverRetryDemo>();
  const [selectedWorkshop, setSelectedWorkshop] = useState<SelectedWorkshop>();
  const [selectedSkill, setSelectedSkill] = useState<SkillReference>();
  const [selectedHelp, setSelectedHelp] = useState<Tab>();
  const [isStartingWorkshop, setIsStartingWorkshop] = useState(false);
  const eventSource = useRef<EventSource | undefined>(undefined);
  const ownedParts = useMemo(() => parseOwnedParts(ownedPartsText), [ownedPartsText]);
  const ownedInventoryPartIds = useMemo(() => matchedInventoryPartIds(ownedParts), [ownedParts]);

  useEffect(() => () => eventSource.current?.close(), []);

  async function startDiscovery(options: DiscoveryOptions = {}) {
    eventSource.current?.close();
    setHasStarted(false);
    setComplete(false);
    setShowingOverview(true);
    setCompletedStepIds(new Set());
    setActiveIndex(0);
    setRetryDemo(undefined);
    setDiscovery(undefined);
    setSelectedWorkshop(undefined);
    setSelectedSkill(undefined);
    setSelectedHelp(undefined);
    setDiscoveryError(undefined);
    setIsDiscovering(true);
    setMessage("Checking your project.");
    setProgress({ stage: "queued", message: "Queueing your discovery request", percent: 0 });
    setPipelineStages([]);

    try {
      const advancedConstraints = [
        options.preferredMicrocontroller ? "Preferred microcontroller: " + options.preferredMicrocontroller : undefined,
        options.formFactor ? "Form factor: " + options.formFactor : undefined,
      ].filter((constraint): constraint is string => constraint !== undefined);
      const request = DiscoveryRequestSchema.parse({
        prompt: projectPrompt,
        mode: "beginner",
        userId: discoveryUserId,
        inventoryPartIds: ownedInventoryPartIds,
        budget: options.maxBudget ? { currency: "USD", maxAmount: options.maxBudget } : undefined,
        constraints: ["local catalog only", ...advancedConstraints],
      });
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = await parseApiJson<{ operationId?: unknown; error?: unknown }>(response);
      if (!response.ok || typeof payload.operationId !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Discovery could not be started.");
      }

      const stream = new EventSource("/api/discovery/" + payload.operationId + "/events");
      eventSource.current = stream;
      stream.addEventListener("progress", (event) => {
        try {
          const update = DiscoveryProgressEventSchema.parse(JSON.parse((event as MessageEvent<string>).data));
          const { operationId: _operationId, ...nextProgress } = update;
          setProgress(nextProgress);
          setPipelineStages((previous) => (
            previous.some((item) => item.stage === nextProgress.stage) ? previous : [...previous, nextProgress]
          ));
          if (nextProgress.stage === "ready" || nextProgress.stage === "rejected") {
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
      const nextMessage = error instanceof Error ? error.message : "Discovery could not be started.";
      setIsDiscovering(false);
      setDiscoveryError(nextMessage);
      setProgress({ stage: "error", message: nextMessage, percent: 100 });
    }
  }

  async function loadDiscoveryResult(operationId: string) {
    try {
      const response = await fetch("/api/discovery/" + operationId);
      const payload = await parseApiJson<{
        status?: unknown;
        classification?: unknown;
        proposal?: unknown;
        error?: unknown;
      }>(response);
      if (!response.ok || (payload.status !== "ready" && payload.status !== "rejected")) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Discovery status could not be loaded.");
      }
      const classification = RequestClassificationSchema.parse(payload.classification);
      const proposal = payload.proposal === null ? null : BuildProposalSchema.parse(payload.proposal);
      setDiscovery({ operationId, prompt: projectPrompt, classification, proposal });
      setIsDiscovering(false);
      if (classification.outcome === "approved" && proposal) {
        setHasStarted(true);
        setMessage("Your plan is ready.");
      } else {
        setHasStarted(false);
        setDiscoveryError(classification.message);
        setMessage(classification.message);
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Discovery status could not be loaded.";
      setIsDiscovering(false);
      setDiscoveryError(nextMessage);
      setProgress({ stage: "error", message: nextMessage, percent: 100 });
    }
  }

  async function moveTo(index: number) {
    if (!hasStarted) {
      setActiveTab("Dashboard");
      setMessage("Make a plan before opening the workshop.");
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
    setComplete(false);
    setShowingOverview(false);
    setRetryDemo(undefined);
    setMessage("Step " + target.order + " is ready.");
  }

  function markStepComplete(stepId: string) {
    setCompletedStepIds((previous) => previous.has(stepId) ? previous : new Set([...previous, stepId]));
  }

  async function completeFixtureStep() {
    const step = weatherStationGoldenSteps[activeIndex];
    if (!step) return;
    markStepComplete(step.id);
    if (activeIndex === weatherStationGoldenSteps.length - 1) {
      setComplete(true);
      setMessage("All Workshop steps are complete. You can revisit any of them at any time.");
      return;
    }
    await moveTo(activeIndex + 1);
  }

  async function startSelectedWorkshop() {
    setActiveTab("Workshop");
    if (!discovery?.proposal || selectedWorkshop) return;
    setIsStartingWorkshop(true);
    setMessage("Opening your lesson.");
    try {
      const response = await fetch("/api/discovery/" + discovery.operationId + "/select", { method: "POST" });
      const payload = WorkshopPromotionResponseSchema.parse(await parseApiJson(response));
      setSelectedWorkshop(payload);
      setActiveIndex(0);
      setComplete(false);
      setShowingOverview(true);
      setCompletedStepIds(new Set());
      setMessage("Your lesson is ready. You can choose any step.");
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
    setComplete(false);
    setShowingOverview(false);
    setMessage("Step " + target.order + " is ready.");
  }

  async function completeSelectedStep() {
    const workshop = selectedWorkshop;
    const step = workshop?.lesson.steps[activeIndex];
    if (!workshop || !step) return;
    markStepComplete(step.id);
    if (activeIndex === workshop.lesson.steps.length - 1) {
      setComplete(true);
      setMessage("All Workshop steps are complete. You can revisit any of them at any time.");
      return;
    }
    await moveSelectedTo(activeIndex + 1);
  }

  function showWorkshopOverview() {
    setComplete(false);
    setShowingOverview(true);
  }

  function selectTab(tab: Tab) {
    if (isStartingWorkshop) return;
    if (tab === "Workshop" && discovery?.proposal && !selectedWorkshop) {
      void startSelectedWorkshop();
      return;
    }
    setActiveTab(tab);
  }

  const content = activeTab === "Dashboard"
    ? (
      <Dashboard
        prompt={projectPrompt}
        ownedPartsText={ownedPartsText}
        progress={progress}
        stages={pipelineStages}
        discovery={discovery}
        error={discoveryError}
        isDiscovering={isDiscovering}
        onPromptChange={setProjectPrompt}
        onOwnedPartsChange={setOwnedPartsText}
        onStart={(options) => void startDiscovery(options)}
        onOpenHelp={setSelectedHelp}
      />
    )
    : activeTab === "Research"
      ? <ResearchPanel discovery={discovery} onOpenHelp={setSelectedHelp} />
      : activeTab === "Parts"
        ? <PartsPanel discovery={discovery} ownedParts={ownedParts} onOpenHelp={setSelectedHelp} />
        : isStartingWorkshop
          ? (
            <section className="completion panel">
              <p className="eyebrow">WORKSHOP</p>
              <h2>Opening your lesson...</h2>
              <p>{message}</p>
            </section>
          )
          : selectedWorkshop
            ? (
              <SelectedWorkshopPanel
                workshop={selectedWorkshop}
                activeIndex={activeIndex}
                complete={complete}
                showingOverview={showingOverview}
                completedStepIds={completedStepIds}
                message={message}
                onMove={(index) => void moveSelectedTo(index)}
                onShowOverview={showWorkshopOverview}
                onComplete={() => void completeSelectedStep()}
                onOpenSkill={setSelectedSkill}
                onOpenHelp={setSelectedHelp}
              />
            )
            : (
              <WorkshopPanel
                activeIndex={activeIndex}
                complete={complete}
                showingOverview={showingOverview}
                completedStepIds={completedStepIds}
                message={message}
                retryDemo={retryDemo}
                onMove={(index) => void moveTo(index)}
                onShowOverview={showWorkshopOverview}
                onRetry={() => setRetryDemo(runSolverRetryDemo())}
                onComplete={() => void completeFixtureStep()}
                onOpenSkill={setSelectedSkill}
                onOpenHelp={setSelectedHelp}
              />
              );

  const hasFloatingWorkshopTimeline = false;
  const hasFloatingWorkflowNavigation = activeTab !== "Workshop";
  const shellClassName = hasFloatingWorkshopTimeline
    ? "app-shell has-floating-workshop-timeline"
    : hasFloatingWorkflowNavigation
      ? "app-shell has-floating-workflow-navigation"
      : "app-shell";

  return (
    <main className={shellClassName}>
      <AppTabs active={activeTab} hasStarted={hasStarted} onSelect={selectTab} />
      {content}
      {activeTab !== "Workshop" ? (
        <WorkflowNavigation active={activeTab} hasStarted={hasStarted} onSelect={selectTab} />
      ) : null}
      <SectionHelpModal section={selectedHelp} onClose={() => setSelectedHelp(undefined)} />
      <SkillReferenceModal skill={selectedSkill} onClose={() => setSelectedSkill(undefined)} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workshop /></StrictMode>);
