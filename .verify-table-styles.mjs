import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1540, height: 900 } });

await page.goto("http://127.0.0.1:4201", { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas");
await page.waitForTimeout(1500);
const dismiss = page.getByRole("button", { name: /Agora não/i });
if (await dismiss.isVisible().catch(() => false)) {
  await dismiss.evaluate((button) => button.click());
}

await page
  .getByRole("tab", { name: /^Inserir$/i })
  .evaluate((button) => button.click());
await page.waitForSelector('[data-testid="editor-toolbar-insert-table"]');
await page.locator('[data-testid="editor-toolbar-insert-table"]').click();
await page.locator('[data-testid="editor-toolbar-table-grid-3x3"]').click();
await page
  .getByRole("tab", { name: /Design da Tabela/i })
  .evaluate((button) => button.click());
await page.waitForTimeout(500);

const strip = page.locator(".oasis-editor-table-style-strip");
if ((await strip.locator(".oasis-editor-table-style-card").count()) !== 14) {
  throw new Error("The Table Design strip does not contain all 14 presets");
}
await page.screenshot({ path: "output/verify-table-style-strip.png" });

await strip.locator('[data-style-id="LightShading-Accent1"]').click();
await page.waitForTimeout(500);
if (
  !(await strip
    .locator('[data-style-id="LightShading-Accent1"]')
    .getAttribute("aria-selected"))
) {
  throw new Error("Applied table style is not selected in the gallery");
}
await page.screenshot({ path: "output/verify-table-style-applied.png" });

await page.locator('[data-testid="editor-toolbar-tbl-style-expand"]').click();
await page.waitForTimeout(300);
const panel = page.locator('[data-testid="editor-toolbar-tbl-style-panel"]');
if ((await panel.locator(".oasis-editor-table-style-card").count()) !== 14) {
  throw new Error("Expanded Table Design gallery does not contain all presets");
}
await page.screenshot({ path: "output/verify-table-style-gallery.png" });

console.log("Table style strip, application, and expanded gallery verified");
await browser.close();
