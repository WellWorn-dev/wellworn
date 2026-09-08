import { customType } from "drizzle-orm/pg-core";

export const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export type Source = { url: string; fetchedAt: string; note?: string };
export type NodeSignals = {
  stars?: number; openIssues30d?: number; maintainers?: number; deprecated?: boolean; archived?: boolean;
  commitsLast3Months?: number; platforms?: string[]; licenses?: string[];
};
