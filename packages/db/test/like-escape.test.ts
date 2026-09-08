import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, findNode, listCatalog, migrateDb, type Db } from "../src/index";
import { nodes, traps, verdictNodes, verdicts } from "../src/schema";

const url = process.env.DATABASE_URL ?? "postgres://wellworn:wellworn@127.0.0.1:5433/wellworn_db_test";
let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = createDb(url));
  await migrateDb(db);
  await db.delete(traps); await db.delete(verdictNodes); await db.delete(verdicts); await db.delete(nodes);
  await db.insert(nodes).values([
    { slug: "gitea", type: "tool", name: "Gitea", summary: "Git service", attribution: "awesome-selfhosted" },
    { slug: "cover-100", type: "tool", name: "100% Coverage", summary: "Reports", attribution: "awesome-selfhosted" },
    { slug: "snake-case", type: "tool", name: "snake_case", summary: "Naming", attribution: "awesome-selfhosted" },
  ]);
});
afterAll(async () => close());

describe("LIKE metacharacters in search terms", () => {
  it("a percent sign matches the one name that contains it, not every row", async () => {
    expect((await listCatalog(db, { q: "%" })).map((n) => n.slug)).toEqual(["cover-100"]);
    expect((await listCatalog(db, { q: "100%" })).map((n) => n.slug)).toEqual(["cover-100"]);
  });
  it("an underscore is literal, not a single-character wildcard", async () => {
    expect((await listCatalog(db, { q: "snake_" })).map((n) => n.slug)).toEqual(["snake-case"]);
    expect(await findNode(db, "_itea")).toBeUndefined();
  });
});
