export const ENDPOINT = process.env.WELLWORN_MCP_URL ?? "https://mcp.wellworn.dev/mcp";
const TRAPS_API = ENDPOINT.replace(/\/mcp$/, "") + "/api/traps";

export type Dependency = { library: string; version: string | undefined };

const RANGE_PREFIX = /^[\^~>=<\s]+/;

/** Dependencies named in a manifest, sorted, with range operators stripped so a version can be matched against traps. */
export function dependenciesOf(fileName: string, text: string): Dependency[] {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const out: Dependency[] = [];
  if (base === "package.json") {
    const json = JSON.parse(text) as Record<string, Record<string, string> | undefined>;
    for (const block of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      for (const [library, range] of Object.entries(json[block] ?? {})) {
        const version = range.replace(RANGE_PREFIX, "").trim();
        out.push({ library, version: /^\d/.test(version) ? version : undefined });
      }
    }
  } else if (base === "requirements.txt") {
    for (const raw of text.split("\n")) {
      const line = raw.split("#")[0]!.trim();
      if (!line) continue;
      const m = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:[=~!<>]+\s*([0-9][^,;\s]*))?/.exec(line);
      if (m) out.push({ library: m[1]!.toLowerCase(), version: m[2] });
    }
  }
  return out.sort((a, b) => a.library.localeCompare(b.library));
}

export function trapsUrl(library: string, version?: string): string {
  const url = new URL(TRAPS_API);
  url.searchParams.set("library", library);
  if (version) url.searchParams.set("version", version);
  return url.toString();
}

/** One plain-text block per library with traps, or nothing. 429 comes back as the limit line the server prints. */
export async function fetchTraps(library: string, version?: string, key?: string): Promise<string | null> {
  const res = await fetch(trapsUrl(library, version), { headers: key ? { authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(8_000) });
  if (res.status === 204) return null;
  const text = (await res.text()).trim();
  if (res.status === 429) throw new Error(text);
  if (!res.ok) throw new Error(`traps api returned ${res.status}`);
  return text || null;
}
