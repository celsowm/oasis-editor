import { defineConfig, devices } from "@playwright/test";

/**
 * Runs the specs under `tests/e2e`. The default config only matches the
 * performance suite and the smoke config only looks at `tests/smoke`, so
 * without this these specs had no runner at all.
 *
 * Two projects: pointer gestures must keep working with a mouse, and the touch
 * paths need a context that actually reports `pointerType: "touch"`. Specs
 * named `*.touch.spec.ts` run only in the touch project.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    // The specs here navigate to "/oasis-editor/index.html", so the server must
    // serve under that base — the same arrangement the smoke config uses.
    baseURL: "http://127.0.0.1:4201/oasis-editor/",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4201 --strictPort --base /oasis-editor/",
    url: "http://127.0.0.1:4201/oasis-editor/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/*.touch.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // A phone-sized viewport with a real touchscreen. The bundled device
      // profiles (e.g. "Pixel 7") were unreliable here — page.goto would hang —
      // so this composes the pieces that matter instead.
      name: "touch",
      testMatch: "**/*.touch.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 412, height: 915 },
        hasTouch: true,
      },
    },
  ],
});
