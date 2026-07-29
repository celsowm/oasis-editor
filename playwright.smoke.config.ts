import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 60_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4200/oasis-editor/",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4200 --strictPort --base /oasis-editor/",
    url: "http://127.0.0.1:4200/oasis-editor/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
