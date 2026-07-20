import { randomUUID } from "node:crypto";

import type { GuidedLesson, StepPlan } from "@educational-hardware-builder/schemas";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";

export const weatherStationBuildId = "weather-station";

export class WorkshopAccessError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type Checkpoint = {
  id: string;
  prompt: string;
  choices?: string[];
  correctAnswer: string;
};

type WorkshopStep = {
  id: string;
  checkpoint?: Checkpoint;
  reexplanation: string;
  source: Record<string, unknown>;
};

type WorkshopSession = {
  buildId: string;
  steps: readonly WorkshopStep[];
  completedCheckpoints: Set<string>;
};

function publicStep(step: WorkshopStep): Record<string, unknown> {
  const { checkpoint, ...withoutCheckpoint } = step.source;
  if (!checkpoint || typeof checkpoint !== "object") return withoutCheckpoint;
  const { correctAnswer: _correctAnswer, ...publicCheckpoint } = checkpoint as Checkpoint;
  return { ...withoutCheckpoint, checkpoint: publicCheckpoint };
}

function guidedStep(step: GuidedLesson["steps"][number]): WorkshopStep {
  return {
    id: step.id,
    checkpoint: step.checkpoint,
    reexplanation: `Revisit the safety guidance: ${step.safetyCallout} Then review the cited instruction: ${step.instruction}`,
    source: step as unknown as Record<string, unknown>,
  };
}

function authoredStep(step: StepPlan): WorkshopStep {
  return {
    id: step.id,
    checkpoint: step.checkpoint,
    reexplanation: `Revisit the idea: ${step.lesson.content}`,
    source: step as unknown as Record<string, unknown>,
  };
}

export function workshopStepsForLesson(lesson: GuidedLesson): WorkshopStep[] {
  return lesson.steps.map(guidedStep);
}

export function weatherStationWorkshopSteps(): WorkshopStep[] {
  return weatherStationGoldenSteps.map(authoredStep);
}

/** Server-owned Workshop state. A checkpoint unlocks only steps in its selected build session. */
export class WorkshopSessions {
  private readonly sessions = new Map<string, WorkshopSession>();

  createSession(buildId: string, steps: readonly WorkshopStep[], sessionId: string = randomUUID()): string {
    if (steps.length === 0) throw new WorkshopAccessError("A Workshop build requires at least one lesson step.");
    if (this.sessions.has(sessionId)) throw new WorkshopAccessError("Workshop session already exists.");
    this.sessions.set(sessionId, { buildId, steps, completedCheckpoints: new Set() });
    return sessionId;
  }

  createWeatherStationSession(sessionId = "demo"): string {
    return this.createSession(weatherStationBuildId, weatherStationWorkshopSteps(), sessionId);
  }

  private session(sessionId: string, buildId: string): WorkshopSession {
    let session = this.sessions.get(sessionId);
    // The authored fixture remains available for the existing demo, but generated
    // lessons must be explicitly promoted before they can create a session.
    if (!session && buildId === weatherStationBuildId) {
      this.createWeatherStationSession(sessionId);
      session = this.sessions.get(sessionId);
    }
    if (!session || session.buildId !== buildId) {
      throw new WorkshopAccessError("Workshop session does not belong to the selected build.");
    }
    return session;
  }

  accessStep(sessionId: string, buildId: string, stepId: string): Record<string, unknown> {
    const session = this.session(sessionId, buildId);
    const index = session.steps.findIndex((step) => step.id === stepId);
    if (index < 0) throw new WorkshopAccessError("Selected build step was not found.");
    const required = session.steps.slice(0, index).flatMap((step) => step.checkpoint ? [step.checkpoint.id] : []);
    if (required.some((checkpointId) => !session.completedCheckpoints.has(checkpointId))) {
      throw new WorkshopAccessError("Complete the preceding checkpoint before opening this step.");
    }
    return publicStep(session.steps[index]!);
  }

  gradeCheckpoint(sessionId: string, buildId: string, checkpointId: string, answer: string): { correct: boolean; reexplanation?: string } {
    const session = this.session(sessionId, buildId);
    const step = session.steps.find((item) => item.checkpoint?.id === checkpointId);
    const checkpoint = step?.checkpoint;
    if (!step || !checkpoint) throw new WorkshopAccessError("Checkpoint was not found in the selected build.");
    if (answer !== checkpoint.correctAnswer) return { correct: false, reexplanation: step.reexplanation };
    session.completedCheckpoints.add(checkpointId);
    return { correct: true };
  }
}
