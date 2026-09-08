import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

// Structural checks the schema cannot express plus the required fields; no ajv dependency.
const root = process.argv[2] ?? "verdicts";
const kinds = ["recommend", "compare", "alternatives", "design", "stack"];
let files = 0, errors = 0;
for (const kind of kinds) {
  const dir = path.join(root, kind);
  let names = [];
  try { names = readdirSync(dir).filter((f) => f.endsWith(".yaml")); } catch { continue; }
  for (const f of names) {
    files++;
    const v = parse(readFileSync(path.join(dir, f), "utf8"));
    const problems = [];
    for (const k of ["slug", "kind", "question", "answer_md", "nodes", "sources"]) if (!(k in v)) problems.push(`missing ${k}`);
    if (v.kind !== kind) problems.push(`kind ${v.kind} in folder ${kind}`);
    if (v.slug && `${v.slug}.yaml` !== f) problems.push(`slug ${v.slug} does not match file name`);
    if (Array.isArray(v.nodes) && v.nodes.filter((n) => n.role === "pick").length !== 1) problems.push("exactly one pick node required");
    if (Array.isArray(v.sources) && v.sources.some((s) => !s.url || !s.fetched_at)) problems.push("every source needs url and fetched_at");
    if (problems.length) { errors++; console.error(`${path.join(dir, f)}: ${problems.join("; ")}`); }
  }
}
console.log(`${files} verdict files, ${errors} with problems`);
process.exit(errors ? 1 : 0);
