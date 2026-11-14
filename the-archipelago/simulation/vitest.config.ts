import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Used only by `npm run coverage`. The thresholds are a ratchet: the baseline measured on
    // 2026-11-12, rounded down (statements raised to 72 on 2026-11-14). Raise them only with the tests that earn it; never lower them.
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary"],
      thresholds: { statements: 72, branches: 57, functions: 86, lines: 76 },
    },
  },
});
