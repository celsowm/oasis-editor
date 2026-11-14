#!/usr/bin/env node
/**
 * P01 Review: document-scoped Accept All / Reject All, their confirmation gate,
 * disabled states without revisions, undo, and the selection-vs-document scope
 * distinction.
 */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import {
  createSuite,
  openGroup,
  loadFixture,
  selectRangeInParagraph,
  openRibbonPage,
} from "./lib/ribbon-suite.mjs";

const { base, engine, output, sha, dirty, records, browser } =
  await createSuite("review");

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

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "dark", locale: "en", width: 1440 },
    { theme: "light", locale: "en", width: 640 },
  ];
  for (const { theme, locale, width } of configs) {
    const { page, errors } = await openRibbonPage(browser, base, {
      theme,
      locale,
      width,
    });
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

    // 9. Display for Review: All Markup shows the insert decoration; Final and
    // Original render the resolved document with editing disabled (find/copy
    // stay available) while revisions remain in the model; All restores.
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("setReviewDisplayMode")
            .value,
      ),
      "all",
    );
    assert.ok(
      (await page.locator('[data-testid="editor-revision-markup"]').count()) >
        0,
      "All Markup should paint the seeded insertion",
    );
    const hasRevisions = () =>
      page.evaluate(async () => {
        const { collectAllRevisionIds } =
          await import("/src/core/commands/history.ts");
        return (
          collectAllRevisionIds(window.ribbonReference.client.getState()).size >
          0
        );
      });
    assert.equal(await hasRevisions(), true);

    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-final"]')
      .click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("setReviewDisplayMode")
            .value,
      ),
      "final",
    );
    assert.equal(
      await page.locator('[data-testid="editor-revision-markup"]').count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isEnabled,
      ),
      false,
      "final view must disable edits",
    );
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("find").isEnabled,
      ),
      true,
      "final view keeps navigation commands",
    );
    assert.equal(await hasRevisions(), true, "revisions persist in final view");

    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-original"]')
      .click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("setReviewDisplayMode")
            .value,
      ),
      "original",
    );
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isEnabled,
      ),
      false,
      "original view must disable edits",
    );
    assert.equal(await hasRevisions(), true);

    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-all"]')
      .click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("setReviewDisplayMode")
            .value,
      ),
      "all",
    );
    assert.ok(
      (await page.locator('[data-testid="editor-revision-markup"]').count()) >
        0,
      "All Markup must restore the decoration",
    );
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isEnabled,
      ),
      true,
      "All Markup must restore editing",
    );

    // 10. The Reviewing Pane lists the tracked revisions, navigates to one,
    // and accepts a single revision from the list.
    const revisionCount = () =>
      page.evaluate(async () => {
        const { collectAllRevisionIds } =
          await import("/src/core/commands/history.ts");
        return collectAllRevisionIds(window.ribbonReference.client.getState())
          .size;
      });
    const countBefore = await revisionCount();
    assert.ok(countBefore >= 1, "expected at least one revision to list");

    await (
      await openGroup(page, "tracking", "editor-toolbar-revisions-panel")
    ).click();
    await page
      .getByTestId("review-revisions-panel")
      .waitFor({ state: "visible", timeout: 5000 });
    assert.equal(
      await page.locator('[data-testid="review-revision-accept"]').count(),
      countBefore,
      "pane lists one row per tracked revision id",
    );

    await page.getByTestId("review-revision-navigate").first().click();
    const navigated = await page.evaluate(async () => {
      const { collectAllRevisionIds } =
        await import("/src/core/commands/history.ts");
      void collectAllRevisionIds;
      const state = window.ribbonReference.client.getState();
      return {
        collapsed:
          state.selection.anchor.offset !== state.selection.focus.offset,
        anchorParagraphId: state.selection.anchor.paragraphId,
      };
    });
    assert.equal(
      navigated.collapsed,
      true,
      "navigating to a revision expands the selection onto its range",
    );

    await page.getByTestId("review-revision-accept").first().click();
    assert.equal(await revisionCount(), countBefore - 1);

    await page.getByTestId("review-revisions-close").click();
    assert.equal(
      await page.locator('[data-testid="review-revisions-panel"]').count(),
      0,
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
        "display-for-review-all-marks",
        "display-for-review-final-readonly",
        "display-for-review-original-readonly",
        "display-for-review-roundtrip",
        "reviewing-pane-lists-revisions",
        "reviewing-pane-navigates",
        "reviewing-pane-accept-one",
        "reviewing-pane-close",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Review layouts in ${engine}: Accept All / Reject All scope, confirmation, disabled states, undo, selection distinction, revision markup, Display for Review and the Reviewing Pane.`,
  );
} finally {
  await browser.close();
}
