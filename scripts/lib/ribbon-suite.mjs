/**
 * Shared harness for the `verify-ribbon-*.mjs` browser suites.
 *
 * Each suite owns its scenario logic only; everything the suites have in
 * common — environment wiring, git metadata for the evidence record, browser
 * launch, responsive-planner settling, collapsed-group interaction, fixture
 * seeding and the `verification.json` writer — lives here, once.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";

const ENGINES = { chromium, firefox, webkit };

export function suiteEnv(name) {
  const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
  const engine = process.env.RIBBON_BROWSER ?? "chromium";
  if (!ENGINES[engine]) {
    throw new Error(`Unknown RIBBON_BROWSER: ${engine}`);
  }
  return {
    base,
    engine,
    name,
    output: resolve(
      process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-${name}-${engine}`,
    ),
  };
}

export function gitInfo() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const dirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  );
  return { sha, dirty };
}

export async function createSuite(name) {
  const { base, engine, output } = suiteEnv(name);
  await mkdir(output, { recursive: true });
  const { sha, dirty } = gitInfo();
  return {
    base,
    engine,
    output,
    sha,
    dirty,
    records: [],
    browser: await ENGINES[engine].launch(),
  };
}

export async function writeVerification(output, records) {
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
}

/**
 * Measurements live in a rAF; right after a state change (fixture import,
 * read-only toggle) groups render from estimates for a frame. Wait until
 * every group reports measured widths — until then a control's box can
 * collapse or expand mid-check, which is indistinguishable from a broken
 * button but is really the responsive planner re-running.
 */
export async function waitForRibbonSettled(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-ribbon-group]")].every(
        (section) => section.getAttribute("data-ribbon-width-full") !== null,
      ),
    undefined,
    { timeout: 10000 },
  );
}

/**
 * The full ribbon and the collapsed-group popup both render the same controls.
 * Playwright's `.visible()` engine does not require a non-empty box, but the
 * click actionability check does — a full-size button inside a collapsed group
 * keeps `display:flex` at 0x0. Choose by measured bounding box instead of
 * pseudo-classes; when no copy is actionable, open the collapsed popup and
 * scope the locator to it.
 */
export async function openGroup(page, group, testId) {
  await waitForRibbonSettled(page);
  const item = page.locator(`[data-testid="${testId}"]`);
  const count = await item.count();
  if (count > 0) {
    const boxes = await Promise.all(
      [...Array(count)].map((_, index) => item.nth(index).boundingBox()),
    );
    const index = boxes.findIndex(
      (box) => box !== null && box.width > 0 && box.height > 0,
    );
    if (index >= 0) return item.nth(index);
  }
  await page.keyboard.press("Escape");
  await page.getByTestId(`editor-ribbon-group-${group}`).click();
  const popup = page.locator(".oasis-editor-ribbon-collapsed-menu");
  await popup.waitFor({ state: "visible", timeout: 5000 });
  return popup.locator(`[data-testid="${testId}"]`);
}

export async function loadFixture(page, fixture) {
  await page.evaluate(async (name) => {
    const { prepareRibbonFixture } = await import(
      "/tests/browser/ribbon/fixtures.ts"
    );
    const client = window.ribbonReference.client;
    await prepareRibbonFixture(client, name);
    client.history.clear();
  }, fixture);
}

export async function paragraphsText(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    return getDocumentParagraphs(window.ribbonReference.client.document.get())
      .map((p) => p.runs.map((run) => run.text).join(""))
      .join("\n");
  });
}

export async function placeCaretInParagraph(page, paragraphIndex, offset) {
  await page.evaluate(
    async ([index, position]) => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } =
        await import("/src/core/model.ts");
      const client = window.ribbonReference.client;
      const paragraph = getDocumentParagraphs(client.document.get())[index];
      client.selection.set({
        anchor: paragraphOffsetToPosition(paragraph, position),
        focus: paragraphOffsetToPosition(paragraph, position),
      });
    },
    [paragraphIndex, offset],
  );
}

export async function selectRangeInParagraph(page, paragraphIndex, from, to) {
  await page.evaluate(
    async ([index, start, end]) => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } =
        await import("/src/core/model.ts");
      const client = window.ribbonReference.client;
      const paragraph = getDocumentParagraphs(client.document.get())[index];
      client.selection.set({
        anchor: paragraphOffsetToPosition(paragraph, start),
        focus: paragraphOffsetToPosition(paragraph, end),
      });
    },
    [paragraphIndex, from, to],
  );
}

export async function selectedText(page) {
  return page.evaluate(async () => {
    const { getSelectedText } = await import(
      "/src/core/commands/selection.ts"
    );
    return getSelectedText(window.ribbonReference.client.getState());
  });
}

/** The shared page boot for every suite; returns the page and its error log. */
export async function openRibbonPage(browser, base, { theme, locale, width }) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`,
  );
  return { page, errors };
}

export { assert };
