import { expect, test, type Page } from "@playwright/test";

/**
 * The editor surface listens for pointer events so one code path serves mouse,
 * pen and touch. Touch is the case that needed real design work: a finger
 * dragging across text means "scroll", while the same motion with a mouse means
 * "select". These specs pin that split down, plus the tap and long-press
 * gestures that replace clicking and double-clicking.
 *
 * Before this, the surface listened only for mouse events. Mobile browsers
 * synthesise those from taps with a delay and emit nothing at all during a
 * drag, so none of the assertions below could hold.
 */

const SEED_TEXT = "alpha beta gamma delta epsilon zeta";

interface Selection {
  anchorId: string;
  anchorOffset: number;
  focusId: string;
  focusOffset: number;
}

async function gotoEditor(page: Page): Promise<{ x: number; y: number }> {
  await page.addInitScript(() => {
    localStorage.setItem("oasis.welcomeSeen", "1");
  });
  await page.goto("/oasis-editor/index.html", {
    waitUntil: "domcontentloaded",
  });
  const canvas = page
    .locator('[data-testid="editor-page"][data-renderer="canvas"]')
    .first();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__oasisCanvasDebug));
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas editor page not found");
  return { x: box.x, y: box.y };
}

async function selection(page: Page): Promise<Selection> {
  const snapshot = await page.evaluate(() => {
    const value = window.__oasisCanvasDebug?.getSelection();
    if (!value) return null;
    return {
      anchorId: value.anchor.paragraphId,
      anchorOffset: value.anchor.offset,
      focusId: value.focus.paragraphId,
      focusOffset: value.focus.offset,
    };
  });
  if (!snapshot) throw new Error("no selection snapshot recorded");
  return snapshot;
}

/** Taps into the empty document and types a known line to aim at. */
async function seedText(
  page: Page,
  origin: { x: number; y: number },
): Promise<void> {
  await page.touchscreen.tap(origin.x + 120, origin.y + 140);
  await expect(page.locator("textarea.oasis-editor-input")).toBeFocused();
  await page.keyboard.type(SEED_TEXT);
  await expect
    .poll(async (): Promise<number> => (await selection(page)).anchorOffset)
    .toBe(SEED_TEXT.length);
}

/** Drives a real touch gesture, so the page sees `pointerType: "touch"`. */
async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  deltaX: number,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let step = 1; step <= 6; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from.x + (deltaX * step) / 6, y: from.y }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

test("a tap focuses the input and types where the finger landed", async ({
  page,
}) => {
  const origin = await gotoEditor(page);
  await seedText(page, origin);

  await page.touchscreen.tap(origin.x + 120, origin.y + 140);
  const before = await selection(page);
  // The tap collapsed the caret inside the seeded line, not at its end.
  expect(before.anchorOffset).toBe(before.focusOffset);
  expect(before.anchorOffset).toBeLessThan(SEED_TEXT.length);

  await page.keyboard.type("XY");
  const after = await selection(page);
  expect(after.anchorId).toBe(before.anchorId);
  expect(after.anchorOffset).toBe(before.anchorOffset + 2);
});

test("where the finger lands decides the caret offset", async ({ page }) => {
  const origin = await gotoEditor(page);
  await seedText(page, origin);

  await page.touchscreen.tap(origin.x + 90, origin.y + 140);
  const near = await selection(page);
  await page.touchscreen.tap(origin.x + 260, origin.y + 140);
  const far = await selection(page);

  // Tapping further right lands further into the line: the tap is really being
  // hit-tested, not snapped to a fixed position.
  expect(far.anchorOffset).toBeGreaterThan(near.anchorOffset);
});

test("dragging a finger across text does not select", async ({ page }) => {
  const origin = await gotoEditor(page);
  await seedText(page, origin);

  await page.touchscreen.tap(origin.x + 120, origin.y + 140);
  const before = await selection(page);
  expect(before.anchorOffset).toBe(before.focusOffset);

  // A finger that moves right away is scrolling. With mouse semantics this
  // would drag out a selection instead.
  await touchDrag(page, { x: origin.x + 120, y: origin.y + 140 }, 260);

  const after = await selection(page);
  expect(after.anchorOffset).toBe(after.focusOffset);
});

test("a long press selects the word under the finger", async ({ page }) => {
  const origin = await gotoEditor(page);
  await seedText(page, origin);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: origin.x + 120, y: origin.y + 140 }],
  });
  // Rest in place past LONG_PRESS_MS (500 ms) without moving.
  await page.waitForTimeout(900);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  const sel = await selection(page);
  expect(sel.anchorId).toBe(sel.focusId);
  // A whole word is selected, so the range is non-empty.
  expect(sel.focusOffset).toBeGreaterThan(sel.anchorOffset);
});
