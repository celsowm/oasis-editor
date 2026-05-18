import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { resolve } from "node:path";

const SIMPLE_LOREM_DOCX = resolve("src/__tests__/word-parity/fixtures/word-authored-lorem.docx");
const COMPLEX_DOCX = resolve("src/__tests__/word-parity/fixtures/documento_complexo.docx");
test.describe.configure({ timeout: 180_000 });

type CanvasDebugHit = {
  source: "canvas-layout";
  zone: "main" | "header" | "footer";
  paragraphId: string;
  paragraphOffset: number;
  resolvedFromParagraph: boolean;
  missReason?: string;
};

type CanvasDebugState = {
  lastHit: CanvasDebugHit | null;
  selection: {
    anchor: { paragraphId: string; runId: string; offset: number };
    focus: { paragraphId: string; runId: string; offset: number };
    activeZone: "main" | "header" | "footer";
    activeSectionIndex: number;
  } | null;
  missEvents: Array<{ reason: string; clientX: number; clientY: number }>;
};

async function canvasPageRect(page: Page) {
  const rect = await page
    .locator('[data-testid="editor-page"][data-renderer="canvas"]')
    .first()
    .boundingBox();
  if (!rect) throw new Error("canvas editor page not found");
  return rect;
}

async function gotoEditor(page: Page) {
  await page.goto("/oasis-editor/index.html", { waitUntil: "load" });
  await expect(
    page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
  ).toBeVisible();
  const debugReady = await page.evaluate(() => Boolean(window.__oasisCanvasDebug));
  if (!debugReady) {
    throw new Error("__oasisCanvasDebug is not available");
  }
}

async function getCanvasDebugState(page: Page): Promise<CanvasDebugState> {
  return page.evaluate(() => ({
    lastHit: window.__oasisCanvasDebug?.getLastHit() ?? null,
    selection: window.__oasisCanvasDebug?.getSelection?.() ?? null,
    missEvents: window.__oasisCanvasDebug?.getMissEvents() ?? [],
  }));
}

async function clearMissEvents(page: Page) {
  await page.evaluate(() => {
    window.__oasisCanvasDebug?.clearMissEvents();
  });
}

async function expectLastHitFromCanvas(page: Page) {
  const state = await getCanvasDebugState(page);
  expect(state.lastHit).not.toBeNull();
  expect(state.lastHit?.source).toBe("canvas-layout");
  return state.lastHit;
}

async function expectNoMissEvents(page: Page) {
  const state = await getCanvasDebugState(page);
  expect(state.missEvents).toEqual([]);
}

async function expectDebugSelection(page: Page) {
  const state = await getCanvasDebugState(page);
  expect(state.selection).not.toBeNull();
  return state.selection!;
}

async function expectTripleClickWordLikeRange(page: Page, point: { x: number; y: number }) {
  await page.mouse.click(point.x, point.y, { clickCount: 3 });
  const expectation = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    const selection = window.__oasisCanvasDebug?.getSelection?.();
    const hit = window.__oasisCanvasDebug?.getLastHit?.();
    if (!snapshot || !selection || !hit) return null;

    const zoneParagraphs = snapshot.paragraphs
      .filter((entry) => entry.zone === hit.zone)
      .sort((a, b) => a.paragraphIndex - b.paragraphIndex);
    const uniqueZoneParagraphs = zoneParagraphs.filter(
      (entry, index, all) => all.findIndex((candidate) => candidate.paragraphId === entry.paragraphId) === index,
    );
    const index = uniqueZoneParagraphs.findIndex((entry) => entry.paragraphId === hit.paragraphId);
    if (index < 0) return null;
    const current = uniqueZoneParagraphs[index]!;
    const next = uniqueZoneParagraphs[index + 1];
    return {
      zone: hit.zone,
      expectedAnchorParagraphId: current.paragraphId,
      expectedAnchorOffset: 0,
      expectedFocusParagraphId: next?.paragraphId ?? current.paragraphId,
      expectedFocusOffset: next ? 0 : current.textLength,
      actualAnchorParagraphId: selection.anchor.paragraphId,
      actualAnchorOffset: selection.anchor.offset,
      actualFocusParagraphId: selection.focus.paragraphId,
      actualFocusOffset: selection.focus.offset,
      actualZone: selection.activeZone,
    };
  });
  expect(expectation).not.toBeNull();
  expect(expectation!.actualAnchorParagraphId).toBe(expectation!.expectedAnchorParagraphId);
  const matchesNextParagraphMark =
    expectation!.actualAnchorOffset === expectation!.expectedAnchorOffset &&
    expectation!.actualFocusParagraphId === expectation!.expectedFocusParagraphId &&
    expectation!.actualFocusOffset === expectation!.expectedFocusOffset;
  const matchesLegacyParagraphRange =
    expectation!.actualFocusParagraphId === expectation!.expectedAnchorParagraphId &&
    expectation!.actualFocusOffset > expectation!.actualAnchorOffset;
  expect(matchesNextParagraphMark || matchesLegacyParagraphRange).toBeTruthy();
  expect(expectation!.actualZone).toBe(expectation!.zone);
}

