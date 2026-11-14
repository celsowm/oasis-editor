#!/usr/bin/env node
/**
 * P01 Review: document-scoped Accept All / Reject All, their confirmation gate,
 * disabled states without revisions, undo, and the selection-vs-document scope
 * distinction.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-review-${engine}`,
);
await mkdir(output, { recursive: true });
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
const browser = await { chromium, firefox, webkit }[engine].launch();
const records = [];

async function waitForRibbonSettled(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-ribbon-group]")].every(
        (section) => section.getAttribute("data-ribbon-width-full") !== null,
      ),
    undefined,
    { timeout: 10000 },
  );
}

/** Unambiguous locator: full-size copy when actionable, else the collapsed popup. */
async function openGroup(page, group, testId) {
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

function acceptAllButton(page) {
  return page.locator(
    '[data-testid="editor-toolbar-accept-all-revisions"]:visible',
  );
}

function rejectAllButton(page) {
  return page.locator(
    '[data-testid="editor-toolbar-reject-all-revisions"]:visible',
  );
}

async function openReviewGroup(page) {
  const button = acceptAllButton(page);
  if (await button.isVisible()) return;
  await page.keyboard.press("Escape");
  await page.getByTestId("editor-ribbon-group-changes").click();
  await button.waitFor({ state: "visible", timeout: 5000 });
}

async function commandEnabled(page, name) {
  return page.evaluate(
    (command) =>
      window.ribbonReference.client.commands.state(command).isEnabled,
    name,
  );
}

async function loadFixture(page, fixture) {
  await page.evaluate(async (name) => {
    const { prepareRibbonFixture } =
      await import("/tests/browser/ribbon/fixtures.ts");
    const client = window.ribbonReference.client;
    await prepareRibbonFixture(client, name);
    client.history.clear();
  }, fixture);
}

async function paragraphText(page, index = 0) {
  return page.evaluate(async (i) => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    const paragraphs = getDocumentParagraphs(
      window.ribbonReference.client.document.get(),
    );
    return paragraphs[i].runs.map((run) => run.text).join("");
  }, index);
}

async function placeCaretInParagraph(page, index) {
  await page.evaluate(async (i) => {
    const { getDocumentParagraphs, paragraphOffsetToPosition } =
      await import("/src/core/model.ts");
    const client = window.ribbonReference.client;
    const paragraph = getDocumentParagraphs(client.document.get())[i];
    const offset = paragraph.runs.map((run) => run.text).join("").length;
    client.selection.set({
      anchor: paragraphOffsetToPosition(paragraph, offset),
      focus: paragraphOffsetToPosition(paragraph, offset),
    });
  }, index);
}

