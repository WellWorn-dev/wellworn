import { createSubmission, type Db } from "@wellworn/db";

export async function submitTrap(db: Db, keyId: string, args: { library: string; version: string; symptom: string; fix: string; evidence_url?: string }) {
  const { id } = await createSubmission(db, { kind: "trap", payload: args, source: "mcp", submitterKeyId: keyId });
  return id.slice(0, 8);
}
