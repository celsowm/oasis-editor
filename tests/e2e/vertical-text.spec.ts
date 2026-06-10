import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const VERTICAL_DOCX = resolve("ooxml_vertical_text_examples.docx");

test.describe.configure({ timeout: 180_000 });

async function gotoEditor(page: Page) {
  await page.goto("/oasis-editor/index.html", { waitUntil: "load" });
  await expect(
    page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
  ).toBeVisible({ timeout: 60_000 });
  const debugReady = await page.evaluate(() =>
    Boolean(window.__oasisCanvasDebug),
  );
  if (!debugReady) {
    throw new Error("__oasisCanvasDebug is not available");
  }
}

async function importVerticalDocx(page: Page) {
  const done = page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 90_000,
  });
  await page
    .getByTestId("editor-import-docx-input")
    .setInputFiles(VERTICAL_DOCX);
  await done;
  await page
    .getByTestId("editor-import-overlay")
    .waitFor({ state: "detached", timeout: 90_000 });
  await page.waitForTimeout(200);
  // The layout snapshot is built during hit-testing; warm it with a click.
  const rect = await page
    .locator('[data-testid="editor-page"][data-renderer="canvas"]')
    .first()
    .boundingBox();
  if (rect) {
    await page.mouse.click(rect.x + rect.width / 2, rect.y + 120);
  }
  await page.waitForTimeout(100);
}

test("imported vertical cells carry a vertical render mode", async ({
  page,
}) => {
  await gotoEditor(page);
  await importVerticalDocx(page);

  const modes = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    return Array.from(
      new Set(
        snapshot.paragraphs
          .map((entry) => entry.verticalMode)
          .filter((mode): mode is string => Boolean(mode)),
      ),
    ).sort();
  });

  expect(modes).not.toBeNull();
  // tbRl/tbRlV→rotate-cw and btLr→rotate-ccw appear on the fixture's paragraphs
  // and cells. lrTbV renders horizontally (no vertical mode), and `stack` is only
  // used by `wordArtVert` text boxes (not part of `snapshot.paragraphs`).
  expect(modes).toContain("rotate-cw");
  expect(modes).toContain("rotate-ccw");
  expect(modes).not.toContain("stack");
});

test("inline text boxes are tracked for the imported fixture", async ({
  page,
}) => {
  await gotoEditor(page);
  await importVerticalDocx(page);

  const count = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    return snapshot?.inlineTextBoxes.length ?? 0;
  });
  expect(count).toBeGreaterThan(0);
});

test("clicking inside a rotated cell resolves a caret on that paragraph", async ({
  page,
}) => {
  await gotoEditor(page);
  await importVerticalDocx(page);

  const target = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const paragraph = snapshot.paragraphs.find(
      (entry) =>
        (entry.verticalMode === "rotate-cw" ||
          entry.verticalMode === "rotate-ccw") &&
        entry.lines.length > 0 &&
        entry.lines[0]!.slots.length > 1,
    );
    if (!paragraph) return null;
    const slot = paragraph.lines[0]!.slots[0]!;
    return {
      paragraphId: paragraph.paragraphId,
      x: slot.left,
      y: slot.top + slot.height / 2,
    };
  });
  if (!target) {
    throw new Error("no rotated vertical cell found in snapshot");
  }

  await page.mouse.click(target.x, target.y);
  const hit = await page.evaluate(
    () => window.__oasisCanvasDebug?.getLastHit() ?? null,
  );
  expect(hit).not.toBeNull();
  expect(hit?.source).toBe("canvas-layout");
  expect(hit?.resolvedFromParagraph).toBe(true);
  expect(hit?.paragraphId).toBe(target.paragraphId);
});
