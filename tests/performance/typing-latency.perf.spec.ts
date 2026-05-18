import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { resolve } from "node:path";

const COMPLEX_DOCX = resolve("documento_complexo.docx");

type ConsoleEntry = {
  type: string;
  text: string;
};

function isImportDoneMessage(message: ConsoleMessage): boolean {
  return message.text().includes("import docx:done");
}

function extractLayoutDurations(entries: ConsoleEntry[]): number[] {
  return entries
    .filter((entry) => entry.text.includes("layout:deferred sync complete") || entry.text.includes("layout:sync complete"))
    .map((entry) => {
      const match = entry.text.match(/"durationMs":([0-9.]+)/);
      return match ? Number(match[1]) : Number.NaN;
    })
    .filter(Number.isFinite);
}

async function importComplexDocx(page: Page) {
  await page.goto("/oasis-editor/");

  const importDone = page.waitForEvent("console", {
    predicate: isImportDoneMessage,
    timeout: 45_000,
  });
  await page.getByTestId("editor-import-docx-input").setInputFiles(COMPLEX_DOCX);
  await importDone;

  await expect
    .poll(async () => page.getByTestId("editor-page").count())
    .toBeGreaterThan(1);

  await page.getByTestId("editor-import-overlay").waitFor({ state: "detached" });
  await page.waitForTimeout(250);
}

async function resolveCanvasClickPoint(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const debugApi = (window as typeof window & {
      __oasisCanvasDebug?: { getLayoutSnapshot?: () => any };
    }).__oasisCanvasDebug;
    const snapshot = debugApi?.getLayoutSnapshot?.();
    const paragraph = snapshot?.paragraphs?.find((entry: any) => entry.lines?.length > 0);
    const firstLine = paragraph?.lines?.[0];
    const firstSlot = firstLine?.slots?.[0];
    if (firstSlot && Number.isFinite(firstSlot.left) && Number.isFinite(firstSlot.top)) {
      return {
        x: Math.round(firstSlot.left + 2),
        y: Math.round(firstSlot.top + Math.max(3, Math.min(10, (firstSlot.height ?? 12) / 2))),
      };
    }
    const pageEl = document.querySelector<HTMLElement>('[data-testid="editor-page"]');
    if (!pageEl) {
      return null;
    }
    const rect = pageEl.getBoundingClientRect();
    return {
      x: Math.round(rect.left + Math.min(80, rect.width * 0.2)),
      y: Math.round(rect.top + Math.min(120, rect.height * 0.2)),
    };
  });
}

/**
 * Baseline test: typing latency after importing a complex DOCX.
 *
 * This test is designed to FAIL with the current performance characteristics,
 * establishing a measurable baseline for the backspace + typing latency the user
 * reported. The thresholds below represent ideal targets — they should be adjusted
 * once optimizations are in place.
 */
test("typing latency after DOCX import — baseline", async ({ page }) => {
  const consoleEntries: ConsoleEntry[] = [];
  page.on("console", (message) => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });

  await importComplexDocx(page);

  // Wait for layout to stabilize
  await page.waitForTimeout(1000);
  consoleEntries.length = 0;

  const firstTextChar = await resolveCanvasClickPoint(page);
  expect(firstTextChar).not.toBeNull();

  // Click to focus
  await page.mouse.click(firstTextChar!.x, firstTextChar!.y);
  await page.waitForTimeout(200);
  consoleEntries.length = 0;

  // Type 20 characters and measure
  const typingResults = await page.evaluate(async (count: number) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="editor-textarea"]',
    );
    if (!textarea) {
      throw new Error("textarea not found");
    }
    textarea.focus();

    const durations: number[] = [];
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
      );
      textarea.dispatchEvent(
        new InputEvent("input", {
          inputType: "insertText",
          data: "a",
          bubbles: true,
          cancelable: true,
        }),
      );
      // Allow Solid.js reactive cycle + layout to complete
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))));
      durations.push(performance.now() - start);
    }
    return durations;
  }, 20);

  await page.waitForTimeout(500);

  const typingLayoutDurations = extractLayoutDurations(consoleEntries);
  const maxTypingLatency = typingResults.length > 0 ? Math.max(...typingResults) : 0;
  const avgTypingLatency =
    typingResults.length > 0
      ? typingResults.reduce((a, b) => a + b, 0) / typingResults.length
      : 0;

  // eslint-disable-next-line no-console
  console.log(`[perf baseline] typing: max=${maxTypingLatency.toFixed(1)}ms avg=${avgTypingLatency.toFixed(1)}ms samples=${typingResults.length}`);
  // eslint-disable-next-line no-console
  console.log(`[perf baseline] layout sync samples: ${typingLayoutDurations.length}`);

  if (typingLayoutDurations.length > 0) {
    const maxLayoutSync = Math.max(...typingLayoutDurations);
    const avgLayoutSync = typingLayoutDurations.reduce((a, b) => a + b, 0) / typingLayoutDurations.length;
    // eslint-disable-next-line no-console
    console.log(`[perf baseline] layout sync: max=${maxLayoutSync.toFixed(1)}ms avg=${avgLayoutSync.toFixed(1)}ms`);
  }

  // ASSERTIONS — these are TARGETS that will fail initially, proving the problem
  // After optimization, thresholds can be tightened.
  expect(maxTypingLatency).toBeLessThan(50); // target: < 50ms per keystroke
  expect(avgTypingLatency).toBeLessThan(25); // target: < 25ms average
});

/**
 * Backspace latency test — simulates the specific complaint:
 * "lerdeza ao tentar dar um backspace"
 */
test("backspace latency after DOCX import — baseline", async ({ page }) => {
  const consoleEntries: ConsoleEntry[] = [];
  page.on("console", (message) => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });

  await importComplexDocx(page);
  await page.waitForTimeout(1000);
  consoleEntries.length = 0;

  const firstTextChar = await resolveCanvasClickPoint(page);
  expect(firstTextChar).not.toBeNull();

  await page.mouse.click(firstTextChar!.x, firstTextChar!.y);
  await page.waitForTimeout(200);
  consoleEntries.length = 0;

  // Press Backspace 15 times
  const backspaceResults = await page.evaluate(async (count: number) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="editor-textarea"]',
    );
    if (!textarea) {
      throw new Error("textarea not found");
    }
    textarea.focus();

    const durations: number[] = [];
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }),
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))));
      durations.push(performance.now() - start);
    }
    return durations;
  }, 15);

  await page.waitForTimeout(500);

  const backspaceLayoutDurations = extractLayoutDurations(consoleEntries);
  const maxBackspaceLatency = backspaceResults.length > 0 ? Math.max(...backspaceResults) : 0;
  const avgBackspaceLatency =
    backspaceResults.length > 0
      ? backspaceResults.reduce((a, b) => a + b, 0) / backspaceResults.length
      : 0;

  // eslint-disable-next-line no-console
  console.log(`[perf baseline] backspace: max=${maxBackspaceLatency.toFixed(1)}ms avg=${avgBackspaceLatency.toFixed(1)}ms samples=${backspaceResults.length}`);

  if (backspaceLayoutDurations.length > 0) {
    const maxLayoutSync = Math.max(...backspaceLayoutDurations);
    // eslint-disable-next-line no-console
    console.log(`[perf baseline] backspace layout sync max: ${maxLayoutSync.toFixed(1)}ms`);
  }

  // ASSERTIONS — TARGETS for backspace
  expect(maxBackspaceLatency).toBeLessThan(50); // target: < 50ms per backspace
  expect(avgBackspaceLatency).toBeLessThan(25); // target: < 25ms average
});