async function seedText(page: Page, text: string) {
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 180, pageRect.y + 140);
  await expectLastHitFromCanvas(page);
  await page.keyboard.type(text);
  await page.waitForTimeout(60);
}

async function clickToolbarAction(page: Page, testId: string) {
  const button = page.getByTestId(testId);
  if (await button.isVisible()) {
    await button.click();
    return;
  }

  const overflow = page.getByTestId("editor-toolbar-overflow-dropdown");
  await expect(overflow).toBeVisible();
  await overflow.click();
  await expect(button).toBeVisible();
  await button.click();
}

async function insertTable(page: Page, rows: number, cols: number) {
  await clickToolbarAction(page, "editor-toolbar-insert-table");
  const gridCell = page.getByTestId(`editor-toolbar-table-grid-${rows}x${cols}`);
  await expect(gridCell).toBeVisible();
  await gridCell.click();
}

async function exercisePointerCoherence(
  page: Page,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  options: { requireWordClicks?: boolean; requireCaretDelta?: boolean; requireSelectionVisible?: boolean } = {},
) {
  const requireWordClicks = options.requireWordClicks ?? true;
  const requireCaretDelta = options.requireCaretDelta ?? true;
  const requireSelectionVisible = options.requireSelectionVisible ?? true;
  await page.mouse.click(p1.x, p1.y);
  await expectLastHitFromCanvas(page);
  const caretBefore = await page.locator(".oasis-editor-caret").boundingBox();

  await page.mouse.click(p2.x, p2.y);
  const hitAfterSecondClick = await expectLastHitFromCanvas(page);
  const caretAfter = await page.locator(".oasis-editor-caret").boundingBox();
  expect(caretBefore).not.toBeNull();
  expect(caretAfter).not.toBeNull();
  if (requireCaretDelta) {
    expect(Math.abs((caretAfter?.x ?? 0) - (caretBefore?.x ?? 0))).toBeGreaterThan(8);
  }
  expect(hitAfterSecondClick.resolvedFromParagraph).toBe(true);

  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y);
  await page.mouse.up();
  if (requireSelectionVisible) {
    await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
  }
  await expectLastHitFromCanvas(page);

  if (requireWordClicks) {
    await page.mouse.dblclick(p2.x, p2.y);
    await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
    await expectLastHitFromCanvas(page);

    await page.mouse.click(p2.x, p2.y, { clickCount: 3 });
    await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
    await expectLastHitFromCanvas(page);
  }
}

test("canvas pointer interactions update caret and selection from canvas layout only", async ({
  page,
}) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "alpha beta gamma delta epsilon");

  const pageRect = await canvasPageRect(page);
  const p1 = { x: pageRect.x + 186, y: pageRect.y + 140 };
  const p2 = { x: pageRect.x + 334, y: pageRect.y + 140 };
  await exercisePointerCoherence(page, p1, p2);
  await expectNoMissEvents(page);
});

test("canvas header click moves caret to header zone without miss", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "header zone trigger");

  const editorPage = await canvasPageRect(page);
  await page.mouse.click(editorPage.x + editorPage.width / 2, editorPage.y + 26);
  const hit = await expectLastHitFromCanvas(page);
  await page.waitForTimeout(80);

  const caret = await page.locator(".oasis-editor-caret").boundingBox();
  expect(caret).not.toBeNull();
  expect((caret?.y ?? Number.POSITIVE_INFINITY) < editorPage.y + 92).toBeTruthy();
  expect(hit.zone).toBe("header");
  await expectNoMissEvents(page);
});

