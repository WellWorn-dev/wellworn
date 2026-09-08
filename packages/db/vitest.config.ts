import { defineConfig } from "vitest/config";

// Both test files migrate and truncate the same database; run them one file at a time.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], testTimeout: 20_000, hookTimeout: 60_000, fileParallelism: false },
});
