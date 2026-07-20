import { randomUUID } from "node:crypto";

import type { GuidedLesson, StepPlan } from "@educational-hardware-builder/schemas";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";

export const weatherStationBuildId = "weather-station";

export class WorkshopAccessError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type WorkshopStep = { id: string; source: Record<string, unknown> };
type WorkshopSession = { buildId: string; steps: readonly WorkshopStep[] };

function publicStep(step: WorkshopStep): Record<string, unknown> {
  return step.source;
}

function guidedStep(step: GuidedLesson["steps"][number]): WorkshopStep {
  return { id: step.id, source: step as unknown as Record<string, unknown> };
}

function authoredStep(step: StepPlan): WorkshopStep {
  return { id: step.id, source: step as unknown as Record<string, unknown> };
}

export function workshopStepsForLesson(lesson: GuidedLesson): WorkshopStep[] {
  return lesson.steps.map(guidedStep);
}

export function weatherStationWorkshopSteps(): WorkshopStep[] {
  return weatherStationGoldenSteps.map(authoredStep);
}

/** Server-owned selected-build identity; every step is directly reachable. */
export class WorkshopSessions {
  private readonly sessions = new Map<string, WorkshopSession>();

  createSession(buildId: string, steps: readonly WorkshopStep[], sessionId: string = randomUUID()): string {
    if (steps.length === 0) throw new WorkshopAccessError("A Workshop build requires at least one lesson step.");
    if (this.sessions.has(sessionId)) throw new WorkshopAccessError("Workshop session already exists.");
    this.sessions.set(sessionId, { buildId, steps });
    return sessionId;
  }

  createWeatherStationSession(sessionId = "demo"): string {
    return this.createSession(weatherStationBuildId, weatherStationWorkshopSteps(), sessionId);
  }

  private session(sessionId: string, buildId: string): WorkshopSession {
    let session = this.sessions.get(sessionId);
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
    const step = this.session(sessionId, buildId).steps.find((item) => item.id === stepId);
    if (!step) throw new WorkshopAccessError("Selected build step was not found.");
    return publicStep(step);
  }
}
