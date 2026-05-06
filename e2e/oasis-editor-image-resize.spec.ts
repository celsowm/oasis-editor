import { expect, test, type Locator, type Page } from "@playwright/test";

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
    await page.goto("/oasis-editor/");
    await page.waitForSelector("#oasis-editor-loading", { state: "detached" });
  });

  async function insertTestImage(page: Page, width = 120, height = 48) {
    const dataUrl = await createCanvasPngDataUrl(page, width, height);
    const buffer = Buffer.from(dataUrl.split(",")[1]!, "base64");

    await page.locator('[data-testid="editor-toolbar-insert-image"]').click();
    await page.locator('[data-testid="editor-insert-image-input"]').setInputFiles({
      name: "resize.png",
      mimeType: "image/png",
      buffer,
    });

    const image = page.locator('[data-testid="editor-image"]');
    await expect(image).toBeVisible();
    await image.click();
    return image;
  }

  async function dragHandle(
    page: Page,
    testId: string,
    deltaX: number,
    deltaY: number,
    options?: { shift?: boolean },
  ) {
    const handle = page.locator(`[data-testid="${testId}"]`);
    await expect(handle).toBeVisible();
    const box = await handle.boundingBox();
    if (!box) {
      throw new Error(`Could not get resize handle box for ${testId}`);
    }

    if (options?.shift) {
      await page.keyboard.down("Shift");
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2 + deltaY, {
      steps: 8,
    });
    await page.mouse.up();

    if (options?.shift) {
      await page.keyboard.up("Shift");
    }
  }

  async function getImageSize(image: Locator) {
    const width = Number(await image.getAttribute("width"));
    const height = Number(await image.getAttribute("height"));
    return { width, height };
  }

  test("renders all image resize handles and supports free resize with optional aspect lock", async ({ page }) => {
    const image = await insertTestImage(page);

    for (const direction of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
      await expect(page.locator(`[data-testid="editor-image-resize-handle-${direction}"]`)).toBeVisible();
    }

    await dragHandle(page, "editor-image-resize-handle-e", 60, 0);
    await expect.poll(() => getImageSize(image)).toEqual({ width: 180, height: 48 });

    await dragHandle(page, "editor-image-resize-handle-s", 0, 40);
    await expect.poll(() => getImageSize(image)).toEqual({ width: 180, height: 88 });

    await dragHandle(page, "editor-image-resize-handle-se", 30, 20);
    await expect.poll(() => getImageSize(image)).toEqual({ width: 210, height: 108 });

    await dragHandle(page, "editor-image-resize-handle-e", 60, 0, { shift: true });
    await expect.poll(() => getImageSize(image)).toEqual({ width: 270, height: 139 });
  });

  test("clamps resized inline images to the page width", async ({ page }) => {
    const dataUrl = await createCanvasPngDataUrl(page, 120, 48);
    const buffer = Buffer.from(dataUrl.split(",")[1]!, "base64");

    await page.locator('[data-testid="editor-toolbar-insert-image"]').click();
    await page.locator('[data-testid="editor-insert-image-input"]').setInputFiles({
      name: "resize.png",
      mimeType: "image/png",
      buffer,
    });

    const image = page.locator('[data-testid="editor-image"]');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("width", "120");

    await image.click();

    const maxInlineWidth = await page.locator('[data-testid="editor-surface"]').evaluate((surface) => {
      const computed = window.getComputedStyle(surface);
      const width = surface.getBoundingClientRect().width;
      const paddingLeft = Number.parseFloat(computed.paddingLeft || "0") || 0;
      const paddingRight = Number.parseFloat(computed.paddingRight || "0") || 0;
      return Math.max(24, Math.floor(width - paddingLeft - paddingRight));
    });

    await dragHandle(page, "editor-image-resize-handle-e", 1200, 0);

    await expect.poll(async () => Number(await image.getAttribute("width"))).toBe(maxInlineWidth);
  });
});
