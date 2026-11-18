import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3841";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 45000,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: { command: "node tests/server.mjs", url: baseURL + "/entrar", timeout: 60000 },
});