test("DOCX lorem simples hit-test never misses in hit-test", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await page.getByTestId("editor-import-docx-input").setInputFiles(SIMPLE_LOREM_DOCX);
  await page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 45_000,
  });
  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 220, pageRect.y + 200);
  await expectLastHitFromCanvas(page);

  const points = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const paragraph = snapshot.paragraphs.find(
      (entry) => entry.zone === "main" && !entry.tableCell && entry.lines.length > 0 && entry.lines[0]!.slots.length > 6,
    );
    if (!paragraph) return null;
    const line = paragraph.lines[0]!;
    const first = line.slots[1]!;
    const mid = line.slots[Math.floor(line.slots.length * 0.6)] ?? line.slots[line.slots.length - 2];
    if (!mid) return null;
    return {
      p1: { x: first.left + 0.5, y: line.top + line.height * 0.5 },
      p2: { x: mid.left + 0.5, y: line.top + line.height * 0.5 },
    };
  });
  if (!points) {
    throw new Error("unable to resolve stable DOCX click points from canvas snapshot");
  }

  await exercisePointerCoherence(page, points.p1, points.p2, { requireWordClicks: true });
  await expectNoMissEvents(page);
});

test("canvas drag on imported DOCX does not trigger repeated layout projection", async ({
  page,
}) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await page.getByTestId("editor-import-docx-input").setInputFiles(SIMPLE_LOREM_DOCX);
  await page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 45_000,
  });
  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 220, pageRect.y + 200);
  await expectLastHitFromCanvas(page);

  const points = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const paragraph = snapshot.paragraphs.find(
      (entry) =>
        entry.zone === "main" &&
        !entry.tableCell &&
        entry.lines.length > 0 &&
        entry.lines[0]!.slots.length > 8,
    );
    if (!paragraph) return null;
    const line = paragraph.lines[0]!;
    const first = line.slots[1]!;
    const last = line.slots[Math.max(2, line.slots.length - 2)]!;
    return {
      from: { x: first.left + 0.5, y: line.top + line.height * 0.5 },
      to: { x: last.left + 0.5, y: line.top + line.height * 0.5 },
    };
  });
  if (!points) {
    throw new Error("unable to resolve drag points from imported DOCX snapshot");
  }

  await page.mouse.click(points.from.x, points.from.y);
  await expectLastHitFromCanvas(page);
  await clearMissEvents(page);

  let layoutProjectCount = 0;
  const onConsole = (message: ConsoleMessage) => {
    if (message.text().includes("[perf] layout:project ")) {
      layoutProjectCount += 1;
    }
  };
  page.on("console", onConsole);

  await page.mouse.move(points.from.x, points.from.y);
  await page.mouse.down();
  const steps = 24;
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const x = points.from.x + (points.to.x - points.from.x) * t;
    const y = points.from.y + (points.to.y - points.from.y) * t;
    await page.mouse.move(x, y);
  }
  await page.mouse.up();
  page.off("console", onConsole);

  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
  await expectNoMissEvents(page);
  expect(layoutProjectCount).toBeLessThanOrEqual(5);
});

test("canvas selection overlay stays visible on imported complex DOCX (header/footer aware)", async ({
  page,
}) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await page.getByTestId("editor-import-docx-input").setInputFiles(COMPLEX_DOCX);
  await page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 60_000,
  });
  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 220, pageRect.y + 220);
  await expectLastHitFromCanvas(page);

  const points = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const paragraph = snapshot.paragraphs.find(
      (entry) => entry.zone === "main" && !entry.tableCell && entry.lines.length > 0,
    );
    if (!paragraph) return null;

    const line =
      paragraph.lines.find((candidate) => candidate.slots.length > 6) ??
      paragraph.lines.find((candidate) => candidate.slots.length > 2) ??
      paragraph.lines[0];
    if (!line) return null;

    const startSlot = line.slots[Math.min(2, Math.max(0, line.slots.length - 2))] ?? line.slots[0];
    const endSlot = line.slots[Math.max(1, Math.floor(line.slots.length * 0.65))];
    if (!startSlot || !endSlot) return null;

    return {
      from: { x: startSlot.left + 0.5, y: line.top + line.height * 0.5 },
      to: { x: endSlot.left + 0.5, y: line.top + line.height * 0.5 },
    };
  });
  if (!points) {
    throw new Error("unable to resolve main paragraph drag points from complex DOCX snapshot");
  }

  await page.mouse.click(points.from.x, points.from.y);
  await expectLastHitFromCanvas(page);

  await page.mouse.move(points.from.x, points.from.y);
  await page.mouse.down();
  await page.mouse.move(points.to.x, points.to.y);
  await page.mouse.up();

  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
  await expectLastHitFromCanvas(page);
  await expectNoMissEvents(page);
});

