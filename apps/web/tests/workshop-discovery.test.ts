import assert from "node:assert/strict";
import test from "node:test";

import { GuidedLessonSchema } from "@educational-hardware-builder/schemas";

import { weatherStationGoldenSteps } from "../fixtures/weather-station.js";
import {
  WorkshopAccessError,
  WorkshopSessions,
  weatherStationBuildId,
  workshopStepsForLesson,
} from "../src/workshop.js";

const buildId = "30000000-0000-4000-8000-000000000001";
const anotherBuildId = "30000000-0000-4000-8000-000000000002";
const citation = {
  sourceUrl: "https://docs.example.test/usb-led-guide",
  locator: "Assembly",
  title: "USB LED guide",
};

const lesson = GuidedLessonSchema.parse({
  proposalId: buildId,
  title: "USB desk-light lesson",
  steps: [
    {
      id: "10000000-0000-4000-8000-000000000021",
      order: 1,
      title: "Prepare the USB-powered parts",
      safetyCategory: "none",
      safetyCallout: "Keep USB power disconnected while arranging the parts.",
      instruction: "Place the cited ESP32 and LED module on the work surface.",
      completionCondition: "Both parts are identified and disconnected from power.",
      citations: [citation],
      checkpoint: {
        id: "20000000-0000-4000-8000-000000000021",
        prompt: "What stays disconnected while arranging the parts?",
        choices: ["USB power", "The cited guide"],
        correctAnswer: "USB power",
      },
      matingSelections: [],
    },
    {
      id: "10000000-0000-4000-8000-000000000022",
      order: 2,
      title: "Inspect the prepared parts",
      safetyCategory: "none",
      safetyCallout: "Keep USB power disconnected during the inspection.",
      instruction: "Confirm both cited parts remain disconnected before continuing.",
      completionCondition: "The parts are ready for the next guided step.",
      citations: [citation],
      matingSelections: [],
    },
  ],
  troubleshooting: [],
});

test("selected Workshop sessions reject another build and keep the next lesson step locked after a wrong answer", () => {
  const sessions = new WorkshopSessions();
  const sessionId = sessions.createSession(buildId, workshopStepsForLesson(lesson), "selected-build-session");
  const firstStep = lesson.steps[0]!;
  const secondStep = lesson.steps[1]!;

  assert.throws(
    () => sessions.accessStep(sessionId, anotherBuildId, firstStep.id),
    WorkshopAccessError,
  );

  const publicStep = sessions.accessStep(sessionId, buildId, firstStep.id) as { checkpoint?: Record<string, unknown> };
  assert.equal("correctAnswer" in (publicStep.checkpoint ?? {}), false);
  assert.throws(
    () => sessions.accessStep(sessionId, buildId, secondStep.id),
    /Complete the preceding checkpoint/,
  );

  assert.deepEqual(
    sessions.gradeCheckpoint(sessionId, buildId, firstStep.checkpoint!.id, "The cited guide"),
    {
      correct: false,
      reexplanation: "Revisit the safety guidance: Keep USB power disconnected while arranging the parts. Then review the cited instruction: Place the cited ESP32 and LED module on the work surface.",
    },
  );
  assert.throws(
    () => sessions.accessStep(sessionId, buildId, secondStep.id),
    /Complete the preceding checkpoint/,
  );

  assert.deepEqual(sessions.gradeCheckpoint(sessionId, buildId, firstStep.checkpoint!.id, "USB power"), { correct: true });
  assert.equal(sessions.accessStep(sessionId, buildId, secondStep.id).id, secondStep.id);
});

test("weather-station fixture sessions retain their server-enforced checkpoint gate", () => {
  const sessions = new WorkshopSessions();
  const sessionId = sessions.createWeatherStationSession("weather-station-regression");
  const checkpointStep = weatherStationGoldenSteps[4]!;
  const lockedStep = weatherStationGoldenSteps[5]!;

  assert.throws(
    () => sessions.accessStep(sessionId, weatherStationBuildId, lockedStep.id),
    /Complete the preceding checkpoint/,
  );
  assert.deepEqual(
    sessions.gradeCheckpoint(sessionId, weatherStationBuildId, checkpointStep.checkpoint!.id, "3V3"),
    { correct: true },
  );
  assert.equal(sessions.accessStep(sessionId, weatherStationBuildId, lockedStep.id).title, lockedStep.title);
});
