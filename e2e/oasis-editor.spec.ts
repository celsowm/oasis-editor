import { expect, test } from "@playwright/test";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function ensureToolbarVisible(page: import("@playwright/test").Page, testId: string) {
  const target = page.locator(`[data-testid="${testId}"]:visible`);
  if (!(await target.isVisible().catch(() => false))) {
    const overflow = page.locator('[data-testid="editor-toolbar-overflow-dropdown"]');
    if (await overflow.isVisible().catch(() => false)) {
      await overflow.click();
    }
  }
  return target;
}

async function clickToolbarLink(page: import("@playwright/test").Page) {
  const link = await ensureToolbarVisible(page, "editor-toolbar-link");
  await link.click();
}

async function pastePlainText(page: import("@playwright/test").Page, text: string) {
  await page.evaluate((value) => {
    const input = document.querySelector('[data-testid="editor-input"]') as HTMLTextAreaElement | null;
    if (!input) {
      throw new Error("Editor input not found");
    }

    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", value);
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    });
    input.dispatchEvent(event);
  }, text);
}

test.describe("Oasis Editor 2 smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`BROWSER ERROR: ${msg.text()}`);
      }
    });

    await page.goto("/oasis-editor/");
    await page.waitForSelector("#oasis-editor-loading", { state: "detached" });
  });

  test("loads the v2 shell and accepts typing", async ({ page }) => {
    await expect(page.locator(".oasis-editor-app")).toBeVisible();
    await expect(page.locator('[data-testid="editor-page"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="editor-block"]').first()).toBeVisible();

    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();
    await page.keyboard.type("hello");

    await expect(page.locator('[data-testid="editor-block"]')).toContainText("hello");
  });

  test("moves the caret from a click and inserts at the clicked offset", async ({ page }) => {
    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();
    await page.keyboard.type("ab");

    const chars = page.locator('[data-testid="editor-char"]');
    const firstChar = chars.first();
    const box = await firstChar.boundingBox();
    if (!box) {
      throw new Error("Could not measure the first character");
    }

    await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
    await page.keyboard.type("X");

    await expect(page.locator('[data-testid="editor-block"]')).toContainText("aXb");
  });

  test("inserts and selects an inline image from the toolbar", async ({ page }) => {
    await page.locator('[data-testid="editor-toolbar-insert-image"]').click();
    await page.locator('[data-testid="editor-insert-image-input"]').setInputFiles({
      name: "inline.png",
      mimeType: "image/png",
      buffer: SAMPLE_PNG,
    });

    const image = page.locator('[data-testid="editor-image"]');
    await expect(image).toBeVisible();

    await image.click();
    await expect(page.locator('[data-testid="editor-image-resize-handle"]')).toBeVisible();
  });

  test("inserts a table and moves between cells with tab", async ({ page }) => {
    await page.locator('[data-testid="editor-toolbar-insert-table"]').click();
    await expect(page.locator('[data-testid="editor-table-cell"]')).toHaveCount(9);

    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();
    await page.keyboard.type("A1");
    await page.keyboard.press("Tab");
    await page.keyboard.type("B1");

    const cells = page.locator('[data-testid="editor-table-cell"]');
    await expect(cells.nth(0)).toContainText("A1");
    await expect(cells.nth(1)).toContainText("B1");
  });
  test("creates and edits a link through the prompt flow", async ({ page }) => {
    await page.locator('[data-testid="editor-input"]').focus();
    await page.keyboard.type("link");
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");

    await clickToolbarLink(page);
    await page.locator('[data-testid="editor-link-dialog-input"]').fill("https://example.com");
    await page.locator('[data-testid="editor-link-dialog-apply"]').click();

    const link = page.locator('[data-testid="editor-link"]');
    await expect(link).toHaveAttribute("href", "https://example.com");

    await page.keyboard.press("ArrowLeft");
    await clickToolbarLink(page);
    await page.locator('[data-testid="editor-link-dialog-input"]').fill("https://edited.example.com");
    await page.locator('[data-testid="editor-link-dialog-apply"]').click();

    await expect(link).toHaveAttribute("href", "https://edited.example.com");
    const unlink = await ensureToolbarVisible(page, "editor-toolbar-unlink");
    await expect(unlink).toBeEnabled();
  });

  test("applies inline formatting shortcuts and paragraph metrics", async ({ page }) => {
    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();
    await page.keyboard.type("style");
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");

    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${mod}+B`);
    await page.keyboard.press(`${mod}+I`);
    await page.keyboard.press(`${mod}+U`);

    const formattedRun = page.locator('[data-testid="editor-run"]').last();
    await expect(formattedRun).toHaveCSS("font-weight", "700");
    await expect(formattedRun).toHaveCSS("font-style", "italic");
    await expect.poll(async () =>
      formattedRun.evaluate((node) => getComputedStyle(node).textDecorationLine),
    ).toContain("underline");

    const lineHeight = await ensureToolbarVisible(page, "editor-toolbar-line-height");
    const spacingAfter = await ensureToolbarVisible(page, "editor-toolbar-spacing-after");
    const indentLeft = await ensureToolbarVisible(page, "editor-toolbar-indent-left");

    await lineHeight.fill("1.8");
    await lineHeight.press("Enter");
    await spacingAfter.fill("24");
    await spacingAfter.press("Enter");
    await indentLeft.fill("32");
    await indentLeft.press("Enter");

    const paragraph = page.locator('[data-testid="editor-block"]').first();
    await expect.poll(async () => paragraph.evaluate((node) => (node as HTMLElement).style.lineHeight)).toBe("1.8");
    await expect(paragraph).toHaveCSS("padding-bottom", "24px");
    await expect(paragraph).toHaveCSS("padding-left", "32px");
  });

  test("keeps the list marker attached to the item when centered and right-aligned", async ({ page }) => {
    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();
    await page.keyboard.type("foo");

    const bulletButton = await ensureToolbarVisible(page, "editor-toolbar-list-bullet");
    await bulletButton.click();

    const block = page.locator('[data-testid="editor-block"]').first();
    const marker = page.locator('[data-testid="editor-list-marker"]').first();
    const firstChar = page.locator('[data-testid="editor-char"]').first();

    const measure = async () =>
      page.evaluate(() => {
        const pageNode = document.querySelector('[data-testid="editor-page"]') as HTMLElement | null;
        const blockNode = document.querySelector('[data-testid="editor-block"]') as HTMLElement | null;
        const listItemNode = document.querySelector('[data-testid="editor-list-item"]') as HTMLElement | null;
        const markerNode = document.querySelector('[data-testid="editor-list-marker"]') as HTMLElement | null;
        const charNode = document.querySelector('[data-testid="editor-char"]') as HTMLElement | null;
        if (!pageNode || !blockNode || !listItemNode || !markerNode || !charNode) {
          throw new Error("List geometry is not available");
        }

        const pageRect = pageNode.getBoundingClientRect();
        const blockRect = blockNode.getBoundingClientRect();
        const listItemRect = listItemNode.getBoundingClientRect();
        const markerRect = markerNode.getBoundingClientRect();
        const charRect = charNode.getBoundingClientRect();

        return {
          itemOffset: listItemRect.left - pageRect.left,
          blockOffset: blockRect.left - pageRect.left,
          markerToTextGap: charRect.left - markerRect.right,
        };
      });

    await expect(block).toContainText("foo");
    await expect(marker).toContainText("•");
    await expect(firstChar).toContainText("f");

    const leftMetrics = await measure();

    const alignCenterButton = await ensureToolbarVisible(page, "editor-toolbar-align-center");
    await alignCenterButton.click();
    await expect(block).toHaveAttribute("data-list-align", "center");

    const centeredMetrics = await measure();
    expect(centeredMetrics.itemOffset).toBeGreaterThan(leftMetrics.itemOffset + 40);
    expect(centeredMetrics.markerToTextGap).toBeLessThan(40);

    const alignRightButton = await ensureToolbarVisible(page, "editor-toolbar-align-right");
    await alignRightButton.click();
    await expect(block).toHaveAttribute("data-list-align", "right");

    const rightMetrics = await measure();
    expect(rightMetrics.itemOffset).toBeGreaterThan(centeredMetrics.itemOffset + 40);
    expect(rightMetrics.markerToTextGap).toBeLessThan(40);
  });

  test("keeps ordered list numbering attached to the item when centered and right-aligned", async ({ page }) => {
    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();
    await page.keyboard.type("foo");

    const orderedButton = await ensureToolbarVisible(page, "editor-toolbar-list-ordered");
    await orderedButton.click();

    const block = page.locator('[data-testid="editor-block"]').first();
    const marker = page.locator('[data-testid="editor-list-marker"]').first();
    const firstChar = page.locator('[data-testid="editor-char"]').first();

    const measure = async () =>
      page.evaluate(() => {
        const pageNode = document.querySelector('[data-testid="editor-page"]') as HTMLElement | null;
        const listItemNode = document.querySelector('[data-testid="editor-list-item"]') as HTMLElement | null;
        const markerNode = document.querySelector('[data-testid="editor-list-marker"]') as HTMLElement | null;
        const charNode = document.querySelector('[data-testid="editor-char"]') as HTMLElement | null;
        if (!pageNode || !listItemNode || !markerNode || !charNode) {
          throw new Error("List geometry is not available");
        }

        const pageRect = pageNode.getBoundingClientRect();
        const listItemRect = listItemNode.getBoundingClientRect();
        const markerRect = markerNode.getBoundingClientRect();
        const charRect = charNode.getBoundingClientRect();

        return {
          itemOffset: listItemRect.left - pageRect.left,
          markerToTextGap: charRect.left - markerRect.right,
        };
      });

    await expect(block).toContainText("foo");
    await expect(marker).toContainText("1.");
    await expect(firstChar).toContainText("f");

    const leftMetrics = await measure();

    const alignCenterButton = await ensureToolbarVisible(page, "editor-toolbar-align-center");
    await alignCenterButton.click();
    await expect(block).toHaveAttribute("data-list-align", "center");

    const centeredMetrics = await measure();
    expect(centeredMetrics.itemOffset).toBeGreaterThan(leftMetrics.itemOffset + 40);
    expect(centeredMetrics.markerToTextGap).toBeLessThan(40);

    const alignRightButton = await ensureToolbarVisible(page, "editor-toolbar-align-right");
    await alignRightButton.click();
    await expect(block).toHaveAttribute("data-list-align", "right");

    const rightMetrics = await measure();
    expect(rightMetrics.itemOffset).toBeGreaterThan(centeredMetrics.itemOffset + 40);
    expect(rightMetrics.markerToTextGap).toBeLessThan(40);
  });

  test("keeps typing after repagination and internal scroll", async ({ page }) => {
    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();

    const lines = Array.from({ length: 60 }, (_, index) => `Line ${String(index + 1).padStart(2, "0")}`).join("\n");
    await pastePlainText(page, lines);

    await expect
      .poll(async () => page.locator('[data-testid="editor-page"]').count())
      .toBeGreaterThan(1);

    const editor = page.locator('[data-testid="editor-editor"]');
    await editor.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await input.focus();
    await page.keyboard.type("abc");

    await expect(page.locator('[data-testid="editor-block"]').last()).toContainText("abc");
  });

  test("clicks into a lower page after scroll and inserts into the clicked paragraph", async ({ page }) => {
    const input = page.locator('[data-testid="editor-input"]');
    await input.focus();

    const lines = Array.from({ length: 60 }, (_, index) => `Paragraph ${String(index + 1).padStart(2, "0")}`).join("\n");
    await pastePlainText(page, lines);

    const editor = page.locator('[data-testid="editor-editor"]');
    await editor.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await page.waitForTimeout(100);
    const lastParagraph = page.locator('[data-testid="editor-block"]').last();
    await expect(lastParagraph).toBeVisible();
    const box = await lastParagraph.boundingBox();
    if (!box) {
      throw new Error("Could not measure the lower page paragraph");
    }

    await lastParagraph.click({
      position: {
        x: Math.max(1, box.width - 1),
        y: Math.max(1, box.height / 2),
      },
    });
    await page.keyboard.type("X");

    await expect(lastParagraph).toContainText("Paragraph 60X");
  });
});
