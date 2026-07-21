import assert from "node:assert/strict";
import test from "node:test";

import {
  validateWeatherStationGoldenFixture,
  weatherStationGoldenSteps,
  weatherStationTemplateRequests,
} from "../fixtures/weather-station.js";

test("the hand-authored weather-station fixture is a complete symbolic golden path", () => {
  validateWeatherStationGoldenFixture();
  assert.equal(weatherStationGoldenSteps.length, 12);
  assert.deepEqual(weatherStationGoldenSteps.map((item) => item.order), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(weatherStationGoldenSteps.filter((item) => "checkpoint" in item).length, 0);
  assert.ok(weatherStationGoldenSteps.every((item) => item.skills.length > 0));
  assert.equal(weatherStationTemplateRequests.length, 1);
  assert.equal(weatherStationTemplateRequests[0]?.templateId, "l-bracket");
  for (const item of weatherStationGoldenSteps) {
    assert.ok(item.lesson.citations.length > 0);
    assert.ok(item.whyItMatters);
    assert.ok(item.concepts.length > 0);
    assert.ok(item.sourceDigest.summary);
    assert.ok(item.lesson.citations.some((citation) => citation.sourceUrl === item.sourceDigest.citation.sourceUrl));
    assert.ok(item.completionCondition);
    for (const selection of item.matingSelections) {
      assert.equal("positionMm" in selection, false);
      assert.equal("quaternion" in selection, false);
    }
  }
});
