import { findSkill, type Db } from "@wellworn/db";

export async function skillText(db: Db, slug: string) {
  const s = await findSkill(db, slug);
  if (!s) return `no skill "${slug}" yet. Browse https://wellworn.dev/skills`;
  return `SKILL ${s.slug} v${s.version}\ninstall: npx skills add ${s.repoPath}`;
}
