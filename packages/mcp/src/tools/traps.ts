import { findNode, listTraps, trapById, type Db } from "@wellworn/db";

export async function trapsText(db: Db, args: { library?: string; version?: string; id?: string }) {
  if (args.id) {
    const t = await trapById(db, args.id);
    if (!t) return `no trap with id ${args.id}`;
    return [`TRAP ${t.id.slice(0, 8)} ${t.node.name} ${t.versionRange} · ${t.severity}`, `SYMPTOM ${t.symptom}`, `FIX ${t.fixMd}`.slice(0, 2400), t.evidenceUrl ? `EVIDENCE ${t.evidenceUrl}` : "", `VERIFIED ${t.verifiedAt?.toISOString().slice(0, 10) ?? "unknown"}`].filter(Boolean).join("\n");
  }
  if (!args.library) return "pass library (and optionally version) or id";
  const node = await findNode(db, args.library);
  if (!node) return `no traps recorded for "${args.library}" yet. Hit one? submit_trap sends it to review.`;
  const rows = await listTraps(db, node.id, args.version);
  if (rows.length === 0) return `TRAPS ${node.name}${args.version ? " " + args.version : ""}: none verified for this range.`;
  const lines = [`TRAPS ${node.name}${args.version ? " " + args.version : ""} (${Math.min(rows.length, 8)}${rows.length > 8 ? ` of ${rows.length}` : ""})`];
  for (const t of rows.slice(0, 8)) lines.push(`  [${t.id.slice(0, 8)}] ${t.severity} ${t.versionRange}: ${t.symptom}`);
  lines.push("pass id for the full fix");
  return lines.join("\n");
}
