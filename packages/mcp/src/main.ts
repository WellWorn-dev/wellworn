import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);
const sha = process.env.GIT_SHA ?? "dev";
import { readFileSync } from "node:fs";

// In the stack the password lives in a Swarm secret; DATABASE_URL carries a ${PG_PASSWORD} placeholder.
const pgPassword = process.env.PG_PASSWORD_FILE ? readFileSync(process.env.PG_PASSWORD_FILE, "utf8").trim() : "";
const databaseUrl = process.env.DATABASE_URL?.replace("${PG_PASSWORD}", encodeURIComponent(pgPassword));
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) {
  console.error(JSON.stringify({ level: "fatal", msg: "DATABASE_URL and REDIS_URL are required" }));
  process.exit(1);
}

const app = await createApp({ databaseUrl, redisUrl, trustProxy: process.env.TRUST_PROXY === "1", version: sha });
const started = await app.listen(port, "0.0.0.0");
console.log(JSON.stringify({ level: "info", msg: "mcp listening", port, sha }));

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(JSON.stringify({ level: "info", msg: "shutdown", signal }));
  setTimeout(() => process.exit(0), 25_000).unref();
  await started.stop();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
