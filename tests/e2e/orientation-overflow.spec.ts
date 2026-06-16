import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function gotoEditor(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("oasis.welcomeSeen", "1");
  });
  await page.goto("/oasis-editor/index.html", { waitUntil: "load" });
  await expect(
    page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
  ).toBeVisible({ timeout: 60_000 });
}

async function editorOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector(
      ".oasis-editor-editor",
    ) as HTMLElement | null;
    if (!el) return null;
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: el.scrollWidth - el.clientWidth,
    };
  });
}

test("landscape does not force horizontal scroll on a 16:9 viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await gotoEditor(page);

  // A single page is taller than the editor viewport, so the vertical scrollbar
  // is already present — no text seeding needed.
  const portrait = await editorOverflow(page);
  expect(portrait).not.toBeNull();
  expect(portrait!.overflowX).toBeLessThanOrEqual(1);

  // Switch to landscape via Layout ribbon tab -> Page setup -> Landscape.
  await page.getByTestId("editor-ribbon-tab-layout").click();
  await page.getByTestId("editor-toolbar-section-dropdown").click();
  await page.getByTestId("editor-toolbar-orientation-landscape").click();
  await page.waitForTimeout(200);

  const landscape = await editorOverflow(page);
  expect(landscape).not.toBeNull();
  // The editor must grow to fit the wider landscape page...
  expect(landscape!.clientWidth).toBeGreaterThan(portrait!.clientWidth);
  // Landscape page is wider; the editor must grow to fit it without a
  // horizontal scrollbar (allow 1px for sub-pixel rounding).
  expect(landscape!.overflowX).toBeLessThanOrEqual(1);
});
