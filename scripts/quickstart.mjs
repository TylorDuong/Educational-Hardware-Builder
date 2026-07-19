import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";

function run(arguments_, options = {}) {
  return new Promise((resolve, reject) => {
    // Windows command shims (`pnpm.cmd`) must be invoked through the shell on
    // Node 24; direct spawning otherwise fails with EINVAL.
    const child = spawn(pnpm, arguments_, { stdio: "inherit", shell: isWindows, ...options });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm ${arguments_.join(" ")} ${signal ? `stopped with ${signal}` : `exited with ${code}`}.`));
    });
  });
}

await run(["--filter", "@educational-hardware-builder/web", "build:sandbox"]);

console.log("\nStarting the fixture-backed workshop at http://localhost:3000 (DEMO_SAFE_MODE=true).\n");
await run(["--filter", "@educational-hardware-builder/web", "start"], {
  env: { ...process.env, DEMO_SAFE_MODE: process.env.DEMO_SAFE_MODE ?? "true" },
});
