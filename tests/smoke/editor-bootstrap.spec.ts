import { expect, test } from "@playwright/test";

test("production editor boots without uncaught errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack ?? error.message),
  );

  await page.addInitScript(() => {
    localStorage.setItem("oasis.welcomeSeen", "1");
  });
  await page.goto("/oasis-editor/#/editor", { waitUntil: "load" });

  await expect(
    page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
  ).toBeVisible();
  await page.waitForTimeout(1_000);

  expect(pageErrors).toEqual([]);
});
