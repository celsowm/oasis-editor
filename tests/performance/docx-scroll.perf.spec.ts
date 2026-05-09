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

  const clickTarget = await page.evaluate(() => {
    const chars = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="editor-surface"] [data-testid="editor-block"][data-paragraph-id] [data-char-index]',
      ),
    );

    for (const char of chars) {
      const paragraph = char.closest<HTMLElement>("[data-paragraph-id]");
      if (!paragraph) {
        continue;
      }
      const rect = char.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      const topElement = document.elementFromPoint(x, y);
      if (topElement instanceof HTMLElement && char.contains(topElement)) {
        return {
          x,
          y,
          paragraphId: paragraph.dataset.paragraphId ?? "",
          charIndex: char.dataset.charIndex ?? "",
        };
      }
    }

    return null;
  });
  expect(clickTarget).not.toBeNull();

  consoleEntries.length = 0;
  await resetLongTasks(page);

  const eventDurations: Array<{ detail: number; durationMs: number }> = [];
  for (const detail of [1, 2, 3]) {
    eventDurations.push(
      await page.evaluate(
        ({ target, detail }) => {
          const char = document.querySelector<HTMLElement>(
            `[data-paragraph-id="${target.paragraphId}"] [data-char-index="${target.charIndex}"]`,
          );
          if (!char) {
            throw new Error("triple-click target char not found");
          }

          const dispatchMouse = (type: string) => {
            char.dispatchEvent(
              new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: target.x,
                clientY: target.y,
                detail,
                button: 0,
                buttons: type === "mouseup" || type === "click" ? 0 : 1,
                view: window,
              }),
            );
          };

          const eventStartedAt = performance.now();
          dispatchMouse("mousedown");
          dispatchMouse("mouseup");
          dispatchMouse("click");
          if (detail === 2) {
            dispatchMouse("dblclick");
          }
          return {
            detail,
            durationMs: performance.now() - eventStartedAt,
          };
        },
        { target: clickTarget!, detail },
      ),
    );
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
