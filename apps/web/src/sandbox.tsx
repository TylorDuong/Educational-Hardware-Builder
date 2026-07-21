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
import {
  demoParts,
  demoSubstitution,
  runSolverRetryDemo,
  type SolverRetryDemo,
} from "./demo-flow.js";
import type { MechViewPart, MechViewRoute } from "./components/MechView.js";
import { matchedInventoryPartIds, parseOwnedParts, type OwnedPartInput } from "./owned-parts.js";
import { createSchematicScene } from "./schematic-scene.js";
import { applicationSourcePolicies } from "./source-policies.js";
import { solveSelectedProposalParts } from "./spatial-integration.js";
import { weatherStationWiringNetlist } from "../../../packages/schemas/fixtures/weather-station-wiring.js";
import { WiringDiagram } from "./components/WiringDiagram.js";

import "./sandbox.css";

const sessionId = "workshop-demo";
const discoveryUserId = "40000000-0000-4000-8000-000000000001";
const tabs = ["Dashboard", "Research", "Parts", "Build", "Workshop"] as const;
const LazyMechView = lazy(async () => ({
  default: (await import("./components/MechView.js")).MechView,
}));

type Tab = typeof tabs[number];
type Progress = Omit<DiscoveryProgressEvent, "operationId">;
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
    entry.alternatives.map((alternative) => `${alternative.name} in place of ${entry.part.name} when the cited catalog marks it as compatible.`)
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
    title: "Starting a project",
    detail: "Describe what you want to make. The app checks local parts and learning sources, then creates a cited plan.",
  },
  Research: {
    title: "Using the research",
    detail: "These saved sources support your plan. Open a link when you want to see where a recommendation came from.",
  },
  Parts: {
    title: "Checking your parts",
    detail: "See the parts you already have, the parts you may need, and saved sourcing details. No live shopping happens here.",
  },
  Build: {
    title: "Checking the fit",
    detail: "The planner suggests named connections. A deterministic solver checks them before the 3D view uses them.",
  },
  Workshop: {
    title: "Using the workshop",
    detail: "Choose any step in any order. Use the 3D view to inspect parts, then open a skill reference whenever you want more detail.",
  },
};

