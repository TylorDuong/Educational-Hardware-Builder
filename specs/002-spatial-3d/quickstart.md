# B2 Validation Quickstart

From `packages/schemas`, run:

```powershell
./node_modules/.bin/vitest.cmd run tests/weather-station-parts.test.ts
./node_modules/.bin/tsc.cmd --noEmit
```

Expected: the five curated records validate, required provenance is present, and malformed
physical metadata is rejected without a GPU or external service.
