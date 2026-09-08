import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createDb, migrateDb, VerdictNotPublishable, publishVerdict, type Db } from "../src/index";
import { nodes, verdicts, verdictNodes } from "../src/schema";
import { eq } from "drizzle-orm";

const url = process.env.DATABASE_URL ?? "postgres://wellworn:wellworn@127.0.0.1:5433/wellworn_db_test";
let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = createDb(url));
  await migrateDb(db);
  await db.delete(verdictNodes);
  await db.delete(verdicts);
  await db.delete(nodes);
});
afterAll(async () => close());

const actor = "00000000-0000-0000-0000-000000000001";

async function draft(slug: string) {
  const [v] = await db.insert(verdicts).values({
    slug, kind: "recommend", question: "auth for a Next.js app, solo, free tier",
    answerMd: "Pick better-auth.", status: "draft", createdBy: actor,
  }).returning();
  return v!;
}

describe("publishVerdict invariants", () => {
  it("refuses a draft with no verification, no sources, no pick node, listing every missing field", async () => {
    const v = await draft("auth-nextjs-solo");
    await expect(publishVerdict(db, v.id, actor)).rejects.toMatchObject({
      name: "VerdictNotPublishable",
      missing: expect.arrayContaining(["verified_at", "version_tested", "sources", "pick"]),
    });
    const [after] = await db.select().from(verdicts).where(eq(verdicts.id, v.id));
    expect(after!.status).toBe("draft");
  });

  it("publishes a verified draft with one pick node and bumps published_rev", async () => {
    const v = await draft("db-nextjs-solo");
    const [n] = await db.insert(nodes).values({ slug: "postgres", type: "tool", name: "PostgreSQL" }).returning();
    await db.insert(verdictNodes).values({ verdictId: v.id, nodeId: n!.id, role: "pick", position: 0 });
    await db.update(verdicts).set({
      verifiedBy: actor, verifiedAt: new Date(), versionTested: "17.x",
      sources: [{ url: "https://www.postgresql.org/docs/17/", fetchedAt: "2026-09-08" }],
    }).where(eq(verdicts.id, v.id));

    const published = await publishVerdict(db, v.id, actor);
    expect(published.status).toBe("published");
    expect(published.publishedRev).toBe(1);
    expect(published.expiresAt!.getTime() - published.verifiedAt!.getTime()).toBeLessThanOrEqual(120 * 86_400_000);

    const again = await publishVerdict(db, v.id, actor);
    expect(again.publishedRev).toBe(2);
  });

  it("refuses two pick nodes", async () => {
    const v = await draft("orm-nextjs-solo");
    const [a] = await db.insert(nodes).values({ slug: "drizzle-orm", type: "library", name: "Drizzle" }).returning();
    const [b] = await db.insert(nodes).values({ slug: "prisma", type: "library", name: "Prisma" }).returning();
    await db.insert(verdictNodes).values([
      { verdictId: v.id, nodeId: a!.id, role: "pick", position: 0 },
      { verdictId: v.id, nodeId: b!.id, role: "pick", position: 1 },
    ]);
    await db.update(verdicts).set({ verifiedBy: actor, verifiedAt: new Date(), versionTested: "0.45", sources: [{ url: "https://orm.drizzle.team", fetchedAt: "2026-09-08" }] }).where(eq(verdicts.id, v.id));
    await expect(publishVerdict(db, v.id, actor)).rejects.toBeInstanceOf(VerdictNotPublishable);
  });
});
