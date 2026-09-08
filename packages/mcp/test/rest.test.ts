import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, migrateDb, schema } from "@wellworn/db";
import { createApp } from "../src/app";

const dbUrl = process.env.DATABASE_URL ?? "postgres://wellworn:wellworn@127.0.0.1:5433/wellworn_mcp_test";
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6381";
const actor = "00000000-0000-0000-0000-000000000001";
let stop: () => Promise<void>;
let baseUrl: string;

beforeAll(async () => {
  const { db, close } = createDb(dbUrl);
  await migrateDb(db);
  await db.delete(schema.traps); await db.delete(schema.verdictNodes); await db.delete(schema.verdicts); await db.delete(schema.nodes);
  const [n] = await db.insert(schema.nodes).values({ slug: "zod", type: "library", name: "Zod", registry: "npm", packageName: "zod", latestVersion: "4.5.4" }).returning();
  await db.insert(schema.traps).values({ nodeId: n!.id, versionRange: ">=4.0.0", symptom: "z.string().email() moved to z.email()", fixMd: "Use z.email().", severity: "major", status: "published", verifiedBy: actor, verifiedAt: new Date() });
  await close();
  const app = await createApp({ databaseUrl: dbUrl, redisUrl, trustProxy: false });
  const started = await app.listen(0);
  baseUrl = started.url; stop = started.stop;
});
afterAll(async () => stop());

describe("GET /api/traps", () => {
  it("returns compact text for a known library, filtered by version", async () => {
    const r = await fetch(`${baseUrl}/api/traps?library=zod&version=4.5.4`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/plain");
    const body = await r.text();
    expect(body).toContain("TRAPS Zod 4.5.4 (1)");
    expect(body).toContain("z.email()");
    const older = await fetch(`${baseUrl}/api/traps?library=zod&version=3.25.0`);
    expect(await older.text()).toContain("none verified for this range");
  });
  it("returns 204 for an unknown library and 400 without a library", async () => {
    expect((await fetch(`${baseUrl}/api/traps?library=nothing-here`)).status).toBe(204);
    expect((await fetch(`${baseUrl}/api/traps`)).status).toBe(400);
  });
});
