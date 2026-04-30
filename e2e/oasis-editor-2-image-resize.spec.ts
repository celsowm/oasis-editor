import { expect, test, type Page } from "@playwright/test";

async function createCanvasPngDataUrl(page: Page, width: number, height: number) {
  return page.evaluate(({ width, height }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, Math.max(8, Math.floor(height / 6)));
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(Math.floor(width / 6), Math.floor(height / 4), Math.floor(width / 2), Math.floor(height / 2));
    return canvas.toDataURL("image/png");
  }, { width, height });
}

test.describe("Oasis Editor 2 image resize", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/oasis-editor-2/");
    await page.waitForSelector("#oasis-editor-2-loading", { state: "detached" });
  });

  test("clamps resized inline images to the page width", async ({ page }) => {
    const dataUrl = await createCanvasPngDataUrl(page, 120, 48);
    const buffer = Buffer.from(dataUrl.split(",")[1]!, "base64");

    await page.locator('[data-testid="editor-2-toolbar-insert-image"]').click();
    await page.locator('[data-testid="editor-2-insert-image-input"]').setInputFiles({
      name: "resize.png",
      mimeType: "image/png",
      buffer,
    });

    const image = page.locator('[data-testid="editor-2-image"]');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("width", "120");

    await image.click();

    const handle = page.locator('[data-testid="editor-2-image-resize-handle"]');
    await expect(handle).toBeVisible();

    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      throw new Error("Could not get resize handle box");
    }

    const maxInlineWidth = await page.locator('[data-testid="editor-2-surface"]').evaluate((surface) => {
      const computed = window.getComputedStyle(surface);
      const width = surface.getBoundingClientRect().width;
      const paddingLeft = Number.parseFloat(computed.paddingLeft || "0") || 0;
      const paddingRight = Number.parseFloat(computed.paddingRight || "0") || 0;
      return Math.max(24, Math.floor(width - paddingLeft - paddingRight));
    });

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 1200, handleBox.y + handleBox.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect.poll(async () => Number(await image.getAttribute("width"))).toBe(maxInlineWidth);
  });
});