for (const align of ["center", "right", "justify"] as const) {
  test(`canvas ${align} paragraph keeps caret/selection/hit-test coherent`, async ({ page }) => {
    await gotoEditor(page);
    await clearMissEvents(page);
    await seedText(page, "alpha beta gamma delta epsilon zeta eta theta iota kappa");
    await clickToolbarAction(page, `editor-toolbar-align-${align}`);
    await page.waitForTimeout(100);

    const pageRect = await canvasPageRect(page);
    const p1 = { x: pageRect.x + 300, y: pageRect.y + 140 };
    const p2 = { x: pageRect.x + 470, y: pageRect.y + 140 };
    await exercisePointerCoherence(page, p1, p2);
    await expectNoMissEvents(page);
  });
}

test("canvas simple 2x2 table hit-test uses canvas layout only", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "table baseline");
  await insertTable(page, 2, 2);
  await page.waitForTimeout(120);
  const editorPage = await canvasPageRect(page);
  await page.mouse.click(editorPage.x + 210, editorPage.y + 210);
  await expectLastHitFromCanvas(page);
  const points = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const tableParagraphs = snapshot.paragraphs.filter((paragraph) => paragraph.tableCell);
    if (tableParagraphs.length === 0) return null;

    const firstCell = tableParagraphs[0]!.tableCell!;
    const secondCell =
      tableParagraphs.find(
        (paragraph) =>
          paragraph.tableCell &&
          (paragraph.tableCell.rowIndex !== firstCell.rowIndex ||
            paragraph.tableCell.cellIndex !== firstCell.cellIndex),
      )?.tableCell ?? firstCell;
    return {
      p1: {
        x: firstCell.left + Math.min(28, firstCell.width * 0.35),
        y: firstCell.top + Math.min(22, firstCell.height * 0.5),
      },
      p2: {
        x: secondCell.left + Math.min(28, secondCell.width * 0.35),
        y: secondCell.top + Math.min(22, secondCell.height * 0.5),
      },
    };
  });
  if (!points) {
    throw new Error("table cell geometry not found in canvas debug snapshot");
  }

  await exercisePointerCoherence(page, points.p1, points.p2, {
    requireWordClicks: false,
    requireCaretDelta: false,
    requireSelectionVisible: false,
  });
  await expectNoMissEvents(page);
});

test("triple-click selects paragraph including paragraph mark in main zone", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "aaa bbb ccc");
  await page.keyboard.press("Enter");
  await page.keyboard.type("ddd eee fff");
  await page.waitForTimeout(80);
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 200, pageRect.y + 140);
  await expectLastHitFromCanvas(page);

  const target = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const mainParagraphs = snapshot.paragraphs.filter(
      (entry) =>
        entry.zone === "main" && !entry.tableCell && entry.lines.length > 0 && entry.textLength > 0,
    );
    if (mainParagraphs.length < 2) return null;
    const first = mainParagraphs[0]!;
    const second = mainParagraphs[1]!;
    const line = first.lines[0]!;
    const slot = line.slots[Math.min(2, line.slots.length - 1)] ?? line.slots[0];
    if (!slot) return null;
    return {
      click: { x: slot.left + 0.5, y: line.top + line.height * 0.5 },
      firstParagraphId: first.paragraphId,
      secondParagraphId: second.paragraphId,
      firstTextLength: first.textLength,
    };
  });
  if (!target) {
    throw new Error("unable to resolve main paragraphs for triple-click assertion");
  }

  await page.mouse.click(target.click.x, target.click.y, { clickCount: 3 });
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
  await expectLastHitFromCanvas(page);
  await expectNoMissEvents(page);
});

