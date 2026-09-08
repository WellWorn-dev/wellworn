export type Severity = "blocker" | "major" | "minor";

export type CompactTrap = { id: string; severity: Severity; line: string };

export type CompactVerdict = {
  slug: string;
  question: string;
  status: "published" | "recheck";
  pick: { name: string; version?: string; reason: string };
  alternative?: { name: string; reason: string; winsWhen: string };
  avoid?: { name: string; reason: string };
  traps: CompactTrap[];
  skill?: string;
  verifiedBy: string;
  verifiedAt: string;
  recheckAt: string;
  sourcesCount: number;
  remaining?: number;
};

export type RenderOptions = { maxChars?: number };

/** Hard cap for one MCP tool result: about 800 tokens. */
export const MAX_CHARS = 3200;

const severityRank: Record<Severity, number> = { blocker: 0, major: 1, minor: 2 };

/**
 * Renders a verdict as the compact text block the MCP returns.
 * Truncation order when over budget: traps first (fewest kept), then AVOID, then ALT.
 * PICK and VERIFIED lines are never dropped.
 */
export function renderCompact(v: CompactVerdict, opts: RenderOptions = {}): string {
  const max = opts.maxChars ?? MAX_CHARS;
  const traps = [...v.traps].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const head = `VERDICT${v.status === "recheck" ? " [RECHECK]" : ""} ${v.question}`;
  const pick = `PICK ${v.pick.name}${v.pick.version ? " " + v.pick.version : ""}: ${v.pick.reason}`;
  const alt = v.alternative ? `ALT ${v.alternative.name}: ${v.alternative.reason}; wins when ${v.alternative.winsWhen}` : undefined;
  const avoid = v.avoid ? `AVOID ${v.avoid.name}: ${v.avoid.reason}` : undefined;
  const skill = v.skill ? `SKILL npx skills add ${v.skill}` : undefined;
  const verified = `VERIFIED ${v.verifiedAt} by ${v.verifiedBy} · recheck ${v.recheckAt} · sources ${v.sourcesCount}`;
  const remaining = v.remaining === undefined ? undefined : `remaining: ${v.remaining}`;

  const build = (kept: number, withAvoid: boolean, withAlt: boolean) => {
    const trapHeader = traps.length === 0 ? "TRAPS (0)" : kept === traps.length ? `TRAPS (${kept})` : `TRAPS (${kept} of ${traps.length})`;
    const trapLines = traps.slice(0, kept).map((t) => `  [${t.id}] ${t.severity}: ${t.line}`);
    return [head, pick, withAlt ? alt : undefined, withAvoid ? avoid : undefined, trapHeader, ...trapLines, skill, verified, remaining]
      .filter((l): l is string => typeof l === "string")
      .join("\n");
  };

  let kept = traps.length;
  let withAvoid = true;
  let withAlt = true;
  let out = build(kept, withAvoid, withAlt);
  while (out.length > max) {
    if (kept > 0) kept -= 1;
    else if (withAvoid) withAvoid = false;
    else if (withAlt) withAlt = false;
    else break;
    out = build(kept, withAvoid, withAlt);
  }
  return out;
}
