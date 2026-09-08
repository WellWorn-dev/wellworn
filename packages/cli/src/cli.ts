import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dependenciesOf, ENDPOINT, fetchTraps } from "./lib";

const HELP = `wellworn: the judgment layer for coding agents, from the command line.

  wellworn traps <library> [version]   known breakages for a library, one line each
  wellworn check [manifest]            traps for every dependency in package.json or requirements.txt
  wellworn mcp                         stdio bridge to ${ENDPOINT} for clients without remote MCP support

Set WELLWORN_API_KEY to use a free key (2,000 calls a month per organization) instead of the
no-key allowance (60 calls a day per address). Keys: https://wellworn.dev/app/keys`;

const key = process.env.WELLWORN_API_KEY;
const [command, ...rest] = process.argv.slice(2);

async function main(): Promise<number> {
  if (command === "traps") {
    const [library, version] = rest;
    if (!library) { console.error("usage: wellworn traps <library> [version]"); return 2; }
    const text = await fetchTraps(library, version, key);
    console.log(text ?? `no verified traps for ${library}${version ? " " + version : ""}`);
    return 0;
  }
  if (command === "check") {
    const strict = rest.includes("--strict");
    const file = rest.find((a) => !a.startsWith("--")) ?? "package.json";
    const deps = dependenciesOf(file, readFileSync(file, "utf8"));
    if (deps.length === 0) { console.log(`nothing to check in ${file}`); return 0; }
    let found = 0;
    for (const d of deps) {
      const text = await fetchTraps(d.library, d.version, key);
      if (text) { found++; console.log(text + "\n"); }
    }
    console.log(found === 0 ? `${deps.length} dependencies, no verified traps at these versions` : `${found} of ${deps.length} dependencies have verified traps`);
    return strict && found > 0 ? 1 : 0;
  }
  if (command === "mcp") {
    // The bridge is mcp-remote, fetched on first use; the key travels as the Authorization header.
    const args = ["-y", "mcp-remote@latest", ENDPOINT, ...(key ? ["--header", `Authorization:Bearer ${key}`] : [])];
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", args, { stdio: "inherit" });
    return new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
  }
  console.log(HELP);
  return command && command !== "help" && command !== "--help" ? 2 : 0;
}

main().then((code) => process.exit(code), (err: unknown) => { console.error(err instanceof Error ? err.message : String(err)); process.exit(1); });
