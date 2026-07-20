import assert from "node:assert/strict";
import test from "node:test";

import { GuidedLessonSchema } from "@educational-hardware-builder/schemas";

import {
  WorkshopAccessError,
  WorkshopSessions,
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
      skills: [{ ...citation, relevance: "Explains the power-path terminology used in this step." }],
      matingSelections: [],
    },
    {
      id: "10000000-0000-4000-8000-000000000022",
      order: 2,
      title: "Inspect the prepared parts",
      safetyCategory: "none",
      safetyCallout: "Inspect the cited parts before continuing.",
      instruction: "Confirm both cited parts are ready for the next step.",
      completionCondition: "The parts are ready for the next guided step.",
      citations: [citation],
      skills: [],
      matingSelections: [],
    },
  ],
  troubleshooting: [],
});

test("selected Workshop sessions reject another build but allow every selected step in any order", () => {
  const sessions = new WorkshopSessions();
  const sessionId = sessions.createSession(buildId, workshopStepsForLesson(lesson), "selected-build-session");
  const firstStep = lesson.steps[0]!;
  const secondStep = lesson.steps[1]!;

  assert.throws(() => sessions.accessStep(sessionId, anotherBuildId, firstStep.id), WorkshopAccessError);
  assert.equal(sessions.accessStep(sessionId, buildId, secondStep.id).id, secondStep.id);
  const publicStep = sessions.accessStep(sessionId, buildId, firstStep.id) as Record<string, unknown>;
  assert.equal("checkpoint" in publicStep, false);
  assert.equal(sessions.accessStep(sessionId, buildId, firstStep.id).id, firstStep.id);
});
