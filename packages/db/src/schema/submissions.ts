import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const submissionKind = pgEnum("submission_kind", ["trap", "verdict", "correction"]);
export const submissionStatus = pgEnum("submission_status", ["new", "accepted", "rejected", "duplicate"]);
export const submissionChannel = pgEnum("submission_channel", ["mcp", "web", "github_pr"]);

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: submissionKind("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  source: submissionChannel("source").notNull(),
  submitterKeyId: text("submitter_key_id"),
  submitterUserId: uuid("submitter_user_id"),
  status: submissionStatus("status").notNull().default("new"),
  reviewerId: uuid("reviewer_id"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
