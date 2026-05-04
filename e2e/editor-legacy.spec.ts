import { test, expect } from "@playwright/test";

test.describe("Oasis Editor Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`BROWSER ERROR: ${msg.text()}`);
      }
    });

    await page.goto("/oasis-editor/");
    await page.waitForSelector("#oasis-editor-loading", { state: "detached" });
  });

  test("should load the editor shell and first page", async ({ page }) => {
    await expect(page.locator(".oasis-editor-shell")).toBeVisible();
    await expect(page.locator(".oasis-page")).toHaveCount(1);
    await expect(page.locator(".oasis-fragment").first()).toBeVisible();
    await expect(page.locator(".oasis-fragment--heading").first()).toBeVisible();
  });
});
