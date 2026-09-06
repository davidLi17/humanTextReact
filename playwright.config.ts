import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: "artifacts/playwright",
  reporter: [
    ["line"],
    ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
  ],
});
