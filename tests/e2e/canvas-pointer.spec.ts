import { expect, test, type Page } from "@playwright/test";

type Point = { x: number; y: number };

async function seedText(page: Page, text: string) {
  const pageRect = await page.getByTestId("editor-page").first().boundingBox();
  if (!pageRect) throw new Error("editor page not found");
  await page.mouse.click(pageRect.x + 180, pageRect.y + 140);
  await page.keyboard.type(text);
  await page.waitForTimeout(60);
}

async function charPointInMainText(page: Page, charIndex: number): Promise<Point> {
  const point = await page.evaluate((index) => {
    const segment = document.querySelector<HTMLElement>(
      '[data-testid="editor-surface"] [data-segment="text"]',
    );
    if (!segment) return null;
    const textNode = segment.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
    const text = textNode.nodeValue ?? "";
    const i = Math.max(0, Math.min(index, Math.max(0, text.length - 1)));
    const range = document.createRange();
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const rect = range.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, charIndex);
  if (!point) throw new Error("main text char point not found");
  return point;
}

async function firstTableCellCharPoint(page: Page, charIndex: number): Promise<Point> {
  const point = await page.evaluate((index) => {
    const segment = document.querySelector<HTMLElement>(
      '[data-row-index="0"][data-cell-index="0"] [data-segment="text"]',
    );
    if (!segment) return null;
    const textNode = segment.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
    const text = textNode.nodeValue ?? "";
    const i = Math.max(0, Math.min(index, Math.max(0, text.length - 1)));
    const range = document.createRange();
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const rect = range.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, charIndex);
  if (!point) throw new Error("table cell char point not found");
  return point;
}

test("canvas pointer interactions update caret and selection without fallback", async ({ page }) => {
  const fallbackLogs: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("canvas:fallback-hit-test")) {
      fallbackLogs.push(message.text());
    }
  });

  await page.goto("/oasis-editor/index.html", { waitUntil: "domcontentloaded" });
  await seedText(page, "alpha beta gamma delta epsilon");

  const p1 = await charPointInMainText(page, 1);
  const p2 = await charPointInMainText(page, 20);

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

  await page.goto("/oasis-editor/index.html", { waitUntil: "domcontentloaded" });
  await seedText(page, "header zone trigger");

  const editorPage = await page.getByTestId("editor-page").first().boundingBox();
  if (!editorPage) throw new Error("editor page missing");
  await page.mouse.click(editorPage.x + editorPage.width / 2, editorPage.y + 26);
  await page.waitForTimeout(80);
  const caret = await page.locator(".oasis-editor-caret").boundingBox();
  expect(caret).not.toBeNull();
  expect((caret?.y ?? Number.POSITIVE_INFINITY) < editorPage.y + 92).toBeTruthy();

  await page.getByTestId("editor-toolbar-insert-table").click();
  await page.getByTestId("editor-toolbar-table-grid-2x2").click();

  const firstCell = page.locator('[data-testid="editor-table-cell"][data-row-index="0"][data-cell-index="0"]').first();
  await expect(firstCell).toBeVisible();
  const firstCellBox = await firstCell.boundingBox();
  if (!firstCellBox) throw new Error("first cell box missing");
  await page.mouse.click(firstCellBox.x + 12, firstCellBox.y + 12);
  await page.keyboard.type("table cell words");
  await page.waitForTimeout(80);

  const c1 = await firstTableCellCharPoint(page, 1);
  const c2 = await firstTableCellCharPoint(page, 10);
  await page.mouse.move(c1.x, c1.y);
  await page.mouse.down();
  await page.mouse.move(c2.x, c2.y);
  await page.mouse.up();
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();

  expect(fallbackLogs).toEqual([]);
});