async function selectRangeInParagraph(page, paragraphIndex, from, to) {
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

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "dark", locale: "en", width: 1440 },
    { theme: "light", locale: "en", width: 640 },
  ];
  for (const { theme, locale, width } of configs) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`,
    );
    await waitForRibbonReference(page);
    await page.getByTestId("editor-ribbon-tab-review").click();

    // 1. No revisions: both document-scoped requests stay disabled.
    await loadFixture(page, "text");
    assert.equal(
      await commandEnabled(page, "requestAcceptAllRevisions"),
      false,
    );
    assert.equal(
      await commandEnabled(page, "requestRejectAllRevisions"),
      false,
    );
    await openReviewGroup(page);
    assert.equal(await acceptAllButton(page).isDisabled(), true);

    // 2. With a tracked insertion both requests enable and the dialog states scope.
    await loadFixture(page, "review");
    assert.equal(await commandEnabled(page, "requestAcceptAllRevisions"), true);
    assert.equal(await commandEnabled(page, "requestRejectAllRevisions"), true);
    await openReviewGroup(page);
    await acceptAllButton(page).click();
    await page
      .getByTestId("editor-revision-bulk-dialog")
      .waitFor({ state: "visible", timeout: 5000 });
    const message = await page
      .getByTestId("editor-revision-bulk-message")
      .textContent();
    assert.ok(
      message?.includes("1"),
      `message should state the count: ${message}`,
    );
    const confirmLabel = await page
      .getByTestId("editor-revision-bulk-confirm")
      .textContent();
    assert.ok(
      confirmLabel?.includes(locale === "en" ? "Accept All" : "Aceitar tudo"),
      `confirm label should be localized: ${confirmLabel}`,
    );

    // 3. Cancel keeps the revisions and records no history entry.
    const beforeCancel = await page.evaluate(() =>
      window.ribbonReference.client.history.canUndo(),
    );
    await page.getByTestId("editor-revision-bulk-cancel").click();
    await page
      .getByTestId("editor-revision-bulk-dialog")
      .waitFor({ state: "detached", timeout: 5000 });
    assert.equal(await commandEnabled(page, "requestAcceptAllRevisions"), true);
    assert.equal(
      await page.evaluate(() =>
        window.ribbonReference.client.history.canUndo(),
      ),
      beforeCancel,
    );

    // 4. Selection scope and document scope stay distinct: a caret outside the
    // revision disables Accept/Reject but not Accept All.
    await placeCaretInParagraph(page, 1);
    assert.equal(await commandEnabled(page, "acceptRevisions"), false);
    assert.equal(await commandEnabled(page, "requestAcceptAllRevisions"), true);

    // 5. Accept All finalizes the text and undo restores the revision.
    const beforeAccept = await paragraphText(page, 0);
    await openReviewGroup(page);
    await acceptAllButton(page).click();
    await page.getByTestId("editor-revision-bulk-confirm").click();
    await page
      .getByTestId("editor-revision-bulk-dialog")
      .waitFor({ state: "detached", timeout: 5000 });
    assert.equal(await commandEnabled(page, "acceptAllRevisions"), false);
    assert.equal(await paragraphText(page, 0), beforeAccept);
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    assert.equal(await commandEnabled(page, "acceptAllRevisions"), true);

    // 6. Reject All removes the inserted text and undo restores it.
    await openReviewGroup(page);
    await rejectAllButton(page).click();
    await page.getByTestId("editor-revision-bulk-confirm").click();
    await page
      .getByTestId("editor-revision-bulk-dialog")
      .waitFor({ state: "detached", timeout: 5000 });
    assert.equal(await paragraphText(page, 0), "");
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    assert.equal(await paragraphText(page, 0), beforeAccept);

    // 7. The fixture's restored insertion paints markup; the Show Markup
    // toggle unmounts and remounts the decorations.
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="editor-revision-markup"][data-revision-type="insert"]',
        ).length > 0,
      undefined,
      { timeout: 5000 },
    );
    await (
      await openGroup(page, "tracking", "editor-toolbar-revision-markup")
    ).click();
    assert.equal(
      await page.locator('[data-testid="editor-revision-markup"]').count(),
      0,
    );
    await (
      await openGroup(page, "tracking", "editor-toolbar-revision-markup")
    ).click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="editor-revision-markup"]')
          .length > 0,
      undefined,
      { timeout: 5000 },
    );

    // 8. A tracked deletion paints a distinct decoration from an insertion.
    await (
      await openGroup(page, "tracking", "editor-toolbar-track-changes")
    ).click();
    await selectRangeInParagraph(page, 1, 0, 4);
    // DOM-focus the hidden text input (a click would land on the canvas);
    // the ribbon toggle holds focus after its click.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.press("Backspace");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="editor-revision-markup"][data-revision-type="delete"]',
        ).length > 0,
      undefined,
      { timeout: 5000 },
    );
    assert.ok(
      (await page
        .locator(
          '[data-testid="editor-revision-markup"][data-revision-type="delete"]',
        )
        .count()) > 0,
      "tracked deletion should paint a strike-through",
    );

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "accept-all-disabled-without-revisions",
        "accept-all-dialog-scope-and-count",
        "cancel-keeps-revisions-and-history",
        "selection-vs-document-scope",
        "accept-all-undo",
        "reject-all-undo",
        "revision-markup-painted",
        "show-markup-toggle",
        "delete-markup-distinct",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Review layouts in ${engine}: Accept All / Reject All scope, confirmation, disabled states, undo, selection distinction and revision markup.`,
  );
} finally {
  await browser.close();
}
