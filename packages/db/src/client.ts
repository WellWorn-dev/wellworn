import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
  const db = drizzle({ client: pool, schema });
  return { db, close: () => pool.end() };
}

/** Migration SQL lives in packages/db/drizzle; bundled apps ship a copy and pass its path. */
export const defaultMigrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle");

/** Applies pending migrations under an advisory lock so concurrent replicas never race. */
export async function migrateDb(db: Db, migrationsFolder = defaultMigrationsFolder) {
  await db.execute("select pg_advisory_lock(42)");
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await db.execute("select pg_advisory_unlock(42)");
  }
}
