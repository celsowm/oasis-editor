import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });

async function gotoEditor(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("oasis.welcomeSeen", "1");
  });
  await page.goto("/oasis-editor/index.html", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
  ).toBeVisible({ timeout: 60_000 });
}

async function editorOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector(
      ".oasis-editor-editor",
    ) as HTMLElement | null;
    if (!el) return null;
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: el.scrollWidth - el.clientWidth,
    };
  });
}

test("editor chrome spans the stage while the page remains centered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await gotoEditor(page);

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector(".oasis-editor-stage") as HTMLElement;
    const shell = document.querySelector(
      ".oasis-editor-editor-shell",
    ) as HTMLElement;
    const editor = document.querySelector(
      ".oasis-editor-editor",
    ) as HTMLElement;
    const ruler = document.querySelector(
      ".oasis-editor-horizontal-ruler",
    ) as HTMLElement;
    const statusbar = document.querySelector(
      ".oasis-editor-statusbar",
    ) as HTMLElement;
    const paper = document.querySelector(".oasis-editor-paper") as HTMLElement;
    const stageStyle = getComputedStyle(stage);
    const stageRect = stage.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const rulerRect = ruler.getBoundingClientRect();
    const statusbarRect = statusbar.getBoundingClientRect();
    const paperRect = paper.getBoundingClientRect();
    const paddingLeft = Number.parseFloat(stageStyle.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(stageStyle.paddingRight) || 0;

    return {
      availableStageWidth: stage.clientWidth - paddingLeft - paddingRight,
      expectedShellLeft: stageRect.left + paddingLeft,
      shell: {
        left: shellRect.left,
        right: shellRect.right,
        width: shellRect.width,
      },
      editor: { left: editorRect.left, right: editorRect.right },
      ruler: { left: rulerRect.left, right: rulerRect.right },
      statusbar: { left: statusbarRect.left, right: statusbarRect.right },
      paperWidth: paperRect.width,
      paperCenter: paperRect.left + paperRect.width / 2,
      editorClientCenter:
        editorRect.left + editor.clientLeft + editor.clientWidth / 2,
    };
  });

  expect(geometry.shell.width).toBeCloseTo(geometry.availableStageWidth, 0);
  expect(geometry.shell.left).toBeCloseTo(geometry.expectedShellLeft, 0);
  expect(geometry.shell.width - geometry.paperWidth).toBeGreaterThan(300);
  expect(geometry.ruler.left).toBeCloseTo(geometry.shell.left, 0);
  expect(geometry.ruler.right).toBeCloseTo(geometry.shell.right, 0);
  expect(geometry.editor.left).toBeCloseTo(geometry.shell.left, 0);
  expect(geometry.editor.right).toBeCloseTo(geometry.shell.right, 0);
  expect(geometry.statusbar.left).toBeCloseTo(geometry.shell.left, 0);
  expect(geometry.statusbar.right).toBeCloseTo(geometry.shell.right, 0);
  expect(geometry.paperCenter).toBeCloseTo(geometry.editorClientCenter, 0);
});

test("landscape keeps the full-width shell without unnecessary overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await gotoEditor(page);

  // A single page is taller than the editor viewport, so the vertical scrollbar
  // is already present — no text seeding needed.
  const portrait = await editorOverflow(page);
  expect(portrait).not.toBeNull();
  expect(portrait!.overflowX).toBeLessThanOrEqual(1);

  // Switch to landscape via Layout ribbon tab -> Page setup -> Landscape.
  await page.getByTestId("editor-ribbon-tab-layout").click();
  await page.getByTestId("editor-toolbar-section-dropdown").click();
  await page.getByTestId("editor-toolbar-orientation-landscape").click();
  await page.waitForTimeout(200);

  const landscape = await editorOverflow(page);
  expect(landscape).not.toBeNull();
  // Chrome remains attached to the stage rather than changing with page size.
  expect(landscape!.clientWidth).toBeCloseTo(portrait!.clientWidth, 0);
  // The available 16:9 stage still fits a landscape page without horizontal
  // scrolling (allow 1px for sub-pixel rounding).
  expect(landscape!.overflowX).toBeLessThanOrEqual(1);
});

