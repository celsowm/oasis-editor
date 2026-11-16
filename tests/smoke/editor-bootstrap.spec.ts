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


test("site editor modes use real shells and share browser history", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("oasis.welcomeSeen", "1");
  });
  await page.goto("/oasis-editor/?demo=1#/editor");
  const host = page.locator(".oasis-site-editor-host");
  const paper = host.locator('[data-testid="editor-page"][data-renderer="canvas"]').first();
  await expect(paper).toBeVisible();
  await expect(page.getByTestId("site-shell-document")).toHaveAttribute("aria-pressed", "true");

  // A sentinel on the outer runtime proves the mode switch does not reload
  // the page or remount the entire OasisEditorApp.
  const runtime = host.locator(".oasis-editor-shell").first();
  await runtime.evaluate(el => el.setAttribute("data-smoke-runtime", "original"));
  await page.getByTestId("site-shell-inline").click();
  await expect(host.locator(".oasis-inline-shell")).toBeVisible();
  await expect(paper).toBeVisible();
  await expect(page.getByTestId("site-shell-inline")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/demo=1&shell=inline/);
  await expect(runtime).toHaveAttribute("data-smoke-runtime", "original");

  await page.getByTestId("site-shell-balloon").click();
  await expect(host.locator(".oasis-balloon-shell")).toBeVisible();
  await expect(paper).toBeVisible();
  await expect(runtime).toHaveAttribute("data-smoke-runtime", "original");
  await page.goBack();
  await expect(host.locator(".oasis-inline-shell")).toBeVisible();
  await expect(page.getByTestId("site-shell-inline")).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(host.locator(".oasis-balloon-shell")).toBeVisible();
  await page.getByTestId("site-shell-document").click();
  await expect(host.locator(".oasis-inline-shell, .oasis-balloon-shell")).toHaveCount(0);
  await expect(paper).toBeVisible();
  await expect(page).toHaveURL(/\?demo=1#\/editor$/);
  await expect(runtime).toHaveAttribute("data-smoke-runtime", "original");

  await page.setViewportSize({width: 390, height: 844});
  await expect(page.getByTestId("site-shell-inline")).toBeInViewport();
  await page.getByTestId("site-shell-inline").click();
  await expect(host.locator(".oasis-inline-shell")).toBeVisible();
  await page.reload();
  await expect(host.locator(".oasis-inline-shell")).toBeVisible();
  await expect(page.getByTestId("site-shell-inline")).toHaveAttribute("aria-pressed", "true");
  expect(pageErrors).toEqual([]);
});


test("tab stop lab opens the actual editable document and ruler", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/oasis-editor/?demo=tabs#/editor");
  await expect(page.getByTestId("site-tab-demo-help")).toBeVisible();
  await expect(page.getByTestId("editor-page").first()).toBeVisible();
  const ruler = page.getByTestId("editor-horizontal-ruler");
  await expect(ruler).toBeVisible();
  await expect(ruler.getByTestId("editor-ruler-tab-selector")).toBeEnabled();
  const marker = ruler.locator('[data-testid="editor-ruler-tab-marker"][data-position-pt="360"]');
  await expect(marker).toBeVisible();
  await marker.dblclick();
  await expect(page.getByTestId("editor-tab-stops-dialog")).toBeVisible();
  await expect(page.getByTestId("editor-tab-stops-position")).toHaveValue("360");
  await expect(page.getByTestId("editor-tab-stops-position")).toBeFocused();
  await page.getByTestId("editor-tab-stops-apply").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("editor-tab-stops-dialog").getByTestId("editor-dialog-close")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByTestId("editor-tab-stops-apply")).toBeFocused();
  await page.getByTestId("editor-tab-stops-cancel").click();
  await expect(page.getByTestId("editor-tab-stops-dialog")).toHaveCount(0);
  await page.getByTestId("site-shell-inline").click();
  await expect(page.locator(".oasis-inline-shell")).toBeVisible();
  await page.getByTestId("site-shell-document").click();
  await expect(marker).toBeVisible();
  expect(errors).toEqual([]);
});
