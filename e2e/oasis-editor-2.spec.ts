import { expect, test } from "@playwright/test";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function pastePlainText(page: import("@playwright/test").Page, text: string) {
  await page.evaluate((value) => {
    const input = document.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement | null;
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

    await page.goto("/oasis-editor-2/");
    await page.waitForSelector("#oasis-editor-2-loading", { state: "detached" });
  });

  test("loads the v2 shell and accepts typing", async ({ page }) => {
    await expect(page.locator(".oasis-editor-2-app")).toBeVisible();
    await expect(page.locator('[data-testid="editor-2-page"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="editor-2-block"]').first()).toBeVisible();

    const input = page.locator('[data-testid="editor-2-input"]');
    await input.focus();
    await page.keyboard.type("hello");

    await expect(page.locator('[data-testid="editor-2-block"]')).toContainText("hello");
  });

  test("moves the caret from a click and inserts at the clicked offset", async ({ page }) => {
    const input = page.locator('[data-testid="editor-2-input"]');
    await input.focus();
    await page.keyboard.type("ab");

    const chars = page.locator('[data-testid="editor-2-char"]');
    const firstChar = chars.first();
    const box = await firstChar.boundingBox();
    if (!box) {
      throw new Error("Could not measure the first character");
    }

    await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
    await page.keyboard.type("X");

    await expect(page.locator('[data-testid="editor-2-block"]')).toContainText("aXb");
  });

  test("inserts and selects an inline image from the toolbar", async ({ page }) => {
    await page.locator('[data-testid="editor-2-toolbar-insert-image"]').click();
    await page.locator('[data-testid="editor-2-insert-image-input"]').setInputFiles({
      name: "inline.png",
      mimeType: "image/png",
      buffer: SAMPLE_PNG,
    });

    const image = page.locator('[data-testid="editor-2-image"]');
    await expect(image).toBeVisible();

    await image.click();
    await expect(page.locator('[data-testid="editor-2-image-resize-handle"]')).toBeVisible();
  });

  test("inserts a table and moves between cells with tab", async ({ page }) => {
    await page.locator('[data-testid="editor-2-toolbar-insert-table"]').click();
    await expect(page.locator('[data-testid="editor-2-table-cell"]')).toHaveCount(9);

    const input = page.locator('[data-testid="editor-2-input"]');
    await input.focus();
    await page.keyboard.type("A1");
    await page.keyboard.press("Tab");
    await page.keyboard.type("B1");

    const cells = page.locator('[data-testid="editor-2-table-cell"]');
    await expect(cells.nth(0)).toContainText("A1");
    await expect(cells.nth(1)).toContainText("B1");
  });

  test("creates and edits a link through the prompt flow", async ({ page }) => {
    await page.locator('[data-testid="editor-2-input"]').focus();
    await page.keyboard.type("link");
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");

    page.once("dialog", (dialog) => dialog.accept("https://example.com"));
    await page.locator('[data-testid="editor-2-toolbar-link"]').click();

    const link = page.locator('[data-testid="editor-2-link"]');
    await expect(link).toHaveAttribute("href", "https://example.com");

    await page.keyboard.press("ArrowLeft");
    page.once("dialog", (dialog) => dialog.accept("https://edited.example.com"));
    await page.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+K`);

    await expect(link).toHaveAttribute("href", "https://edited.example.com");
    await expect(page.locator('[data-testid="editor-2-toolbar-unlink"]')).toBeEnabled();
  });

  test("applies inline formatting shortcuts and paragraph metrics", async ({ page }) => {
    const input = page.locator('[data-testid="editor-2-input"]');
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

    const formattedRun = page.locator('[data-testid="editor-2-run"]').last();
    await expect(formattedRun).toHaveCSS("font-weight", "700");
    await expect(formattedRun).toHaveCSS("font-style", "italic");
    await expect.poll(async () =>
      formattedRun.evaluate((node) => getComputedStyle(node).textDecorationLine),
    ).toContain("underline");

    const lineHeight = page.locator('[data-testid="editor-2-toolbar-line-height"]');
    const spacingAfter = page.locator('[data-testid="editor-2-toolbar-spacing-after"]');
    const indentLeft = page.locator('[data-testid="editor-2-toolbar-indent-left"]');

    await lineHeight.fill("1.8");
    await lineHeight.press("Enter");
    await spacingAfter.fill("24");
    await spacingAfter.press("Enter");
    await indentLeft.fill("32");
    await indentLeft.press("Enter");

    const paragraph = page.locator('[data-testid="editor-2-block"]').first();
    await expect.poll(async () => paragraph.evaluate((node) => (node as HTMLElement).style.lineHeight)).toBe("1.8");
    await expect(paragraph).toHaveCSS("padding-bottom", "24px");
    await expect(paragraph).toHaveCSS("padding-left", "32px");
  });

  test("keeps typing after repagination and internal scroll", async ({ page }) => {
    const input = page.locator('[data-testid="editor-2-input"]');
    await input.focus();

    const lines = Array.from({ length: 60 }, (_, index) => `Line ${String(index + 1).padStart(2, "0")}`).join("\n");
    await pastePlainText(page, lines);

    await expect
      .poll(async () => page.locator('[data-testid="editor-2-page"]').count())
      .toBeGreaterThan(1);

    const editor = page.locator('[data-testid="editor-2-editor"]');
    await editor.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await input.focus();
    await page.keyboard.type("abc");

    await expect(page.locator('[data-testid="editor-2-block"]').last()).toContainText("abc");
  });

  test("clicks into a lower page after scroll and inserts into the clicked paragraph", async ({ page }) => {
    const input = page.locator('[data-testid="editor-2-input"]');
    await input.focus();

    const lines = Array.from({ length: 60 }, (_, index) => `Paragraph ${String(index + 1).padStart(2, "0")}`).join("\n");
    await pastePlainText(page, lines);

    const editor = page.locator('[data-testid="editor-2-editor"]');
    await editor.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const lastParagraph = page.locator('[data-testid="editor-2-block"]').last();
    await expect(lastParagraph).toBeVisible();
    const firstChar = lastParagraph.locator('[data-testid="editor-2-char"]').first();
    const box = await firstChar.boundingBox();
    if (!box) {
      throw new Error("Could not measure the first character on the lower page");
    }

    await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
    await page.keyboard.type("X");

    await expect(lastParagraph).toContainText("Paragraph 60X");
  });
});
