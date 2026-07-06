import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  // Start server + client before running tests
  globalSetup: path.resolve(__dirname, "global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "global-teardown.ts"),
});
