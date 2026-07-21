import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { demoDiscoveryCitation } from "../src/demo-flow.js";
import { createApiServer, type ApiDependencies } from "../src/server.js";

const userId = "40000000-0000-4000-8000-000000000001";

function quickstartDependencies(staticDir: string): ApiDependencies {
  return {
    pool: {
      query: async () => { throw new Error("DEMO_SAFE_MODE quickstart must not query the live database."); },
    } as ApiDependencies["pool"],
    fetcher: (async () => { throw new Error("DEMO_SAFE_MODE quickstart must not contact a local model or external service."); }) as ApiDependencies["fetcher"],
    ollamaUrl: "http://ollama.invalid",
    demoSafeMode: true,
    staticDir,
  };
}

test("quickstart serves fixture-safe discovery, SSE, static assets, and the five-tab Workshop shell", async () => {
  const staticDir = await mkdtemp(join(tmpdir(), "hardware-builder-quickstart-"));
  await mkdir(join(staticDir, "assets"));
  await writeFile(join(staticDir, "index.html"), "<!doctype html><main id=\"root\"></main><script type=\"module\" src=\"/assets/workshop.js\"></script>");
  await writeFile(join(staticDir, "assets", "workshop.js"), "window.quickstartWorkshop = true;");
  const server = createApiServer(quickstartDependencies(staticDir));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const root = `http://127.0.0.1:${address.port}`;

    const shell = await fetch(`${root}/`);
    assert.equal(shell.status, 200);
    assert.match(await shell.text(), /id="root"/);
    const asset = await fetch(`${root}/assets/workshop.js`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get("content-type"), "text/javascript; charset=utf-8");
    assert.match(await asset.text(), /quickstartWorkshop/);

    const progress = await fetch(`${root}/api/agents/progress`);
    assert.equal(progress.headers.get("content-type"), "text/event-stream");
    assert.match(await progress.text(), /event: progress/);

    const created = await fetch(`${root}/api/discovery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Build a beginner USB desk light.", mode: "beginner", userId, constraints: ["usb-power-only"] }),
    });
    assert.equal(created.status, 202);
    const { operationId } = await created.json() as { operationId: string };
    const operation = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as { status: string; proposal: { citations: typeof demoDiscoveryCitation[] } };
    assert.equal(operation.status, "ready");
    assert.deepEqual(operation.proposal.citations, [demoDiscoveryCitation]);
    const discoveryEvents = await (await fetch(`${root}/api/discovery/${operationId}/events`)).text();
    for (const stage of ["queued", "classifying", "intent", "retrieving", "catalog", "ready"]) {
      assert.match(discoveryEvents, new RegExp(`\\\"stage\\\":\\\"${stage}\\\"`));
    }

    const sandbox = await readFile(new URL("../src/sandbox.tsx", import.meta.url), "utf8");
    assert.match(sandbox, /const tabs = \["Dashboard", "Research", "Parts", "Workshop", "Gallery"\] as const/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(staticDir, { recursive: true, force: true });
  }
});
