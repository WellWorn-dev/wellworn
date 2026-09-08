import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, migrateDb, findVerdict, type Db } from "../src/index";
import { nodes, verdicts, verdictNodes, traps } from "../src/schema";

const url = process.env.DATABASE_URL ?? "postgres://wellworn:wellworn@127.0.0.1:5433/wellworn_db_test";
let db: Db;
let close: () => Promise<void>;
const actor = "00000000-0000-0000-0000-000000000001";

beforeAll(async () => {
  ({ db, close } = createDb(url));
  await migrateDb(db);
  await db.delete(traps); await db.delete(verdictNodes); await db.delete(verdicts); await db.delete(nodes);
  await db.insert(verdicts).values({
    slug: "queue-solo", kind: "recommend", question: "background job queue for a small app",
    answerMd: "Use pg-boss on the Postgres you already have.", contextTags: ["queue", "postgres", "solo"],
    status: "published", createdBy: actor, verifiedBy: actor, verifiedAt: new Date(), versionTested: "10",
    sources: [{ url: "https://github.com/timgit/pg-boss", fetchedAt: "2026-09-08" }],
  });
});
afterAll(async () => close());

describe("findVerdict", () => {
  it("finds by full-text match", async () => {
    const v = await findVerdict(db, "job queue small app", "recommend");
    expect(v?.slug).toBe("queue-solo");
  });
  it("falls back to tag overlap when no text matches", async () => {
    const v = await findVerdict(db, "zzzz solo", "recommend");
    expect(v?.slug).toBe("queue-solo");
  });
  it("returns undefined for an empty query and for drafts", async () => {
    expect(await findVerdict(db, "", "recommend")).toBeUndefined();
    expect(await findVerdict(db, "queue", "compare")).toBeUndefined();
  });
});
