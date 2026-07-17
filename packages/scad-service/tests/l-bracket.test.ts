import { describe, expect, it } from "vitest";
import { compileLBracket, type LBracketParams } from "../src/index.js";

const valid: LBracketParams = { armA: 40, armB: 30, height: 20, thickness: 3, holeSpacing: 20, holeDiameter: 3 };
const printable = "solid l_bracket\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid";

describe("L-bracket compile validation", () => {
  it("rejects an out-of-bounds parameter with a machine-readable reason", async () => {
    await expect(compileLBracket({ ...valid, thickness: 0 }, async () => ({ ok: true, stl: printable }))).resolves.toMatchObject({ ok: false, error: { code: "OUT_OF_BOUNDS", parameter: "thickness" } });
  });
  it("returns compiler failures without exposing untyped success", async () => {
    await expect(compileLBracket(valid, async () => ({ ok: false, stderr: "syntax error" }))).resolves.toEqual({ ok: false, error: { code: "COMPILE_FAILED", stderr: "syntax error" } });
  });
  it("rejects a zero-volume mesh and accepts a printable STL", async () => {
    await expect(compileLBracket(valid, async () => ({ ok: true, stl: "solid empty\nendsolid" }))).resolves.toMatchObject({ ok: false, error: { code: "DEGENERATE_MESH", check: "zero-volume" } });
    await expect(compileLBracket(valid, async () => ({ ok: true, stl: printable }))).resolves.toEqual({ ok: true, stl: printable });
  });
});