const boundaryPolicies = [
  ["DIRECT LOGINS", "BLOCKED"],
  ["BROWSER TOOLS", "BLOCKED"],
  ["LIVE SHOPPING", "SAVED DATA ONLY"],
  ["SOURCES", "REQUIRED"],
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

async function requestStep(
  stepId: string,
  selected?: Pick<SelectedWorkshop, "sessionId" | "buildId">,
): Promise<{ error?: string }> {
  const query = selected
    ? new URLSearchParams({ sessionId: selected.sessionId, buildId: selected.buildId })
    : new URLSearchParams({ sessionId });
  const response = await fetch("/api/workshop/steps/" + stepId + "?" + query.toString());
  return response.ok ? {} : { error: (await response.json() as { error: string }).error };
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
    <nav className="app-tabs" aria-label="Workshop sections" data-flow-ready={hasStarted ? "true" : "false"}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={tab === active ? "tab active" : "tab"}
          aria-current={tab === active ? "page" : undefined}
          disabled={tab !== "Dashboard" && !hasStarted}
          onClick={() => onSelect(tab)}
        >
          {tab}
        </button>
      ))}
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
  return (
    <header className="page-heading">
      <div className="heading-row">
        <p className="eyebrow">{section}</p>
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
      <h3>{interpretedRequest}</h3>
      <p><strong>Status:</strong> {classification.outcome}</p>
      <p className="message">{classification.outcome === "approved" ? classification.reason : classification.message}</p>
      {proposal ? (
        <>
          <p className="eyebrow">YOUR PLAN</p>
          <h3>{proposal.summary}</h3>
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
  onOpenBuild,
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
  onStart: () => void;
  onOpenBuild: () => void;
  onOpenHelp: (section: Tab) => void;
}) {
  const complete = progress.stage === "ready";
  const rejected = progress.stage === "rejected";

  return (
    <section className="dashboard-view">
      <PageHeading section="Dashboard" title="Start a project" caption="Tell us what you want to build." onOpenHelp={onOpenHelp} />
      <div className="dashboard-grid">
        <section className="panel prompt-panel prompt-console">
          <div className="panel-heading">
            <p className="eyebrow">YOUR IDEA</p>
            <span className="status-indicator">READY</span>
          </div>
          <label htmlFor="project-prompt">What do you want to build?</label>
          <textarea
            id="project-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder={'e.g., "Build a USB desk light"'}
            disabled={isDiscovering}
          />
          <label htmlFor="owned-parts">What parts do you have? (optional)</label>
          <textarea
            id="owned-parts"
            value={ownedPartsText}
            onChange={(event) => onOwnedPartsChange(event.target.value)}
            placeholder="For example: ESP32 starter kit, BME280 sensor, breadboard and jumpers"
            disabled={isDiscovering}
          />
          <p className="helper">Add one part or kit per line.</p>
          <button className="primary" type="button" onClick={onStart} disabled={isDiscovering || prompt.trim().length === 0}>
            {isDiscovering ? "Making your plan" : "Make my plan"}
          </button>
        </section>

        <section className="panel discovery-log" aria-live="polite">
          <div className="panel-heading">
            <p className="eyebrow">YOUR PLAN</p>
            <span className="status-indicator">LIVE</span>
          </div>
          <h3 className="typed-status">{progress.message}</h3>
          <Pipeline stages={stages} />
          {error ? <p className="message" role="alert">{error}</p> : null}
          {!error && rejected ? <p className="message" role="alert">This request cannot make a hardware plan.</p> : null}
          {discovery ? <DiscoverySummary discovery={discovery} /> : null}
          {complete && discovery?.proposal
            ? <button className="primary" type="button" onClick={onOpenBuild}>See the research</button>
            : <p className="helper">Your plan will appear here.</p>}
        </section>

        <ServerStatus />
      </div>
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

  return (
    <section className="research-view">
      <PageHeading section="Research" title="Understand the build first" caption="Start with the plain-language plan. Sources are ready when you want to go deeper." onOpenHelp={onOpenHelp} />
      <div className="research-layout">
        <section className="research-content">
          <div className="research-context">
            <h3>{title}</h3>
            <p className="research-purpose">{brief.build}</p>
            {proposal ? (
              <section className="catalog-provenance">
                <h4>Saved parts data</h4>
                <p className={proposal.freshness === "stale" ? "freshness stale" : "freshness fresh"}>
                  {proposal.freshness === "stale" ? "Some saved options need checking." : "Saved options are ready to use."}
                </p>
                {offers.length > 0 ? (
                  <ul className="source-list compact-list">
                    {offers.map((offer) => (
                      <li key={offer.externalId}>
                        <strong>{offer.provider} / {offer.providerSku}</strong>
                        <span>Saved {new Date(offer.observedAt).toLocaleDateString()} / {offer.availability.replaceAll("_", " ")}</span>
                        <a href={offer.sourceUrl} target="_blank" rel="noreferrer">Open source record</a>
                        <span>{offer.citation.locator}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="helper">No saved offer is ready right now.</p>}
              </section>
            ) : null}
          </div>

          <section className="research-brief" aria-labelledby="research-brief-title">
            <header>
              <p className="eyebrow">BUILD BRIEF</p>
              <h2 id="research-brief-title">What you will make</h2>
              <p>{brief.build}</p>
            </header>
            <div className="research-brief-grid">
              <section>
                <h3>Conceptual parts you need</h3>
                <ul className="research-brief-list">
                  {brief.conceptualParts.map((part) => (
                    <li key={part.title}>
                      <strong>{part.title}</strong>
                      <span>{part.detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Potential use cases</h3>
                <ul className="research-brief-list">
                  {brief.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}
                </ul>
              </section>
              <section>
                <h3>Alternative builds</h3>
                <ul className="research-brief-list">
                  {brief.alternativeBuilds.map((alternative) => <li key={alternative}>{alternative}</li>)}
                </ul>
              </section>
            </div>
          </section>

          <div className="research-card-grid">
            {citations.map((citation, index) => (
              <article className="research-card" key={citation.sourceUrl + ":" + citation.locator}>
                <span className="citation-code">SOURCE {String(index + 1).padStart(2, "0")}</span>
                <h3>{citation.title}</h3>
                <p>Used in this plan.</p>
                <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open source</a>
                <span className="locator">Find it: {citation.locator}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel policy-panel">
          <p className="eyebrow">SOURCE RULES</p>
          <h3>Local first</h3>
          <dl>
            {boundaryPolicies.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <p className="helper">{applicationSourcePolicies.length} rules keep sources saved and cited.</p>
        </aside>
      </div>
    </section>
  );
}

function BuildPanel({
  onOpenWorkshop,
  isStartingWorkshop,
  onOpenHelp,
}: {
  onOpenWorkshop: () => void;
  isStartingWorkshop: boolean;
  onOpenHelp: (section: Tab) => void;
}) {
  return (
    <section className="build-view">
      <PageHeading section="Build" title="How the parts fit" caption="Every connection gets a quick fit check." onOpenHelp={onOpenHelp} />
      <div className="build-layout">
        <section className="panel build-plan">
          <p className="eyebrow">YOUR BUILD</p>
          <h3>ESP32 weather station</h3>
          <ol className="plan-list">
            {weatherStationGoldenSteps.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <span>{step.instruction}</span>
              </li>
            ))}
          </ol>
          <button className="primary" type="button" onClick={onOpenWorkshop} disabled={isStartingWorkshop}>
            {isStartingWorkshop ? "Opening workshop" : "Open workshop"}
          </button>
        </section>

        <section className="panel solver-console">
          <div className="panel-heading">
            <p className="eyebrow">FIT CHECK</p>
            <span className="status-indicator">CHECKED</span>
          </div>
          <div className="solver-flow" aria-label="Symbolic selection validation flow">
            <div className="solver-node">IDEA</div>
            <span className="flow-arrow" aria-hidden="true">&gt;</span>
            <div className="solver-node active">CHECK</div>
            <span className="flow-arrow" aria-hidden="true">&gt;</span>
            <div className="solver-node success">FIT</div>
          </div>
          <div className="solver-deny">RAW COORDINATES: BLOCKED</div>
          <pre aria-label="Example symbolic mating selection">{symbolicMatingPreview}</pre>
        </section>
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
            <span>{part.matchedName ? "Matches " + part.matchedName + "." : "Check this part before you use it."}</span>
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
              <span><strong>{part.name}</strong><small>{part.status}</small></span>
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

function PartsDetails({
  discovery,
  onOpenWorkshop,
}: {
  discovery?: DiscoveryView;
  onOpenWorkshop: () => void;
}) {
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
                <strong>{entry.part.name} x {entry.quantity}</strong>
                <span>{entry.rationale}</span>
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
                          <strong>{alternative.name}</strong>
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
          <p>Everything here comes from a saved local record.</p>
          <button className="primary" type="button" onClick={onOpenWorkshop}>See the build</button>
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
              <strong>{part.name}</strong>
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
        <button className="primary" type="button" onClick={onOpenWorkshop}>See the build</button>
      </section>
    </section>
  );
}

function PartsPanel({
  discovery,
  ownedParts,
  onOpenWorkshop,
  onOpenHelp,
}: {
  discovery?: DiscoveryView;
  ownedParts: readonly OwnedPartInput[];
  onOpenWorkshop: () => void;
  onOpenHelp: (section: Tab) => void;
}) {
  return (
    <>
      <ReportedOwnedParts ownedParts={ownedParts} />
      <ComponentBreakdown onOpenHelp={onOpenHelp} />
      <PartsDetails discovery={discovery} onOpenWorkshop={onOpenWorkshop} />
    </>
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
                  <p>{skill.relevance}</p>
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
        <p>{skill.relevance}</p>
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
    return <section className="viewer panel"><h2>{heading}</h2><p className="helper" role="alert">{layoutMessage}</p></section>;
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

  function selectPart(partId: string): void {
    if (!canSelectPart(partId)) return;
    setSelectedPartId(partId);
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
      <h2>{heading}</h2>
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
              <h3>{selectedPart.name}</h3>
              <p>{selectedPart.purpose}</p>
              <p className="focus-hint">The selected part stays solid while the rest of the model spreads out for inspection.</p>
            </>
          ) : hoveredPart ? <p>Previewing {hoveredPart.name}. Click it to select and centre it.</p> : guide ? <p>{guide.description}</p> : <p>{disassembleOnHover ? "Hover over a part to preview it, or select one to keep it centred." : "Hover preview is off; click a part to select and inspect it."}</p>}
          <label className="hover-toggle">
            <input type="checkbox" checked={disassembleOnHover} onChange={(event) => {
              setDisassembleOnHover(event.target.checked);
              if (!event.target.checked) setHoveredPartId(undefined);
            }} />
            <span>Disassemble on hover</span>
            <small>{disassembleOnHover ? "Automatic: move closer to a part for a faster, capped disassembly preview." : "Hover preview is off; click a part to select and inspect it."}</small>
          </label>
          <label className="enclosure-toggle">
            <input type="checkbox" checked={selectEnclosures} onChange={(event) => changeSelectEnclosures(event.target.checked)} />
            <span>Select enclosures</span>
            <small>{selectEnclosures ? "Enclosures can be selected." : "Automatic: click through enclosures to the parts inside."}</small>
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
                  <strong>{part.name}</strong>
                  <span>{part.purpose}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="helper">{layoutMessage} {guide?.description ?? `Showing step ${stepOrder}.`}</p>
    </section>
  );
}

function SourceDigestBlock({ sourceDigest }: { sourceDigest: SourceDigest }) {
  return (
    <section className="learning-block source-digest-block">
      <h3>In plain language</h3>
      <p>{sourceDigest.summary}</p>
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
    const currentStep = track.querySelector<HTMLElement>(`[data-timeline-step="${activeIndex}"]`);
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
          <span>Assembly</span>
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
              <li key={step.id}>
                <button
                  type="button"
                  className={`timeline-step ${status}`}
                  data-timeline-step={index}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${step.order}: ${step.title}. ${status}.`}
                  onClick={() => onMove(index)}
                >
                  <span className="timeline-step-number">{String(step.order).padStart(2, "0")}</span>
                  <span>{step.title}</span>
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
        <h2>{lessonTitle}</h2>
        <p>Orient yourself with the complete model first. Then use the plan above to move freely between the practical actions, visual guides, explanations, and cited reading.</p>
        <dl className="overview-notes">
          <div><dt>Model</dt><dd>Source-backed component proxies and deterministic connection routes.</dd></div>
          <div><dt>Plan</dt><dd>Every step is available now. Reviewing a step does not lock or grade the next one.</dd></div>
        </dl>
        <button className="primary" type="button" onClick={onOpenFirstStep}>Open step {firstStep.order}: {firstStep.title}</button>
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
    <section className="workshop-step-visual" aria-label={`Visual guide for ${step.title}`}>
      {guide.kind === "diagram" ? (
        <section className="step-diagram panel">
          <header>
            <p className="eyebrow">VISUAL GUIDE</p>
            <h2>{guide.title}</h2>
            <p>{guide.description}</p>
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
  activeIndex,
  totalSteps,
  message,
  onMove,
  onShowOverview,
  onComplete,
  onOpenSkill,
  supplement,
}: {
  step: WorkshopStepView;
  activeIndex: number;
  totalSteps: number;
  message: string;
  onMove: (index: number) => void;
  onShowOverview: () => void;
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
        <h2>{step.title}</h2>
      </header>

      <section className="learning-block action-block">
        <h3>What to do</h3>
        <p>{step.instruction}</p>
      </section>

      <SourceDigestBlock sourceDigest={step.sourceDigest} />

      <section className="learning-block why-block">
        <h3>Why this matters</h3>
        <p>{whyItMatters}</p>
      </section>

      {step.safetyCallout ? (
        <aside className="preparation-note">
          <h3>Before you begin</h3>
          <p>{step.safetyCallout}</p>
        </aside>
      ) : null}

      {concepts.length > 0 ? (
        <section className="learning-block concepts-block">
          <h3>Concepts to notice</h3>
          <ul className="concept-list">
            {concepts.map((concept) => (
              <li key={concept.title}>
                <h4>{concept.title}</h4>
                {concept.explanation !== whyItMatters ? <p>{concept.explanation}</p> : <p>Use the cited source below to explore this idea in more detail.</p>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="completion-condition">
        <h3>Finish this step when</h3>
        <p>{completionCondition}</p>
      </section>

      <CitationList citations={step.citations} />
      <SkillReferenceList skills={step.skills} onOpen={onOpenSkill} />
      {supplement}

      <p className="message" aria-live="polite">{message}</p>
      <nav className="workshop-footer-navigation" aria-label="Step navigation">
        <button type="button" disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)}>Previous</button>
        <button type="button" onClick={onShowOverview}>Build overview</button>
        <button type="button" disabled={activeIndex === totalSteps - 1} onClick={() => onMove(activeIndex + 1)}>Next</button>
        <button className="primary" type="button" onClick={onComplete}>
          {activeIndex === totalSteps - 1 ? "Finish build" : "Mark complete and continue"}
        </button>
      </nav>
    </article>
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
        <h2>{lessonTitle}</h2>
        <p>You can return to the full model or revisit any step whenever you need it.</p>
        <button className="primary" type="button" onClick={onShowOverview}>Return to build overview</button>
      </section>
    );
  }

  return (
    <section className="workshop-view">
      <PageHeading section="Workshop" title="Build with a visual learning plan" caption="Start with the complete assembly, then choose any step for its action guide, explanation, and cited reading." onOpenHelp={onOpenHelp} />
      <WorkshopTimeline
        steps={steps}
        activeIndex={activeIndex}
        completedStepIds={completedStepIds}
        showingOverview={showingOverview}
        onMove={onMove}
        onShowOverview={onShowOverview}
      />
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
            activeIndex={activeIndex}
            totalSteps={steps.length}
            message={message}
            onMove={onMove}
            onShowOverview={onShowOverview}
            onComplete={onComplete}
            onOpenSkill={onOpenSkill}
            supplement={lessonSupplement?.(step)}
          />
        </div>
      )}
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
          <h4>{item.problem}</h4>
          <p>{item.explanation}</p>
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

  async function startDiscovery() {
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
      const payload = await response.json() as {
        status?: unknown;
        classification?: unknown;
        proposal?: unknown;
        error?: unknown;
      };
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
      const payload = WorkshopPromotionResponseSchema.parse(await response.json());
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
        onStart={() => void startDiscovery()}
        onOpenBuild={() => setActiveTab("Research")}
        onOpenHelp={setSelectedHelp}
      />
    )
    : activeTab === "Research"
      ? (
        <>
          <ResearchPanel discovery={discovery} onOpenHelp={setSelectedHelp} />
          <section className="next-action panel">
            <button className="primary" type="button" onClick={() => setActiveTab("Parts")}>See the parts</button>
          </section>
        </>
      )
      : activeTab === "Build"
        ? <BuildPanel onOpenWorkshop={() => void startSelectedWorkshop()} isStartingWorkshop={isStartingWorkshop} onOpenHelp={setSelectedHelp} />
        : activeTab === "Parts"
          ? <PartsPanel discovery={discovery} ownedParts={ownedParts} onOpenWorkshop={() => setActiveTab("Build")} onOpenHelp={setSelectedHelp} />
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

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="brand-name">EDUCATIONAL HARDWARE BUILDER</p>
          <h1>Build something real.</h1>
          <p>Tell us what you want to make.</p>
        </div>
        <output className="system-output" aria-live="polite">
          <strong>{progress.stage}</strong>
          <span>{progress.message}</span>
          <small>DEMO MODE</small>
        </output>
      </header>
      <AppTabs active={activeTab} hasStarted={hasStarted} onSelect={setActiveTab} />
      {content}
      <SectionHelpModal section={selectedHelp} onClose={() => setSelectedHelp(undefined)} />
      <SkillReferenceModal skill={selectedSkill} onClose={() => setSelectedSkill(undefined)} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workshop /></StrictMode>);
