import express from "express";
import type { Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import Redis from "ioredis";
import { createDb } from "@wellworn/db";
import { createLimiter } from "@wellworn/ratelimit";
import { checkScope, limitLine, resolveScope, type KeyResolver } from "./scope";
import { registerTools } from "./tools";
import { trapsText } from "./tools/traps";
import { findNode } from "@wellworn/db";

export type AppOptions = { databaseUrl: string; redisUrl: string; trustProxy: boolean; resolveKey?: KeyResolver; version?: string };

const noKeys: KeyResolver = async () => null;

export async function createApp(opts: AppOptions) {
  const { db, close: closeDb } = createDb(opts.databaseUrl);
  const redis = new Redis(opts.redisUrl, { maxRetriesPerRequest: 2 });
  const limiter = createLimiter(redis);
  const resolveKey = opts.resolveKey ?? noKeys;
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", async (_req, res) => {
    try {
      await db.execute("select 1");
      await redis.ping();
      res.set("cache-control", "no-store").json({ ok: true, service: "mcp", sha: opts.version ?? "dev" });
    } catch (err) {
      // The driver puts the connection string in the message, so it goes to the log, not the caller.
      console.error(JSON.stringify({ level: "error", msg: "health check failed", error: String(err) }));
      res.status(503).json({ ok: false, service: "mcp" });
    }
  });

  // Plain-text traps for the plugin hook and curl users; same limiter as the MCP, same text as the tool.
  app.get("/api/traps", async (req, res) => {
    const library = typeof req.query.library === "string" ? req.query.library.trim().slice(0, 80) : "";
    const version = typeof req.query.version === "string" ? req.query.version.trim().slice(0, 40) : undefined;
    if (!library) { res.status(400).type("text/plain").send("library is required"); return; }
    const scope = await resolveScope(req, opts.trustProxy, resolveKey);
    if (scope.kind === "invalid_key") { res.status(401).type("text/plain").send("invalid key"); return; }
    const r = await checkScope(limiter, scope);
    if (!r.allowed) { res.status(429).type("text/plain").send(limitLine(scope, r)); return; }
    if (!(await findNode(db, library))) { res.status(204).end(); return; }
    res.set("cache-control", "no-store").type("text/plain").send(await trapsText(db, { library, version }));
  });

  app.post("/mcp", async (req, res) => {
    const scope = await resolveScope(req, opts.trustProxy, resolveKey);
    const server = new McpServer({ name: "wellworn", version: opts.version ?? "dev" });
    if (scope.kind === "invalid_key") {
      res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "invalid key" }, id: null });
      return;
    }
    registerTools(server, {
      db,
      scope,
      meter: async () => {
        const r = await checkScope(limiter, scope);
        return r.allowed ? { allowed: true, remaining: r.remaining } : { allowed: false, line: limitLine(scope, r) };
      },
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "mcp request failed", error: String(err) }));
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "internal error" }, id: null });
    }
  });
  app.all("/mcp", (_req, res) => { res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "method not allowed" }, id: null }); });

  async function listen(port: number, host = "127.0.0.1") {
    const server: Server = await new Promise((resolve) => { const s = app.listen(port, host, () => resolve(s)); });
    const addr = server.address();
    const actualPort = typeof addr === "object" && addr ? addr.port : port;
    return {
      url: `http://${host}:${actualPort}`,
      server,
      stop: async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await closeDb();
        await redis.quit();
      },
    };
  }
  return { app, listen };
}
