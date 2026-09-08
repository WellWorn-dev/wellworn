import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { nodes } from "./nodes";
import { verdicts } from "./verdicts";

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  verdictId: uuid("verdict_id").references(() => verdicts.id, { onDelete: "set null" }),
  nodeId: uuid("node_id").references(() => nodes.id, { onDelete: "set null" }),
  repoPath: text("repo_path").notNull(),
  version: text("version").notNull().default("0.1.0"),
  contentHash: text("content_hash").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});
