import assert from "node:assert/strict";
import test from "node:test";

import {
  createDemoDiscoveryDependencies,
  demoBlockedDiscoveryRequest,
  demoDiscoveryCitation,
  demoDiscoveryRequest,
  demoParts,
  demoPipelineStages,
  demoSubstitution,
  runSolverRetryDemo,
} from "../src/demo-flow.js";
import { discoverBuild, generateGuidedLesson } from "../src/discovery.js";

test("the fixture demo defines visible pipeline, parts, and substitution stages", () => {
  assert.deepEqual(demoPipelineStages.map((entry) => entry.stage), ["queued", "retrieving", "generating", "complete"]);
  assert.equal(demoPipelineStages.at(-1)?.percent, 100);
  assert.ok(demoParts.some((part) => part.name === "ESP32 DevKit"));
  assert.match(demoSubstitution.justification, /deterministic validation/i);
});

test("the 3D demo shows a solver rejection followed by a symbolic retry", () => {
  const result = runSolverRetryDemo();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.firstAttempt, /expected 3 mm, received 2.5 mm/);
  assert.match(result.retry, /deterministic transform/);
  assert.doesNotMatch(`${result.firstAttempt} ${result.retry}`, /position|quaternion|matrix/i);
});

test("safe mode deterministically discovers a cited, fresh catalog proposal without live services", async () => {
  const first = await discoverBuild(demoDiscoveryRequest, createDemoDiscoveryDependencies());
  const second = await discoverBuild(demoDiscoveryRequest, createDemoDiscoveryDependencies());

  assert.equal(first.model.source, "fallback");
  assert.equal(first.model.attempts, 0);
  assert.equal(first.safety.outcome, "approved");
  assert.deepEqual(first.proposal, second.proposal);
  assert.equal(first.proposal?.citations[0]?.sourceUrl, demoDiscoveryCitation.sourceUrl);
  assert.equal(first.proposal?.billOfMaterials[0]?.inventoryMatch?.verified, true);
  assert.equal(first.proposal?.billOfMaterials[0]?.freshness, "fresh");
  assert.equal(first.proposal?.billOfMaterials[0]?.offers[0]?.availability, "in_stock");
  assert.equal(first.proposal?.billOfMaterials[0]?.alternatives[0]?.slug, "esp32-compatible");
});

test("safe mode keeps a blocked hazard out of retrieval, catalog, and lesson generation", async () => {
  const result = await discoverBuild(demoBlockedDiscoveryRequest, createDemoDiscoveryDependencies());

  assert.equal(result.model.source, "fallback");
  assert.equal(result.safety.outcome, "blocked");
  assert.deepEqual(result.safety.blockReasons, ["mains_ac"]);
  assert.equal(result.proposal, null);
});

test("safe mode creates an approved proposal's cited lesson without exposing model answers", async () => {
  const discovery = await discoverBuild(demoDiscoveryRequest, createDemoDiscoveryDependencies());
  assert.ok(discovery.proposal);
  if (!discovery.proposal) return;

  const lesson = await generateGuidedLesson(discovery.proposal, createDemoDiscoveryDependencies());
  const firstStep = lesson.value.steps[0];
  assert.equal(lesson.source, "fallback");
  assert.equal(lesson.attempts, 0);
  assert.equal(firstStep?.citations[0]?.sourceUrl, demoDiscoveryCitation.sourceUrl);
  assert.match(firstStep?.safetyCallout ?? "", /disconnected from power/i);
  assert.match(firstStep?.instruction ?? "", /work surface/i);
  assert.equal(firstStep?.matingSelections.length, 0);
  assert.ok(firstStep?.checkpoint);
});
