import { and, arrayOverlaps, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import semver from "semver";
import type { Db } from "./client";
import { nodes, skills, submissions, traps, verdictNodes, verdicts, type Source } from "./schema";

export type VerdictKind = (typeof verdicts.$inferSelect)["kind"];
export type VerdictRow = typeof verdicts.$inferSelect;
export type NodeRow = typeof nodes.$inferSelect;
export type TrapRow = typeof traps.$inferSelect;

const servable = inArray(verdicts.status, ["published", "recheck"]);

/** Full-text search over served verdicts of one kind; falls back to tag overlap; newest verification wins ties. */
/** Escapes the LIKE metacharacters so a search term matches literally. */
export const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

export async function findVerdict(db: Db, q: string, kind: VerdictKind): Promise<VerdictRow | undefined> {
  const words = q.toLowerCase().match(/[a-z0-9.+#-]{2,}/g) ?? [];
  if (words.length === 0) return undefined;
  const tsq = words.map((w) => w.replace(/[^a-z0-9]/g, "") ).filter(Boolean).join(" | ");
  const rows = await db
    .select({ v: verdicts, rank: sql<number>`ts_rank(${verdicts.search}, to_tsquery('english', ${tsq}))` })
    .from(verdicts)
    .where(and(eq(verdicts.kind, kind), servable, sql`${verdicts.search} @@ to_tsquery('english', ${tsq})`))
    .orderBy(desc(sql`ts_rank(${verdicts.search}, to_tsquery('english', ${tsq}))`), desc(verdicts.verifiedAt))
    .limit(1);
  if (rows[0]) return rows[0].v;
  const byTag = await db
    .select()
    .from(verdicts)
    .where(and(eq(verdicts.kind, kind), servable, arrayOverlaps(verdicts.contextTags, words)))
    .orderBy(desc(verdicts.verifiedAt))
    .limit(1);
  return byTag[0];
}

export type VerdictBundle = {
  verdict: VerdictRow;
  pick?: NodeRow;
  alternative?: NodeRow;
  avoid?: NodeRow;
  components: NodeRow[];
  traps: TrapRow[];
  skill?: typeof skills.$inferSelect;
};

export async function loadBundle(db: Db, verdict: VerdictRow): Promise<VerdictBundle> {
  const links = await db
    .select({ role: verdictNodes.role, position: verdictNodes.position, node: nodes })
    .from(verdictNodes)
    .innerJoin(nodes, eq(nodes.id, verdictNodes.nodeId))
    .where(eq(verdictNodes.verdictId, verdict.id))
    .orderBy(verdictNodes.position);
  const byRole = (r: string) => links.filter((l) => l.role === r).map((l) => l.node);
  const pick = byRole("pick")[0];
  const trapRows = pick ? await listTraps(db, pick.id) : [];
  const [skill] = await db.select().from(skills).where(eq(skills.verdictId, verdict.id)).limit(1);
  return { verdict, pick, alternative: byRole("alternative")[0], avoid: byRole("avoid")[0], components: byRole("component"), traps: trapRows, skill };
}

export async function findNode(db: Db, nameOrSlug: string): Promise<NodeRow | undefined> {
  const q = nameOrSlug.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(nodes)
    .where(or(eq(nodes.slug, q), eq(nodes.packageName, q), ilike(nodes.name, escapeLike(q))))
    .limit(1);
  return row;
}

const severityOrder = { blocker: 0, major: 1, minor: 2 } as const;

/** Served traps for a node, optionally filtered to those whose semver range matches `version`. */
export async function listTraps(db: Db, nodeId: string, version?: string): Promise<TrapRow[]> {
  const rows = await db.select().from(traps).where(and(eq(traps.nodeId, nodeId), inArray(traps.status, ["published", "recheck"])));
  const v = version ? semver.coerce(version)?.version : undefined;
  return rows
    .filter((t) => !v || t.versionRange === "*" || semver.satisfies(v, t.versionRange, { includePrerelease: true }))
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export async function trapById(db: Db, id: string): Promise<(TrapRow & { node: NodeRow }) | undefined> {
  const [row] = await db.select({ t: traps, node: nodes }).from(traps).innerJoin(nodes, eq(nodes.id, traps.nodeId)).where(eq(traps.id, id)).limit(1);
  return row ? { ...row.t, node: row.node } : undefined;
}

export async function createSubmission(db: Db, input: { kind: "trap" | "verdict" | "correction"; payload: Record<string, unknown>; source: "mcp" | "web" | "github_pr"; submitterKeyId?: string; submitterUserId?: string }) {
  const [row] = await db.insert(submissions).values(input).returning({ id: submissions.id });
  return row!;
}

export type { Source };

export async function findSkill(db: Db, slug: string) {
  const [row] = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
  return row;
}

/* ---------- read models for the web app ---------- */

export async function listVerdicts(db: Db, opts: { kind?: VerdictKind; tag?: string; limit?: number; offset?: number } = {}) {
  const conds = [servable];
  if (opts.kind) conds.push(eq(verdicts.kind, opts.kind));
  if (opts.tag) conds.push(arrayOverlaps(verdicts.contextTags, [opts.tag]));
  return db.select().from(verdicts).where(and(...conds)).orderBy(desc(verdicts.verifiedAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getVerdictBySlug(db: Db, slug: string) {
  const [v] = await db.select().from(verdicts).where(and(eq(verdicts.slug, slug), servable)).limit(1);
  return v ? loadBundle(db, v) : undefined;
}

export async function listTags(db: Db) {
  const rows = await db.execute(sql`select tag, count(*)::int as n from verdicts, unnest(context_tags) as tag where status in ('published','recheck') group by tag order by n desc, tag`);
  return rows.rows as { tag: string; n: number }[];
}

/** Catalog categories (from awesome-selfhosted tags) with counts of active tools. */
export async function listCatalogCategories(db: Db) {
  const rows = await db.execute(sql`select tag, count(*)::int as n from nodes, unnest(tags) as tag where attribution is not null and status = 'active' group by tag order by tag`);
  return rows.rows as { tag: string; n: number }[];
}

export async function listCatalog(db: Db, opts: { tag?: string; q?: string; limit?: number; offset?: number } = {}) {
  const conds = [sql`${nodes.attribution} is not null`];
  if (opts.tag) conds.push(arrayOverlaps(nodes.tags, [opts.tag]));
  if (opts.q) { const like = `%${escapeLike(opts.q)}%`; conds.push(or(ilike(nodes.name, like), ilike(nodes.summary, like))!); }
  return db.select().from(nodes).where(and(...conds)).orderBy(desc(sql`coalesce((${nodes.signals}->>'stars')::int, 0)`)).limit(opts.limit ?? 60).offset(opts.offset ?? 0);
}

export async function getNodeBySlug(db: Db, slug: string) {
  const [n] = await db.select().from(nodes).where(eq(nodes.slug, slug)).limit(1);
  return n;
}

export async function listNodesWithTraps(db: Db) {
  const rows = await db.execute(sql`select n.slug, n.name, count(t.id)::int as n from nodes n join traps t on t.node_id = n.id and t.status in ('published','recheck') group by n.slug, n.name order by n desc, n.name`);
  return rows.rows as { slug: string; name: string; n: number }[];
}

export async function listSkills(db: Db) {
  return db.select().from(skills).orderBy(skills.slug);
}

export async function publicStats(db: Db) {
  const rows = await db.execute(sql`select
    (select count(*)::int from verdicts where status in ('published','recheck')) as verdicts,
    (select count(*)::int from verdicts where status = 'recheck') as recheck,
    (select count(*)::int from traps where status in ('published','recheck')) as traps,
    (select count(*)::int from nodes where attribution is not null) as catalog,
    (select count(*)::int from submissions where status = 'new') as pending_submissions,
    (select coalesce(sum(calls),0)::int from usage_daily where day >= current_date - 7) as calls_7d`);
  return rows.rows[0] as { verdicts: number; recheck: number; traps: number; catalog: number; pending_submissions: number; calls_7d: number };
}
