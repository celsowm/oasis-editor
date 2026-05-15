import { expect, test, type Page } from "@playwright/test";

type Point = { x: number; y: number };

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

async function caretPoint(page: Page): Promise<Point> {
  const caret = await page.locator(".oasis-editor-caret").boundingBox();
  if (!caret) throw new Error("caret not visible");
  return { x: caret.x + Math.max(2, caret.width / 2), y: caret.y + caret.height / 2 };
}

async function seedText(page: Page, text: string) {
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 180, pageRect.y + 140);
  await page.keyboard.type(text);
  await page.waitForTimeout(60);
}

function offsetPoint(point: Point, dx: number, dy = 0): Point {
  return { x: point.x + dx, y: point.y + dy };
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

test("canvas header click moves caret to header zone and table cell text selection works", async ({
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

  await page.getByTestId("editor-toolbar-insert-table").click();
  await page.getByTestId("editor-toolbar-table-grid-2x2").click();

  await page.waitForTimeout(80);
  const start = await caretPoint(page);
  await page.mouse.click(start.x, start.y);
  await page.keyboard.type("table cell words");
  await page.waitForTimeout(80);

  const c1 = await caretPoint(page);
  const c2 = offsetPoint(c1, -88, 0);
  await page.mouse.move(c1.x, c1.y);
  await page.mouse.down();
  await page.mouse.move(c2.x, c2.y);
  await page.mouse.up();
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  expect(fallbackLogs).toEqual([]);
});