test("high zoom preserves reachable horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await gotoEditor(page);

  const before = await editorOverflow(page);
  expect(before).not.toBeNull();

  const slider = page
    .getByTestId("editor-statusbar-zoom-control")
    .locator('input[type="range"]');
  await slider.focus();
  await slider.press("End");
  await expect(page.getByTestId("editor-statusbar-zoom")).toHaveText("200%");

  const after = await page.evaluate(() => {
    const editor = document.querySelector(
      ".oasis-editor-editor",
    ) as HTMLElement;
    editor.scrollLeft = editor.scrollWidth;
    return {
      scrollLeft: editor.scrollLeft,
      reachableRight: editor.scrollLeft + editor.clientWidth,
      scrollWidth: editor.scrollWidth,
      overflowX: editor.scrollWidth - editor.clientWidth,
    };
  });

  expect(after.overflowX).toBeGreaterThan(before!.overflowX + 100);
  expect(after.scrollLeft).toBeGreaterThan(0);
  // The stable vertical-scrollbar gutter reserves 10px at the right edge.
  expect(after.scrollWidth - after.reachableRight).toBeLessThanOrEqual(10);
});

test("layout ribbon renders margins and orientation as full-height buttons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await gotoEditor(page);

  await page.getByTestId("editor-ribbon-tab-layout").click();

  const normalBox = await page
    .getByTestId("editor-toolbar-metrics-dropdown")
    .boundingBox();
  const marginsBox = await page
    .getByTestId("editor-toolbar-margins-dropdown")
    .boundingBox();
  const orientationBox = await page
    .getByTestId("editor-toolbar-section-dropdown")
    .boundingBox();

  expect(normalBox).not.toBeNull();
  expect(marginsBox).not.toBeNull();
  expect(orientationBox).not.toBeNull();
  expect(marginsBox!.height).toBeGreaterThan(normalBox!.height + 20);
  expect(orientationBox!.height).toBeGreaterThan(normalBox!.height + 20);

  await page.getByTestId("editor-toolbar-margins-dropdown").click();
  await expect(page.getByTestId("editor-toolbar-margins-custom")).toBeVisible();

  await page.getByTestId("editor-toolbar-section-dropdown").click();
  await expect(
    page.getByTestId("editor-toolbar-orientation-landscape"),
  ).toBeVisible();
});

/**
 * Reads the compact style gallery once its size has settled. The panel
 * re-measures on a ResizeObserver and applies the result on the next animation
 * frame, so a single read right after a viewport change sees the previous
 * layout.
 */
async function settledGallery(page: Page): Promise<{
  ribbonWidth: number;
  stripWidth: number;
  firstCardWidth: number;
  firstCardRight: number;
  nextCardLeft: number | null;
  stripRight: number;
  chevronLeft: number;
  chevronRight: number;
  ribbonRight: number;
  chevronHeight: number;
  ribbonHeight: number;
  visibleCardSlots: number;
}> {
  const read = async (): Promise<ReturnType<typeof settledGallery>> =>
    page.evaluate(() => {
      const group = document.querySelector<HTMLElement>(
        '[data-ribbon-group="styles"]',
      );
      const ribbon = group?.querySelector<HTMLElement>(
        ".oasis-editor-style-gallery-ribbon",
      );
      const strip = group?.querySelector<HTMLElement>(
        ".oasis-editor-style-gallery-strip",
      );
      const cards = Array.from(
        group?.querySelectorAll<HTMLElement>(
          ".oasis-editor-style-gallery-strip .oasis-editor-style-gallery-card",
        ) ?? [],
      );
      const chevron = group?.querySelector<HTMLElement>(
        ".oasis-editor-style-gallery-expand",
      );
      if (!group || !ribbon || !strip || cards.length < 2 || !chevron) {
        return null;
      }
      const ribbonBox = ribbon.getBoundingClientRect();
      const stripBox = strip.getBoundingClientRect();
      const firstCardBox = cards[0]!.getBoundingClientRect();
      const chevronBox = chevron.getBoundingClientRect();
      const visibleCardSlots = Math.round(stripBox.width / firstCardBox.width);
      const nextCardBox = cards[visibleCardSlots]?.getBoundingClientRect();
      return {
        ribbonWidth: ribbonBox.width,
        stripWidth: stripBox.width,
        firstCardWidth: firstCardBox.width,
        firstCardRight: firstCardBox.right,
        nextCardLeft: nextCardBox?.left ?? null,
        stripRight: stripBox.right,
        chevronLeft: chevronBox.left,
        chevronRight: chevronBox.right,
        ribbonRight: ribbonBox.right,
        chevronHeight: chevronBox.height,
        ribbonHeight: ribbonBox.height,
        visibleCardSlots,
      };
    }) as never;

  let previous = await read();
  await expect
    .poll(async (): Promise<boolean> => {
      const next = await read();
      const stable =
        Boolean(next) &&
        Boolean(previous) &&
        next.stripWidth === previous.stripWidth;
      previous = next;
      return stable;
    })
    .toBe(true);
  return previous;
}