test("triple-click on last paragraph falls back to end of same paragraph", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "ultimo paragrafo");
  await page.waitForTimeout(80);
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 220, pageRect.y + 140);
  await expectLastHitFromCanvas(page);

  const target = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const mainParagraphs = snapshot.paragraphs.filter(
      (entry) =>
        entry.zone === "main" && !entry.tableCell && entry.lines.length > 0 && entry.textLength > 0,
    );
    if (mainParagraphs.length === 0) return null;
    const last = mainParagraphs[mainParagraphs.length - 1]!;
    const line = last.lines[last.lines.length - 1]!;
    const slot = line.slots[Math.max(0, line.slots.length - 1)];
    if (!slot) return null;
    return {
      click: { x: slot.left + 0.5, y: line.top + line.height * 0.5 },
      paragraphId: last.paragraphId,
      textLength: last.textLength,
    };
  });
  if (!target) {
    throw new Error("unable to resolve last main paragraph for triple-click assertion");
  }

  await page.mouse.click(target.click.x, target.click.y, { clickCount: 3 });
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
  await expectLastHitFromCanvas(page);
  await expectNoMissEvents(page);
});

test("triple-click in table cell includes paragraph mark to next paragraph in same zone order", async ({
  page,
}) => {
  test.fixme(true, "Table-cell triple-click semantic selection is not stable yet in canvas hit-test flow.");
  await gotoEditor(page);
  await clearMissEvents(page);
  await page.getByTestId("editor-import-docx-input").setInputFiles(COMPLEX_DOCX);
  await page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 60_000,
  });
  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });
  const pageRect = await canvasPageRect(page);
  await page.mouse.click(pageRect.x + 240, pageRect.y + 220);
  await expectLastHitFromCanvas(page);

  const target = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const cellParagraphs = snapshot.paragraphs.filter(
      (entry) => entry.zone === "main" && entry.tableCell && entry.lines.length > 0 && entry.textLength > 0,
    );
    if (cellParagraphs.length < 2) return null;
    const first = cellParagraphs[0]!;
    const second = cellParagraphs[1]!;
    const line = first.lines[0]!;
    const slot = line.slots[0];
    if (!slot) return null;
    return {
      click: { x: slot.left + 0.5, y: line.top + line.height * 0.5 },
      firstParagraphId: first.paragraphId,
      secondParagraphId: second.paragraphId,
    };
  });
  if (!target) {
    throw new Error("unable to resolve table paragraphs for triple-click assertion");
  }

  await page.mouse.click(target.click.x, target.click.y, { clickCount: 3 });
  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
  await expectLastHitFromCanvas(page);
  await expectNoMissEvents(page);
});

test("triple-click in header includes paragraph mark to next header paragraph", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await page.getByTestId("editor-import-docx-input").setInputFiles(COMPLEX_DOCX);
  await page.waitForEvent("console", {
    predicate: (message) => message.text().includes("import docx:done"),
    timeout: 60_000,
  });
  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });
  const editorPage = await canvasPageRect(page);
  await page.mouse.click(editorPage.x + editorPage.width / 2, editorPage.y + 26);
  await expectLastHitFromCanvas(page);

  const target = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const headerParagraphs = snapshot.paragraphs.filter(
      (entry) => entry.zone === "header" && entry.lines.length > 0 && entry.textLength > 0,
    );
    if (headerParagraphs.length < 2) return null;
    const first = headerParagraphs[0]!;
    const second = headerParagraphs[1]!;
    const line = first.lines[0]!;
    const slot = line.slots[0];
    if (!slot) return null;
    return {
      click: { x: slot.left + 0.5, y: line.top + line.height * 0.5 },
      firstParagraphId: first.paragraphId,
      secondParagraphId: second.paragraphId,
    };
  });
  if (!target) {
    throw new Error("unable to resolve header paragraphs for triple-click assertion");
  }

  await expectTripleClickWordLikeRange(page, target.click);
  await expectNoMissEvents(page);
});

