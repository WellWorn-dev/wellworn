import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import Redis from "ioredis";
import { createDb, migrateDb, publishVerdict, schema } from "@wellworn/db";
import { createApp } from "../src/app";

const dbUrl = process.env.DATABASE_URL ?? "postgres://wellworn:wellworn@127.0.0.1:5433/wellworn_mcp_test";
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6381";
const actor = "00000000-0000-0000-0000-000000000001";

let stop: () => Promise<void>;
let baseUrl: string;

async function client(headers: Record<string, string> = {}) {
  const c = new Client({ name: "wellworn-test", version: "0.0.1" });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), { requestInit: { headers } }));
  return c;
}

function text(r: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = r.content as { type: string; text?: string }[];
  return content.map((c) => c.text ?? "").join("\n");
}

beforeAll(async () => {
  const { db, close } = createDb(dbUrl);
  await migrateDb(db);
  await db.delete(schema.traps); await db.delete(schema.verdictNodes); await db.delete(schema.verdicts); await db.delete(schema.nodes);
  const [ba] = await db.insert(schema.nodes).values({ slug: "better-auth", type: "library", name: "Better Auth", latestVersion: "1.7.3", registry: "npm", packageName: "better-auth" }).returning();
  const [na] = await db.insert(schema.nodes).values({ slug: "next-auth", type: "library", name: "NextAuth", registry: "npm", packageName: "next-auth" }).returning();
  const [v] = await db.insert(schema.verdicts).values({
    slug: "auth-nextjs-solo", kind: "recommend", question: "auth for a Next.js app, solo dev, free tier",
    answerMd: "Own your users table; plugins for orgs and API keys; no per-MAU pricing.", avoidMd: "v5 migration stalled since 2025.",
    contextTags: ["nextjs", "auth", "solo"], versionTested: "1.7", verifiedBy: actor, verifiedAt: new Date("2026-09-05T00:00:00Z"),
    sources: [{ url: "https://better-auth.com/docs", fetchedAt: "2026-09-05" }], createdBy: actor,
  }).returning();
  await db.insert(schema.verdictNodes).values([
    { verdictId: v!.id, nodeId: ba!.id, role: "pick", position: 0 },
    { verdictId: v!.id, nodeId: na!.id, role: "avoid", position: 0 },
  ]);
  await db.insert(schema.traps).values({ nodeId: ba!.id, versionRange: ">=1.7.0 <1.7.2", symptom: "organization invitations fail when teams are enabled", fixMd: "Upgrade to 1.7.2 or disable teams.", severity: "blocker", status: "published", verifiedBy: actor, verifiedAt: new Date() });
  await publishVerdict(db, v!.id, actor);
  await close();

  const redis = new Redis(redisUrl);
  await redis.flushdb();
  await redis.quit();

  const app = await createApp({ databaseUrl: dbUrl, redisUrl, trustProxy: false });
  const started = await app.listen(0);
  baseUrl = started.url;
  stop = started.stop;
});
afterAll(async () => stop());

describe("wellworn mcp", () => {
  it("lists exactly 8 tools with short descriptions", async () => {
    const c = await client();
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["alternatives", "compare", "design", "docs", "recommend", "skill", "submit_trap", "traps"]);
    for (const t of tools) expect((t.description ?? "").length).toBeLessThanOrEqual(140);
    await c.close();
  });

  it("recommend returns a compact verdict block with traps and provenance", async () => {
    const c = await client();
    const out = text(await c.callTool({ name: "recommend", arguments: { task: "auth for nextjs solo free tier" } }));
    expect(out.length).toBeLessThanOrEqual(3200);
    expect(out.startsWith("VERDICT ")).toBe(true);
    expect(out).toContain("PICK Better Auth 1.7");
    expect(out).toContain("AVOID NextAuth");
    expect(out).toContain("blocker: organization invitations fail");
    expect(out).toContain("VERIFIED 2026-09-05");
    expect(out).toMatch(/remaining: \d+$/);
    await c.close();
  });

  it("rejects an over-long task with a one-line error, not a crash", async () => {
    const c = await client();
    const r = await c.callTool({ name: "recommend", arguments: { task: "x".repeat(400) } });
    expect(r.isError).toBe(true);
    expect(text(r).split("\n").length).toBe(1);
    await c.close();
  });

  it("submit_trap without a key returns key required", async () => {
    const c = await client();
    const out = text(await c.callTool({ name: "submit_trap", arguments: { library: "better-auth", version: "1.7.3", symptom: "x", fix: "y" } }));
    expect(out).toContain("key required");
    await c.close();
  });

  it("the 11th no-key call within a minute returns the limit line without breaking the session", async () => {
    const c = await client({ "x-forwarded-for": "203.0.113.9" });
    let last = "";
    for (let i = 0; i < 11; i++) last = text(await c.callTool({ name: "traps", arguments: { library: "better-auth" } }));
    expect(last).toContain("limit reached");
    expect(last).toContain("wellworn.dev/pricing");
    const again = text(await c.callTool({ name: "traps", arguments: { library: "better-auth" } }));
    expect(again).toContain("limit reached");
    await c.close();
  });
});
