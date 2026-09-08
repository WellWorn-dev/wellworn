import { and, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { auditLog, verdictNodes, verdicts } from "./schema";

export const MAX_VALIDITY_DAYS = 120;

export class VerdictNotPublishable extends Error {
  override readonly name = "VerdictNotPublishable";
  constructor(readonly verdictId: string, readonly missing: string[]) {
    super(`verdict ${verdictId} cannot be published: ${missing.join(", ")}`);
  }
}

/**
 * Moves a verdict to `published` when every provenance invariant holds, bumping `published_rev`.
 * Invariants: verified_by, verified_at, version_tested, at least one source, exactly one pick node.
 * expires_at is set to verified_at + 120 days unless an earlier date is already present.
 */
export async function publishVerdict(db: Db, verdictId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [v] = await tx.select().from(verdicts).where(eq(verdicts.id, verdictId)).for("update");
    if (!v) throw new VerdictNotPublishable(verdictId, ["verdict"]);
    const pickRows = await tx
      .select({ picks: sql<number>`count(*)::int` })
      .from(verdictNodes)
      .where(and(eq(verdictNodes.verdictId, verdictId), eq(verdictNodes.role, "pick")));
    const picks = pickRows[0]?.picks ?? 0;

    const missing: string[] = [];
    if (!v.verifiedBy) missing.push("verified_by");
    if (!v.verifiedAt) missing.push("verified_at");
    if (!v.versionTested) missing.push("version_tested");
    if (v.sources.length === 0) missing.push("sources");
    if (picks !== 1) missing.push("pick");
    if (missing.length) throw new VerdictNotPublishable(verdictId, missing);

    const maxExpiry = new Date(v.verifiedAt!.getTime() + MAX_VALIDITY_DAYS * 86_400_000);
    const expiresAt = v.expiresAt && v.expiresAt < maxExpiry ? v.expiresAt : maxExpiry;
    const [updated] = await tx
      .update(verdicts)
      .set({ status: "published", expiresAt, publishedRev: v.publishedRev + 1, updatedAt: new Date() })
      .where(eq(verdicts.id, verdictId))
      .returning();
    await tx.insert(auditLog).values({
      actorId, action: "verdict.publish", entity: "verdict", entityId: verdictId,
      diff: { from: v.status, to: "published", rev: updated!.publishedRev },
    });
    return updated!;
  });
}