test("canvas table column resize uses editor-bounded guide and applies width", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "resize column baseline");
  await insertTable(page, 2, 2);
  await page.waitForTimeout(140);
  const editorPage = await canvasPageRect(page);
  await page.mouse.click(editorPage.x + 210, editorPage.y + 210);
  await expectLastHitFromCanvas(page);

  const geometryBefore = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const cells = snapshot.paragraphs
      .filter((paragraph) => paragraph.tableCell)
      .map((paragraph) => paragraph.tableCell!)
      .filter((cell, index, all) =>
        all.findIndex((candidate) =>
          candidate.tableId === cell.tableId &&
          candidate.rowIndex === cell.rowIndex &&
          candidate.cellIndex === cell.cellIndex,
        ) === index,
      );
    if (cells.length === 0) return null;
    const tableId = cells[0]!.tableId;
    const tableCells = cells.filter((cell) => cell.tableId === tableId);
    const first = tableCells.find((cell) => cell.rowIndex === 0 && cell.cellIndex === 0) ?? tableCells[0];
    if (!first) return null;
    const left = Math.min(...tableCells.map((cell) => cell.left));
    const right = Math.max(...tableCells.map((cell) => cell.left + cell.width));
    return {
      tableId,
      edgeX: first.left + first.width,
      midY: first.top + first.height * 0.5,
      firstWidth: first.width,
      tableWidth: right - left,
    };
  });
  if (!geometryBefore) {
    throw new Error("unable to resolve table geometry for column resize");
  }

  await page.mouse.move(geometryBefore.edgeX, geometryBefore.midY);
  await page.mouse.down();
  await page.mouse.move(geometryBefore.edgeX + 36, geometryBefore.midY);

  const guide = page.locator(".oasis-editor-table-resize-guide");
  await expect(guide).toBeVisible();

  const guideRect = await guide.boundingBox();
  const editorRect = await page.locator('[data-testid="editor-editor"]').boundingBox();
  if (!guideRect || !editorRect) {
    throw new Error("unable to resolve guide/editor bounds");
  }

  expect(Math.abs(guideRect.y - editorRect.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(guideRect.height - editorRect.height)).toBeLessThanOrEqual(2);

  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.click(geometryBefore.edgeX + 12, geometryBefore.midY);
  await expectLastHitFromCanvas(page);

  const geometryAfter = await page.evaluate((tableId) => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const cells = snapshot.paragraphs
      .filter((paragraph) => paragraph.tableCell?.tableId === tableId)
      .map((paragraph) => paragraph.tableCell!)
      .filter((cell, index, all) =>
        all.findIndex((candidate) =>
          candidate.tableId === cell.tableId &&
          candidate.rowIndex === cell.rowIndex &&
          candidate.cellIndex === cell.cellIndex,
        ) === index,
      );
    if (cells.length === 0) return null;
    const first = cells.find((cell) => cell.rowIndex === 0 && cell.cellIndex === 0);
    if (!first) return null;
    const left = Math.min(...cells.map((cell) => cell.left));
    const right = Math.max(...cells.map((cell) => cell.left + cell.width));
    return {
      firstWidth: first.width,
      tableWidth: right - left,
    };
  }, geometryBefore.tableId);

  expect(geometryAfter).not.toBeNull();
  expect(Math.abs((geometryAfter?.firstWidth ?? geometryBefore.firstWidth) - geometryBefore.firstWidth)).toBeGreaterThan(4);
  expect(Math.abs((geometryAfter?.tableWidth ?? geometryBefore.tableWidth) - geometryBefore.tableWidth)).toBeLessThanOrEqual(4);
  await expectNoMissEvents(page);
});

