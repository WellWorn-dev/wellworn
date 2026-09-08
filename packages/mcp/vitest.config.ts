import { defineConfig } from "vitest/config";

// The test files share one database and one Redis; run them one file at a time.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], testTimeout: 20_000, hookTimeout: 60_000, fileParallelism: false },
});
