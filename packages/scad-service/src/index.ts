export type TemplateFailure =
  | { code: "OUT_OF_BOUNDS"; parameter: string; min: number; max: number }
  | { code: "COMPILE_FAILED"; stderr: string }
  | { code: "DEGENERATE_MESH"; check: "zero-volume" | "non-manifold" };

export type CompileClient = (source: string) => Promise<{ ok: true; stl: string } | { ok: false; stderr: string }>;

const bounds = {
  armA: [20, 100], armB: [20, 100], height: [10, 80], thickness: [2, 10], holeSpacing: [10, 70], holeDiameter: [2, 8],
} as const;

export type LBracketParams = { armA: number; armB: number; height: number; thickness: number; holeSpacing: number; holeDiameter: number };
export type CompileResult = { ok: true; stl: string } | { ok: false; error: TemplateFailure };

export const lBracketSource = (p: LBracketParams): string => `
arm_a=${p.armA}; arm_b=${p.armB}; height=${p.height}; thickness=${p.thickness}; hole_spacing=${p.holeSpacing}; hole_diameter=${p.holeDiameter};
difference(){ union(){ cube([arm_a,thickness,height]); cube([thickness,arm_b,height]); } for(x=[10,10+hole_spacing]) translate([x,-1,height/2]) rotate([-90,0,0]) cylinder(h=thickness+2,d=hole_diameter,$fn=32); }
`;

const validate = (p: LBracketParams): TemplateFailure | undefined => {
  for (const [key, [min, max]] of Object.entries(bounds) as Array<[keyof LBracketParams, readonly [number, number]]>) {
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max) return { code: "OUT_OF_BOUNDS", parameter: key, min, max };
  }
  return undefined;
};

const validateStl = (stl: string): TemplateFailure | undefined => {
  if (!/facet normal/i.test(stl)) return { code: "DEGENERATE_MESH", check: "zero-volume" };
  if (!/outer loop/i.test(stl) || !/endloop/i.test(stl)) return { code: "DEGENERATE_MESH", check: "non-manifold" };
  return undefined;
};

export async function compileLBracket(params: LBracketParams, compile: CompileClient): Promise<CompileResult> {
  const invalid = validate(params);
  if (invalid) return { ok: false, error: invalid };
  const result = await compile(lBracketSource(params));
  if (!result.ok) return { ok: false, error: { code: "COMPILE_FAILED", stderr: result.stderr } };
  const malformed = validateStl(result.stl);
  return malformed ? { ok: false, error: malformed } : { ok: true, stl: result.stl };
}
