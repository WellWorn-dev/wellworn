import { findNode, type Db } from "@wellworn/db";

export async function docsText(db: Db, library: string, topic?: string) {
  const node = await findNode(db, library);
  if (!node) return `no docs pointer for "${library}" yet`;
  return [
    `DOCS ${node.name}${node.latestVersion ? ` (latest ${node.latestVersion})` : ""}`,
    node.docsUrl ? `  docs ${node.docsUrl}${topic ? `  (search: ${topic})` : ""}` : "  docs unknown",
    node.llmsTxtUrl ? `  llms.txt ${node.llmsTxtUrl}` : "",
    node.status !== "active" ? `  STATUS ${node.status}` : "",
  ].filter(Boolean).join("\n");
}
