import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { resolve } from "node:path";

const COMPLEX_DOCX = resolve("documento_complexo.docx");

type ConsoleEntry = {
  type: string;
  text: string;
};

type LongTaskEntry = {
  name: string;
  duration: number;
  startTime: number;
};

function isImportDoneMessage(message: ConsoleMessage): boolean {
  return message.text().includes("import docx:done");
}

function extractLayoutDurations(entries: ConsoleEntry[], reason: string): number[] {
  const reasonNeedle = `"reason":"${reason}"`;
  return entries
    .filter((entry) => entry.text.includes("layout:deferred sync complete"))
    .filter((entry) => entry.text.includes(reasonNeedle))
    .map((entry) => {
      const match = entry.text.match(/"durationMs":([0-9.]+)/);
      return match ? Number(match[1]) : Number.NaN;
    })
    .filter(Number.isFinite);
}

async function installLongTaskObserver(page: Page) {
  await page.addInitScript(() => {
    const global = window as typeof window & {
      __oasisLongTasks?: LongTaskEntry[];
      __oasisLongTaskResetAt?: number;
      __oasisResetLongTasks?: () => void;
    };
    global.__oasisLongTasks = [];
    global.__oasisLongTaskResetAt = 0;
    global.__oasisResetLongTasks = () => {
      global.__oasisLongTasks = [];
      global.__oasisLongTaskResetAt = performance.now();
    };

    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            global.__oasisLongTasks?.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        observer.observe({ type: "longtask", buffered: true });
      } catch {
        // Long Task API is not available in every browser/channel.
      }
    }
  });
}

async function resetLongTasks(page: Page) {
  await page.evaluate(() => {
    (window as typeof window & { __oasisResetLongTasks?: () => void }).__oasisResetLongTasks?.();
  });
}

async function maxLongTaskDuration(page: Page): Promise<number> {
  const longTasks = await page.evaluate(() => {
    const global = window as typeof window & {
      __oasisLongTasks?: LongTaskEntry[];
      __oasisLongTaskResetAt?: number;
    };
    const resetAt = global.__oasisLongTaskResetAt ?? 0;
    return (global.__oasisLongTasks ?? [])
      .filter((entry) => entry.startTime >= resetAt)
      .map((entry) => entry.duration);
  });
  return longTasks.length > 0 ? Math.max(...longTasks) : 0;
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

async function resolveCanvasClickTarget(
  page: Page,
): Promise<{ x: number; y: number } | null> {
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

test("scrolling imported complex DOCX does not run heavy layout work", async ({ page }) => {
  const consoleEntries: ConsoleEntry[] = [];
  page.on("console", (message) => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });

  await installLongTaskObserver(page);
  await importComplexDocx(page);

  consoleEntries.length = 0;
  await resetLongTasks(page);

  const scrollMetrics = await page.evaluate(async () => {
    const viewport = document.querySelector<HTMLElement>('[data-testid="editor-editor"]');
    if (!viewport) {
      throw new Error("editor viewport not found");
    }

    const waitForFrame = () =>
      new Promise<void>((resolveFrame) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
      );

    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const targets = [0.2, 0.45, 0.7, 0.9].map((ratio) => Math.round(maxScrollTop * ratio));
    const durations: number[] = [];

    for (const target of targets) {
      const startedAt = performance.now();
      viewport.scrollTop = target;
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      await waitForFrame();
      durations.push(performance.now() - startedAt);
    }

    return {
      durations,
      maxScrollTop,
    };
  });

  expect(scrollMetrics.maxScrollTop).toBeGreaterThan(0);
  expect(Math.max(...scrollMetrics.durations)).toBeLessThan(100);

  await page.waitForTimeout(250);

  expect(await maxLongTaskDuration(page)).toBeLessThan(120);

  const scrollLayoutDurations = extractLayoutDurations(consoleEntries, "scroll");
  expect(scrollLayoutDurations).toEqual([]);
});

test("triple-click paragraph selection after complex DOCX import stays responsive", async ({ page }) => {
  const consoleEntries: ConsoleEntry[] = [];
  page.on("console", (message) => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });

  await installLongTaskObserver(page);
  await importComplexDocx(page);
  await page.waitForTimeout(1_000);

  const clickTarget = await resolveCanvasClickTarget(page);
  expect(clickTarget).not.toBeNull();

  consoleEntries.length = 0;
  await resetLongTasks(page);

  const eventDurations: Array<{ detail: number; durationMs: number }> = [];
  for (const detail of [1, 2, 3]) {
    const startedAt = Date.now();
    await page.mouse.click(clickTarget!.x, clickTarget!.y, { clickCount: detail });
    eventDurations.push({
      detail,
      durationMs: Date.now() - startedAt,
    });
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(250);

  expect(Math.max(...eventDurations.map((entry) => entry.durationMs))).toBeLessThan(100);

  const heavyLayoutDurations = consoleEntries
    .filter((entry) => entry.text.includes("layout:deferred sync complete"))
    .map((entry) => {
      const match = entry.text.match(/"durationMs":([0-9.]+)/);
      return match ? Number(match[1]) : Number.NaN;
    })
    .filter(Number.isFinite);
  expect(heavyLayoutDurations.filter((duration) => duration >= 50)).toEqual([]);

  await expect(page.locator(".oasis-editor-selection-box").first()).toBeVisible();
});
