import { date, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const usageScope = pgEnum("usage_scope", ["ip", "org"]);

export const usageDaily = pgTable("usage_daily", {
  day: date("day").notNull(),
  scope: usageScope("scope").notNull(),
  scopeId: text("scope_id").notNull(),
  tool: text("tool").notNull(),
  calls: integer("calls").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.day, t.scope, t.scopeId, t.tool] })]);

export const usageMonthly = pgTable("usage_monthly", {
  month: date("month").notNull(),
  orgId: text("org_id").notNull(),
  calls: integer("calls").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.month, t.orgId] })]);

export const signalRuns = pgTable("signal_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  nodesChecked: integer("nodes_checked").notNull().default(0),
  flippedToRecheck: integer("flipped_to_recheck").notNull().default(0),
  errors: jsonb("errors").$type<{ nodeId: string; message: string }[]>().notNull().default([]),
});
