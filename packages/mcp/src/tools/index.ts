import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v3";
import type { Db } from "@wellworn/db";
import type { Scope } from "../scope";
import { recommendText, compareText, alternativesText, designText } from "./verdict-tools";
import { trapsText } from "./traps";
import { docsText } from "./docs";
import { skillText } from "./skill";
import { submitTrap } from "./submit";

export type ToolContext = {
  db: Db;
  scope: Scope;
  /** Runs the limiter once per call; returns the trailing line to append or the limit line to return alone. */
  meter: () => Promise<{ allowed: true; remaining: number } | { allowed: false; line: string }>;
};

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };
const ok = (text: string): Result => ({ content: [{ type: "text", text }] });
const fail = (text: string): Result => ({ content: [{ type: "text", text }], isError: true });

const short = (max: number) => z.string().trim().min(1).max(max);

export function registerTools(server: McpServer, ctx: ToolContext) {
  const metered = (fn: () => Promise<string>) => async (): Promise<Result> => {
    const m = await ctx.meter();
    if (!m.allowed) return ok(m.line);
    const body = await fn();
    return ok(`${body}\nremaining: ${m.remaining}`);
  };
  // Driver and database messages carry connection details, so the caller only ever gets the ref.
  const internalError = (err: unknown): Result => {
    const id = Math.random().toString(36).slice(2, 10);
    console.error(JSON.stringify({ level: "error", msg: "tool failed", id, error: String(err) }));
    return fail(`internal error (ref ${id}); try again in a moment`);
  };
  const guarded = <T>(handler: (args: T) => Promise<string>) => async (args: T): Promise<Result> => {
    try {
      return await metered(() => handler(args))();
    } catch (err) {
      return internalError(err);
    }
  };

  server.registerTool("recommend", {
    description: "Which stack, library, or service to use for a task, with the traps and the skill. Ask before adding a dependency.",
    inputSchema: { task: short(300).describe("What you are building, e.g. 'auth for a Next.js app, solo, free tier'"), constraints: z.array(short(60)).max(8).optional() },
  }, guarded(({ task, constraints }) => recommendText(ctx.db, task, constraints)));

  server.registerTool("compare", {
    description: "Verified comparison of 2 to 4 libraries or services for a context; says when each one wins.",
    inputSchema: { options: z.array(short(60)).min(2).max(4), context: short(200).optional() },
  }, guarded(({ options, context }) => compareText(ctx.db, options, context)));

  server.registerTool("alternatives", {
    description: "Open-source or self-hosted alternatives to a SaaS or library, with one-line reasons.",
    inputSchema: { to: short(80), kind: z.enum(["open_source", "self_hosted", "any"]).optional() },
  }, guarded(({ to, kind }) => alternativesText(ctx.db, to, kind ?? "any")));

  server.registerTool("traps", {
    description: "Known breakages for a library at a version: symptom, severity, fix. Pass id for the full fix.",
    inputSchema: { library: short(80).optional(), version: short(40).optional(), id: short(64).optional() },
  }, guarded(({ library, version, id }) => trapsText(ctx.db, { library, version, id })));

  server.registerTool("skill", {
    description: "The SKILL.md procedure for a verdict or library, or its install command.",
    inputSchema: { slug: short(120) },
  }, guarded(({ slug }) => skillText(ctx.db, slug)));

  server.registerTool("design", {
    description: "Design system, tokens, layout rules, and anti-patterns for a screen. Ask before starting UI.",
    inputSchema: { screen: short(200), constraints: z.array(short(60)).max(8).optional() },
  }, guarded(({ screen, constraints }) => designText(ctx.db, screen, constraints)));

  server.registerTool("docs", {
    description: "Official docs URL, llms.txt, and latest version for a library.",
    inputSchema: { library: short(80), topic: short(120).optional() },
  }, guarded(({ library, topic }) => docsText(ctx.db, library, topic)));

  server.registerTool("submit_trap", {
    description: "Report a breakage you hit and how you fixed it; reviewed before it is served. Needs a free key.",
    inputSchema: { library: short(80), version: short(40), symptom: short(400), fix: short(1200), evidence_url: z.string().url().max(300).regex(/^https?:\/\//i, "evidence_url must be http or https").optional() },
  }, async (args) => {
    if (ctx.scope.kind !== "org") return ok("key required: create a free key at https://wellworn.dev/keys to submit traps");
    const m = await ctx.meter();
    if (!m.allowed) return ok(m.line);
    try {
      const id = await submitTrap(ctx.db, ctx.scope.keyId, args);
      return ok(`submitted ${id}; a reviewer will verify it. Thank you.\nremaining: ${m.remaining}`);
    } catch (err) {
      return internalError(err);
    }
  });
}
