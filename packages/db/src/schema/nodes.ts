import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { NodeSignals } from "./common";

export const nodeType = pgEnum("node_type", ["library", "framework", "tool", "saas", "skill", "mcp_server", "design_system", "stack"]);
export const registry = pgEnum("registry", ["npm", "pypi", "packagist", "crates", "go", "none"]);
export const nodeStatus = pgEnum("node_status", ["active", "deprecated", "archived"]);

export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  type: nodeType("type").notNull(),
  name: text("name").notNull(),
  summary: text("summary"),
  license: text("license"),
  repoUrl: text("repo_url"),
  docsUrl: text("docs_url"),
  llmsTxtUrl: text("llms_txt_url"),
  registry: registry("registry").notNull().default("none"),
  packageName: text("package_name"),
  latestVersion: text("latest_version"),
  lastReleaseAt: timestamp("last_release_at", { withTimezone: true }),
  signals: jsonb("signals").$type<NodeSignals>().notNull().default({}),
  status: nodeStatus("status").notNull().default("active"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  demoUrl: text("demo_url"),
  /** Where the catalog row came from, for attribution (e.g. "awesome-selfhosted"); null for staff entries. */
  attribution: text("attribution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("nodes_type_idx").on(t.type), index("nodes_package_idx").on(t.registry, t.packageName)]);
