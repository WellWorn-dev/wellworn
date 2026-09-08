import { sql, type SQL } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tsvector, type Source } from "./common";
import { nodes } from "./nodes";

export const verdictKind = pgEnum("verdict_kind", ["recommend", "compare", "alternatives", "design", "stack"]);
export const contentStatus = pgEnum("content_status", ["draft", "review", "published", "recheck", "retired"]);
export const verdictRole = pgEnum("verdict_role", ["pick", "alternative", "avoid", "component"]);

export const verdicts = pgTable("verdicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  kind: verdictKind("kind").notNull(),
  question: text("question").notNull(),
  answerMd: text("answer_md").notNull(),
  altMd: text("alt_md"),
  altWinsWhen: text("alt_wins_when"),
  avoidMd: text("avoid_md"),
  contextTags: text("context_tags").array().notNull().default(sql`'{}'::text[]`),
  status: contentStatus("status").notNull().default("draft"),
  versionTested: text("version_tested"),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  sources: jsonb("sources").$type<Source[]>().notNull().default([]),
  search: tsvector("search").generatedAlwaysAs((): SQL => sql`to_tsvector('english', ${verdicts.question} || ' ' || ${verdicts.answerMd})`),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedRev: integer("published_rev").notNull().default(0),
}, (t) => [
  index("verdicts_search_idx").using("gin", t.search),
  index("verdicts_status_kind_idx").on(t.status, t.kind),
]);

export const verdictNodes = pgTable("verdict_nodes", {
  verdictId: uuid("verdict_id").notNull().references(() => verdicts.id, { onDelete: "cascade" }),
  nodeId: uuid("node_id").notNull().references(() => nodes.id, { onDelete: "restrict" }),
  role: verdictRole("role").notNull(),
  position: integer("position").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.verdictId, t.nodeId, t.role] })]);
