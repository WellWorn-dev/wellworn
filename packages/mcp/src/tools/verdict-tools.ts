import { findVerdict, loadBundle, type Db, type VerdictBundle } from "@wellworn/db";
import { renderCompact, type CompactVerdict } from "@wellworn/verdict";

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "unknown");

export function toCompact(b: VerdictBundle): CompactVerdict {
  const v = b.verdict;
  return {
    slug: v.slug,
    question: v.question,
    status: v.status === "recheck" ? "recheck" : "published",
    pick: { name: b.pick?.name ?? "(none)", version: v.versionTested ?? undefined, reason: v.answerMd },
    alternative: b.alternative && v.altMd ? { name: b.alternative.name, reason: v.altMd, winsWhen: v.altWinsWhen ?? "see reason" } : undefined,
    avoid: b.avoid ? { name: b.avoid.name, reason: v.avoidMd ?? "" } : undefined,
    traps: b.traps.map((t) => ({ id: t.id.slice(0, 8), severity: t.severity, line: t.symptom })),
    skill: b.skill?.repoPath,
    verifiedBy: "wellworn reviewer",
    verifiedAt: day(v.verifiedAt),
    recheckAt: day(v.expiresAt),
    sourcesCount: v.sources.length,
  };
}

const notFound = (what: string, q: string) => `no verified ${what} yet for "${q}". Browse https://wellworn.dev/verdicts or request one at https://wellworn.dev/request`;

export async function recommendText(db: Db, task: string, constraints?: string[]) {
  const q = [task, ...(constraints ?? [])].join(" ");
  const v = await findVerdict(db, q, "recommend");
  if (!v) return notFound("verdict", task);
  return renderCompact(toCompact(await loadBundle(db, v)));
}

export async function compareText(db: Db, options: string[], context?: string) {
  const q = [...options, context ?? ""].join(" ");
  const v = await findVerdict(db, q, "compare");
  if (!v) return notFound("comparison", options.join(" vs "));
  return renderCompact(toCompact(await loadBundle(db, v)));
}

export async function alternativesText(db: Db, to: string, kind: "open_source" | "self_hosted" | "any") {
  const v = await findVerdict(db, `${to} ${kind === "any" ? "" : kind.replace("_", " ")}`, "alternatives");
  if (!v) return notFound("alternatives list", to);
  const b = await loadBundle(db, v);
  const lines = [`ALTERNATIVES to ${to}${v.status === "recheck" ? " [RECHECK]" : ""}`];
  for (const n of [b.pick, ...b.components].filter((n): n is NonNullable<typeof n> => !!n).slice(0, 5)) {
    lines.push(`  ${n.name}${n.license ? ` (${n.license})` : ""}: ${n.summary ?? ""}`.trimEnd());
  }
  lines.push(v.answerMd, `VERIFIED ${day(v.verifiedAt)} · recheck ${day(v.expiresAt)} · sources ${v.sources.length} · https://wellworn.dev/verdicts/${v.slug}`);
  return lines.join("\n");
}

export async function designText(db: Db, screen: string, constraints?: string[]) {
  const v = await findVerdict(db, [screen, ...(constraints ?? [])].join(" "), "design");
  if (!v) return notFound("design verdict", screen);
  return renderCompact(toCompact(await loadBundle(db, v)));
}
