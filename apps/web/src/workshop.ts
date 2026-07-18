import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";

export class WorkshopAccessError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type WorkshopSession = Set<string>;

export class WorkshopSessions {
  private readonly completedCheckpoints = new Map<string, WorkshopSession>();

  private session(id: string): WorkshopSession {
    let session = this.completedCheckpoints.get(id);
    if (!session) {
      session = new Set();
      this.completedCheckpoints.set(id, session);
    }
    return session;
  }

  accessStep(sessionId: string, stepId: string) {
    const index = weatherStationGoldenSteps.findIndex((step) => step.id === stepId);
    if (index < 0) throw new WorkshopAccessError("Reference step was not found.");
    const completed = this.session(sessionId);
    const required = weatherStationGoldenSteps.slice(0, index).flatMap((step) => step.checkpoint ? [step.checkpoint.id] : []);
    if (required.some((checkpointId) => !completed.has(checkpointId))) {
      throw new WorkshopAccessError("Complete the preceding checkpoint before opening this step.");
    }
    return weatherStationGoldenSteps[index]!;
  }

  gradeCheckpoint(sessionId: string, checkpointId: string, answer: string): { correct: boolean; reexplanation?: string } {
    const step = weatherStationGoldenSteps.find((item) => item.checkpoint?.id === checkpointId);
    const checkpoint = step?.checkpoint;
    if (!step || !checkpoint) throw new WorkshopAccessError("Checkpoint was not found.");
    if (answer !== checkpoint.correctAnswer) {
      return { correct: false, reexplanation: `Revisit the idea: ${step.lesson.content}` };
    }
    this.session(sessionId).add(checkpointId);
    return { correct: true };
  }
}
