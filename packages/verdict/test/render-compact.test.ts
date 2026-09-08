import { describe, expect, it } from "vitest";
import { renderCompact, type CompactVerdict } from "../src/index";

const base: CompactVerdict = {
  slug: "auth-nextjs-solo",
  question: "auth for a Next.js app, solo dev, free tier",
  status: "published",
  pick: { name: "better-auth", version: "1.7", reason: "Own your users table; plugins for orgs and API keys; no per-MAU pricing." },
  alternative: { name: "clerk", reason: "hosted UI and SSO in a week", winsWhen: "you accept per-MAU pricing and need SSO this week" },
  avoid: { name: "next-auth", reason: "v5 migration stalled since 2025; session callback traps" },
  traps: [
    { id: "t_1a2b", severity: "major", line: "cookie cache serves a stale role for up to 5 min after a role change" },
    { id: "t_2c3d", severity: "minor", line: "Drizzle adapter needs the schema passed explicitly or plugins fail silently" },
    { id: "t_3e4f", severity: "blocker", line: "1.7.0 breaks organization invitations when teams are enabled" },
  ],
  skill: "wellworn-dev/skills/better-auth-nextjs",
  verifiedBy: "youcef",
  verifiedAt: "2026-09-05",
  recheckAt: "2026-12-04",
  sourcesCount: 3,
  remaining: 1988,
};

describe("renderCompact", () => {
  it("renders every section in order and stays under the size contract", () => {
    const out = renderCompact(base);
    expect(out.length).toBeLessThanOrEqual(3200);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^VERDICT auth for a Next\.js app/);
    expect(out).toContain("PICK better-auth 1.7");
    expect(out).toContain("ALT clerk");
    expect(out).toContain("AVOID next-auth");
    expect(out).toContain("TRAPS (3)");
    expect(out).toContain("[t_3e4f] blocker");
    expect(out).toContain("SKILL npx skills add wellworn-dev/skills/better-auth-nextjs");
    expect(out).toContain("VERIFIED 2026-09-05 by youcef · recheck 2026-12-04 · sources 3");
    expect(lines.at(-1)).toBe("remaining: 1988");
  });

  it("flags a recheck verdict on the first line", () => {
    const out = renderCompact({ ...base, status: "recheck" });
    expect(out.split("\n")[0]).toContain("[RECHECK]");
  });

  it("orders traps by severity and truncates traps before the pick when over budget", () => {
    const traps = Array.from({ length: 40 }, (_, i) => ({ id: `t_${i}`, severity: "minor" as const, line: "x".repeat(120) }));
    const out = renderCompact({ ...base, traps, avoid: undefined }, { maxChars: 1200 });
    expect(out.length).toBeLessThanOrEqual(1200);
    expect(out).toContain("PICK better-auth 1.7");
    expect(out).toContain("VERIFIED 2026-09-05");
    expect(out).toMatch(/TRAPS \(\d+ of 40\)/);
  });

  it("orders traps blocker first", () => {
    const out = renderCompact(base);
    expect(out.indexOf("[t_3e4f]")).toBeLessThan(out.indexOf("[t_1a2b]"));
    expect(out.indexOf("[t_1a2b]")).toBeLessThan(out.indexOf("[t_2c3d]"));
  });
});
