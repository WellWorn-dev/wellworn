import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contentStatus } from "./verdicts";
import { nodes } from "./nodes";

export const severity = pgEnum("severity", ["blocker", "major", "minor"]);
export const submissionSource = pgEnum("submission_source", ["staff", "mcp", "web", "github"]);

export const traps = pgTable("traps", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id").notNull().references(() => nodes.id, { onDelete: "restrict" }),
  versionRange: text("version_range").notNull().default("*"),
  symptom: text("symptom").notNull(),
  fixMd: text("fix_md").notNull(),
  severity: severity("severity").notNull().default("major"),
  status: contentStatus("status").notNull().default("draft"),
  evidenceUrl: text("evidence_url"),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  submittedBy: uuid("submitted_by"),
  source: submissionSource("source").notNull().default("staff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("traps_node_status_idx").on(t.nodeId, t.status)]);