test("home ribbon shrinks and collapses groups as width decreases", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoEditor(page);
  await page.getByTestId("editor-ribbon-tab-home").click();

  await expect(page.locator('[data-ribbon-group="font"]')).toHaveAttribute(
    "data-ribbon-state",
    "full",
  );

  // 1500px leaves the style gallery compact but wide enough to show several
  // cards, which is where the strip geometry is actually worth checking.
  await page.setViewportSize({ width: 1500, height: 900 });
  await expect
    .poll(async () =>
      page
        .locator('[data-ribbon-group="styles"]')
        .getAttribute("data-ribbon-state"),
    )
    .toBe("compact");

  const compactGallery = await settledGallery(page);
  expect(compactGallery.visibleCardSlots).toBeGreaterThanOrEqual(2);
  // The strip is cut to whole cards, so no card is ever half-clipped.
  expect(compactGallery.stripWidth).toBeCloseTo(
    compactGallery.visibleCardSlots * 106,
    0,
  );
  expect(compactGallery.ribbonWidth).toBeCloseTo(
    compactGallery.stripWidth + 26,
    0,
  );
  expect(compactGallery.firstCardWidth).toBeCloseTo(106, 0);
  expect(compactGallery.firstCardRight).toBeLessThanOrEqual(
    compactGallery.stripRight + 1,
  );
  if (compactGallery.nextCardLeft !== null) {
    expect(compactGallery.nextCardLeft).toBeGreaterThanOrEqual(
      compactGallery.stripRight - 1,
    );
  }
  expect(compactGallery.chevronLeft).toBeCloseTo(compactGallery.stripRight, 0);
  expect(compactGallery.chevronRight).toBeCloseTo(
    compactGallery.ribbonRight - 1,
    0,
  );
  expect(compactGallery.chevronHeight).toBeCloseTo(
    compactGallery.ribbonHeight - 2,
    0,
  );

  // Phone width. The ribbon reclaims whatever a collapse frees, so groups now
  // hold on to a usable state further down than they used to: at 560px the
  // paragraph group still fits in full and the gallery still shows a card. Only
  // here is there room for nothing but icons.
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(async () =>
      page
        .locator('[data-ribbon-group="styles"]')
        .getAttribute("data-ribbon-state"),
    )
    .toBe("collapsed");
  await expect
    .poll(async () =>
      page
        .locator('[data-ribbon-group="paragraph"]')
        .getAttribute("data-ribbon-state"),
    )
    .toBe("collapsed");

  await page.getByTestId("editor-ribbon-group-styles").click();
  await expect(page.getByTestId("editor-toolbar-style-expand")).toBeVisible();
});

test("narrowing the ribbon never shows more style cards", async ({ page }) => {
  // The ribbon frees width by collapsing groups, and whatever it frees is then
  // available to the compact style gallery. Left unchecked that inverts the
  // relationship: collapsing the paragraph group recovered 165px, of which the
  // gallery spent 106px on an extra card, so 880px showed *more* styles than
  // 960px. The card count must fall — or hold — as the window narrows.
  await page.setViewportSize({ width: 1700, height: 900 });
  await gotoEditor(page);
  await page.getByTestId("editor-ribbon-tab-home").click();

  const widths = [1700, 1600, 1500, 1400, 1300, 1200, 1120, 1040, 960, 880];
  const slots: { width: number; cards: number }[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    slots.push({ width, cards: (await settledGallery(page)).visibleCardSlots });
  }

  for (let index = 1; index < slots.length; index++) {
    expect(
      slots[index]!.cards,
      `${slots[index]!.width}px shows ${slots[index]!.cards} cards, ` +
        `more than the ${slots[index - 1]!.cards} at the wider ` +
        `${slots[index - 1]!.width}px`,
    ).toBeLessThanOrEqual(slots[index - 1]!.cards);
  }
  // The sweep has to actually move, or it would pass on a gallery stuck at one
  // width.
  expect(slots[0]!.cards).toBeGreaterThan(slots[slots.length - 1]!.cards);
});
