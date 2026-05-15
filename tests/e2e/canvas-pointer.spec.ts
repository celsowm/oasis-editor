import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const SIMPLE_LOREM_DOCX = resolve("src/__tests__/word-parity/fixtures/word-authored-lorem.docx");

async function canvasPageRect(page: Page) {
  const rect = await page
    .locator('[data-testid="editor-page"][data-renderer="canvas"]')
    .first()
    .boundingBox();
  if (!rect) throw new Error("canvas editor page not found");
  return rect;
}

async function gotoEditor(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto("/oasis-editor/index.html", { waitUntil: "load" });
      await expect(
        page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
      ).toBeVisible();
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(300);
    }
  }
}

async function seedText(page: Page, text: string) {
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 180, pageRect.y + 140);
  await page.keyboard.type(text);
  await page.waitForTimeout(60);
}

test("canvas pointer interactions update caret and selection without fallback", async ({ page }) => {
  const fallbackLogs: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("canvas:fallback-hit-test")) {
      fallbackLogs.push(message.text());
    }
  });

  await gotoEditor(page);
  await seedText(page, "alpha beta gamma delta epsilon");

  const pageRect = await canvasPageRect(page);
  const p1 = { x: pageRect.x + 186, y: pageRect.y + 140 };
  const p2 = { x: pageRect.x + 334, y: pageRect.y + 140 };

  await page.mouse.click(p1.x, p1.y);
  const caretBefore = await page.locator(".oasis-editor-caret").boundingBox();
  await page.mouse.click(p2.x, p2.y);
  const caretAfter = await page.locator(".oasis-editor-caret").boundingBox();
  expect(caretBefore).not.toBeNull();
  expect(caretAfter).not.toBeNull();
  expect(Math.abs((caretAfter?.x ?? 0) - (caretBefore?.x ?? 0))).toBeGreaterThan(8);

  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y);
  await page.mouse.up();
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  await page.mouse.click(p1.x, p1.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.up("Shift");
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  await page.mouse.dblclick(p2.x, p2.y);
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  await page.mouse.click(p2.x, p2.y, { clickCount: 3 });
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  expect(fallbackLogs).toEqual([]);
});

test("canvas header click moves caret to header zone without fallback", async ({
  page,
}) => {
  const fallbackLogs: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("canvas:fallback-hit-test")) {
      fallbackLogs.push(message.text());
    }
  });

  await gotoEditor(page);
  await seedText(page, "header zone trigger");

  const editorPage = await canvasPageRect(page);
  if (!editorPage) throw new Error("editor page missing");
  await page.mouse.click(editorPage.x + editorPage.width / 2, editorPage.y + 26);
  await page.waitForTimeout(80);
  const caret = await page.locator(".oasis-editor-caret").boundingBox();
  expect(caret).not.toBeNull();
  expect((caret?.y ?? Number.POSITIVE_INFINITY) < editorPage.y + 92).toBeTruthy();

  expect(fallbackLogs).toEqual([]);
});

test("DOCX lorem simples hit-test never uses source=dom-fallback", async ({ page }) => {
  const fallbackSourceLogs: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("source\":\"dom-fallback\"")) {
      fallbackSourceLogs.push(message.text());
    }
  });

  await gotoEditor(page);
  await page.getByTestId("editor-import-docx-input").setInputFiles(SIMPLE_LOREM_DOCX);
  await page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 45_000,
  });
  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });

  const pageRect = await canvasPageRect(page);
  const p1 = { x: pageRect.x + 220, y: pageRect.y + 200 };
  const p2 = { x: pageRect.x + 420, y: pageRect.y + 200 };

  await page.mouse.click(p1.x, p1.y);
  await page.mouse.click(p2.x, p2.y);
  await page.mouse.dblclick(p2.x, p2.y);
  await page.mouse.click(p2.x, p2.y, { clickCount: 3 });

  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y);
  await page.mouse.up();
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  expect(fallbackSourceLogs).toEqual([]);
});
