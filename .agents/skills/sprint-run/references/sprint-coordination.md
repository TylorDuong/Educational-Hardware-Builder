# Sprint coordination reference

Use this reference for shared sequencing and gate state only. Use the owner execution guide for task details and exact prompts.

## Owner sequences

- A: A1 → G1 → A2 → A3 → A4 → A5 → A6 → A7 (= G2) → A8 (= G3) → G4
- B: G1 → B1 → B2 → B3 → B4 → B5 → B6 → B7 (= G2) → B8 (= G3) → G4
- C: G1 (plus C1) → C2 → C3 → C4 → C5 → C6 → C7 (= G2) → C8 (= G3) → G4

For C, keep C1 inside G1 setup as directed by the guide; do not add a tracker row.

## Dependency map

| Code | Owner | Cell | Day | Wait for | Merge | Soft fallback |
|---|---|---|---|---|---|---|
| A1 | A | H7 | 1 AM | — | yes | — |
| G1 | all | H8 | 1 AM | A1 (H) | yes | — |
| B1 | B | H9 | 1 lunch | G1 (H) | yes | placeholder geometry with correct hole positions |
| C1 | C | H10 | 1 AM | A1 (H) | no | folded into G1 |
| A2 | A | H11 | 1 PM | G1 (H) | no | — |
| B2 | B | H12 | 1 PM | G1 (H) | no | — |
| C2 | C | H13 | 1 EOD | G1 (H) | yes | — |
| A3 | A | H14 | 2 | A2 (H) | yes | — |
| B3 | B | H15 | 2 | B1, B2 (H) | no | — |
| C3 | C | H16 | 2 | C2 (H) | no | — |
| A4 | A | H17 | 3 | A3 (H), C2 (S) | no | generic ESP32/BME280 chunks |
| B4 | B | H18 | 3 | B3 (H), A3 (S) | no | local `openscad` binary |
| C4 | C | H19 | 3 | C3 (H) | no | — |
| A5 | A | H20 | 4 | A4 (H) | yes | — |
| B5 | B | H21 | 4 | B3, B4 (H) | yes | — |
| C5 | C | H22 | 4 | C4, B1 (H) | yes | identity-transform stub and flag |
| A6 | A | H23 | 5 AM | A5, B5, C5 (H) | first | — |
| B6 | B | H24 | 5 AM | A6 (H) | second | rebase while waiting |
| C6 | C | H25 | 5 AM | B6 (H) | third | rebase; keep golden E2E green |
| G2 | all | H26 | 5 | merge train done (H) | seams only | pin flaky steps with `DEMO_SAFE_MODE` |
| G3 | all | H27 | 6 | G2 (H) | no | — |
| G4 | all | H28 | 7 | G3 (H) | no | `DEMO_SAFE_MODE` or backup video |

Treat B1, C2, A/B/C-5, A6/B6/C6, and G1 as merge tasks. A6/B6/C6 must merge in order.

## Status-file template

Create `.sprint/status.yml` from this template only when missing. Keep `updated` current; add `by` and `at` to every completed entry.

```yaml
updated: 2026-01-01T00:00:00Z
codes:
  A1: {cell: H7, status: pending}
  G1: {cell: H8, status: pending}
  B1: {cell: H9, status: pending}
  C1: {cell: H10, status: pending}
  A2: {cell: H11, status: pending}
  B2: {cell: H12, status: pending}
  C2: {cell: H13, status: pending}
  A3: {cell: H14, status: pending}
  B3: {cell: H15, status: pending}
  C3: {cell: H16, status: pending}
  A4: {cell: H17, status: pending}
  B4: {cell: H18, status: pending}
  C4: {cell: H19, status: pending}
  A5: {cell: H20, status: pending}
  B5: {cell: H21, status: pending}
  C5: {cell: H22, status: pending}
  A6: {cell: H23, status: pending}
  B6: {cell: H24, status: pending}
  C6: {cell: H25, status: pending}
  G2: {cell: H26, status: pending}
  G3: {cell: H27, status: pending}
  G4: {cell: H28, status: pending}
```
