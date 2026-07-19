# Arveen C8 Demo and Rehearsal Runbook

## Locked prompt policy

The C7 readiness decision pins every weather-station golden-path step to the
authored fixture. The demo machine is missing the required `llama3.2:3b` and
`llama3.1:8b` tags, so do not tune or invoke live prompts during rehearsals.
Start the web service with `DEMO_SAFE_MODE=true`; this deliberately bypasses
live model calls and serves the cited, schema-validated fixture content.

Reconsider a step only after the required tags are installed and a live
end-to-end run succeeds. Until then, the fixture is the approved prompt
outcome, not a degraded rehearsal mode.

## Before each rehearsal

1. Start the Compose stack and run `./scripts/demo-reset.ps1`.
2. Confirm the web service has `DEMO_SAFE_MODE=true` and the golden path has
   12 ordered steps with three checkpoints.
3. Put the dashboard on screen, reset the workshop session, and have A ready
   at the safe-mode control.
4. Have B ready to take the 3D/collision-retry handoff.
5. For rehearsal 1, have A record screen and audio and save the backup video
   locally and in the team-approved cloud location.

## Five-to-six-minute narration (Arveen)

| Time | Screen/action | Say |
| --- | --- | --- |
| 0:00-0:25 | Dashboard: enter the weather-station request. | "I want a beginner weather station that I can understand, not just assemble. The app turns that request into a cited, gated build." |
| 0:25-0:55 | Plan/progress: show the typed SSE stages and build plan. | "The pipeline streams its progress, but each boundary is typed and validated. The demo path is authored and cited so the lesson remains dependable." |
| 0:55-1:25 | Parts tab: select the ESP32/BME280 parts and substitution rationale. | "Parts are matched to the project, and the learner sees why a compatible substitution is acceptable rather than receiving an unexplained list." |
| 1:25-2:20 | Workshop: open the first checkpoint and deliberately choose the scripted wrong answer. | "Before moving on, I need to explain the concept. I will answer this one incorrectly on purpose." Show targeted re-explanation, then answer correctly and show the next step unlock. |
| 2:20-3:20 | Assembly step: introduce the collision/retry beat. | "The agent chooses symbolic mating features, never coordinates. If the solver rejects a mate, it returns a precise reason and the agent retries with another symbolic choice." |
| 3:20-4:05 | Hand off to B for MechView. | "Now B can show the deterministic transform and the 3D assembly result that follows from that symbolic selection." |
| 4:05-5:10 | Return to the final lesson/completion screen. | "We have reached completion with cited guidance, a real checkpoint gate, and deterministic spatial validation. A can silently keep the fixture path active if a live service ever wobbles." |
| 5:10-5:30 | Pause for questions. | "That is the golden path: request, plan, parts, understanding, validated assembly, and completion." |

## Rehearsal evidence

Do not mark G3/H27 done until every line below has an explicit passing result.

| Check | Rehearsal 1 | Rehearsal 2 |
| --- | --- | --- |
| `DEMO_SAFE_MODE=true` confirmed | [ ] | [ ] |
| Prompt, plan, parts, gated wrong/right answer, retry/3D handoff, and completion shown | [ ] | [ ] |
| Narration duration is 5-6 minutes | [ ] | [ ] |
| A operated the fallback control and recorded/stored the backup video | [ ] | [ ] |
| B completed the 3D moment and confirms its print requirement | [ ] | [ ] |
| No unscripted live-model call was required | [ ] | [ ] |

After both columns are complete, report the results, backup-video location, and
B's 3D/print confirmation. The team can then set G3/H27 to Done and advance
to G4.
