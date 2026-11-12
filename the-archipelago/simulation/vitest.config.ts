import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Used only by `npm run coverage`. The thresholds are a ratchet: the baseline measured on
    // 2026-11-12, rounded down. Raise them only with the tests that earn it; never lower them.
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary"],
      thresholds: { statements: 71, branches: 57, functions: 86, lines: 76 },
    },
  },
});