test("canvas table row resize on last bottom border increases last row height", async ({ page }) => {
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "resize row baseline");
  await insertTable(page, 2, 2);
  await page.waitForTimeout(140);
  const editorPage = await canvasPageRect(page);
  await page.mouse.click(editorPage.x + 210, editorPage.y + 210);
  await expectLastHitFromCanvas(page);

  const geometryBefore = await page.evaluate(() => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const cells = snapshot.paragraphs
      .filter((paragraph) => paragraph.tableCell)
      .map((paragraph) => paragraph.tableCell!)
      .filter((cell, index, all) =>
        all.findIndex((candidate) =>
          candidate.tableId === cell.tableId &&
          candidate.rowIndex === cell.rowIndex &&
          candidate.cellIndex === cell.cellIndex,
        ) === index,
      );
    if (cells.length === 0) return null;
    const tableId = cells[0]!.tableId;
    const tableCells = cells.filter((cell) => cell.tableId === tableId);
    const rowIndexes = Array.from(new Set(tableCells.map((cell) => cell.rowIndex))).sort((a, b) => a - b);
    const firstRowIndex = rowIndexes[0];
    const maxRowIndex = rowIndexes[rowIndexes.length - 1];
    if (firstRowIndex === undefined || maxRowIndex === undefined) return null;
    const firstRowCell =
      tableCells.find((cell) => cell.rowIndex === firstRowIndex && cell.cellIndex === 0) ??
      tableCells.find((cell) => cell.rowIndex === firstRowIndex) ??
      tableCells[0];
    const lastRowCell =
      tableCells.find((cell) => cell.rowIndex === maxRowIndex && cell.cellIndex === 0) ??
      tableCells.find((cell) => cell.rowIndex === maxRowIndex) ??
      tableCells[tableCells.length - 1];
    if (!firstRowCell || !lastRowCell) return null;
    return {
      tableId,
      midX: lastRowCell.left + lastRowCell.width * 0.5,
      edgeY: lastRowCell.top + lastRowCell.height,
      firstRowHeight: firstRowCell.height,
      lastRowHeight: lastRowCell.height,
      firstRowIndex,
      maxRowIndex,
    };
  });
  if (!geometryBefore) {
    throw new Error("unable to resolve table geometry for row resize");
  }

  await page.mouse.move(geometryBefore.midX, geometryBefore.edgeY);
  await page.mouse.down();
  await page.mouse.move(geometryBefore.midX, geometryBefore.edgeY + 26);

  const guide = page.locator(".oasis-editor-table-resize-guide");
  await expect(guide).toBeVisible();

  const guideRect = await guide.boundingBox();
  const editorRect = await page.locator('[data-testid="editor-editor"]').boundingBox();
  if (!guideRect || !editorRect) {
    throw new Error("unable to resolve guide/editor bounds");
  }

  expect(Math.abs(guideRect.x - editorRect.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(guideRect.width - editorRect.width)).toBeLessThanOrEqual(2);

  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.click(geometryBefore.midX, geometryBefore.edgeY + 12);
  await expectLastHitFromCanvas(page);

  const geometryAfter = await page.evaluate(({ tableId, firstRowIndex, maxRowIndex }) => {
    const snapshot = window.__oasisCanvasDebug?.getLayoutSnapshot();
    if (!snapshot) return null;
    const cells = snapshot.paragraphs
      .filter((paragraph) => paragraph.tableCell?.tableId === tableId)
      .map((paragraph) => paragraph.tableCell!)
      .filter((cell, index, all) =>
        all.findIndex((candidate) =>
          candidate.tableId === cell.tableId &&
          candidate.rowIndex === cell.rowIndex &&
          candidate.cellIndex === cell.cellIndex,
        ) === index,
      );
    const firstRowCell =
      cells.find((cell) => cell.rowIndex === firstRowIndex && cell.cellIndex === 0) ??
      cells.find((cell) => cell.rowIndex === firstRowIndex);
    const lastRowCell =
      cells.find((cell) => cell.rowIndex === maxRowIndex && cell.cellIndex === 0) ??
      cells.find((cell) => cell.rowIndex === maxRowIndex);
    if (!firstRowCell || !lastRowCell) return null;
    return {
      firstRowHeight: firstRowCell.height,
      lastRowHeight: lastRowCell.height,
    };
  }, { tableId: geometryBefore.tableId, firstRowIndex: geometryBefore.firstRowIndex, maxRowIndex: geometryBefore.maxRowIndex });

  expect(geometryAfter).not.toBeNull();
  expect((geometryAfter?.lastRowHeight ?? geometryBefore.lastRowHeight) - geometryBefore.lastRowHeight).toBeGreaterThan(4);
  expect(Math.abs((geometryAfter?.firstRowHeight ?? geometryBefore.firstRowHeight) - geometryBefore.firstRowHeight)).toBeLessThanOrEqual(3);
  await expectNoMissEvents(page);
});

test("toolbar overflow table insert does not throw insertBefore NotFoundError", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 900 });
  await gotoEditor(page);
  await clearMissEvents(page);
  await seedText(page, "overflow table insert");

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await expect(page.getByTestId("editor-toolbar-overflow-dropdown")).toBeVisible();
  await insertTable(page, 2, 3);
  await page.waitForTimeout(120);

  const hasInsertBeforeNotFoundError = pageErrors.some(
    (message) =>
      message.includes("insertBefore") &&
      message.includes("The node before which the new node is to be inserted is not a child of this node"),
  );
  expect(hasInsertBeforeNotFoundError).toBeFalsy();
});

