#!/usr/bin/env node
/**
 * P01 Review: document-scoped Accept All / Reject All, their confirmation gate,
 * disabled states without revisions, undo, the selection-vs-document scope
 * distinction, Display for Review (including Simple Markup change bars),
 * Show Markup category/reviewer filters (including the dedicated Formatting
 * checkbox), formatting revisions, Reviewing Pane formatting rows with their
 * accept/reject, structural table-cell revision outlines, and the persisted
 * Reviewing Pane open state.
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
  waitForRibbonSettled,
} from "./lib/ribbon-suite.mjs";

const { base, engine, output, sha, dirty, records, browser } =
  await createSuite("review");

// The full ribbon and the collapsed-group popup both render the same controls.
// Use the shared bounding-box + collapsed-popup resolver instead of the
// `:visible` pseudo-class, which can resolve to a 0x0 copy of a full-size
// button inside a collapsed group and flake on click (notably Firefox).
function acceptAllButton(page) {
  return openGroup(page, "changes", "editor-toolbar-accept-all-revisions");
}

function rejectAllButton(page) {
  return openGroup(page, "changes", "editor-toolbar-reject-all-revisions");
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

function markupOptions(page) {
  return page.evaluate(
    () =>
      window.ribbonReference.client.commands.state("showMarkupOptions").value,
  );
}

function applyShowMarkup(page, payload) {
  // Return undefined explicitly: `execute` can hand back a reactive state
  // proxy whose self-referential getters overflow Playwright's serializer.
  return page.evaluate((p) => {
    window.ribbonReference.client.commands.execute("applyShowMarkup", p);
  }, payload);
}

function revisionMarkupSelector(type) {
  return `[data-testid="editor-revision-markup"]${
    type ? `[data-revision-type="${type}"]` : ""
  }`;
}

function markupCount(page, type) {
  return page.locator(revisionMarkupSelector(type)).count();
}

function commentHighlightCount(page) {
  return page.locator('[data-testid="editor-comment-highlight"]').count();
}

async function waitForMarkupCount(page, type, expected) {
  await page.waitForFunction(
    ([selector, count]) => document.querySelectorAll(selector).length === count,
    [revisionMarkupSelector(type), expected],
    { timeout: 5000 },
  );
}

async function waitForMarkupPresent(page, type) {
  await page.waitForFunction(
    (selector) => document.querySelectorAll(selector).length > 0,
    revisionMarkupSelector(type),
    { timeout: 5000 },
  );
}

async function waitForCommentHighlights(page) {
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-testid="editor-comment-highlight"]')
        .length > 0,
    undefined,
    { timeout: 5000 },
  );
}

async function waitForChecked(page, testId, expected) {
  await page.waitForFunction(
    ([id, value]) =>
      document
        .querySelector(`[data-testid="${id}"]`)
        ?.getAttribute("aria-checked") === value,
    [testId, expected],
    { timeout: 5000 },
  );
}

async function openShowMarkupMenu(page) {
  const firstItem = page.locator(
    '[data-testid="editor-toolbar-show-markup-insertions"]',
  );
  // The gallery keeps itself open between checkbox toggles; only re-open it
  // when a popover dismissed it (collapsed ribbon groups, outside clicks).
  if ((await firstItem.count()) > 0 && (await firstItem.isVisible())) return;
  await (
    await openGroup(page, "tracking", "editor-toolbar-show-markup")
  ).click();
  await firstItem.waitFor({ state: "visible", timeout: 5000 });
}

async function clickShowMarkupItem(page, testId) {
  await openShowMarkupMenu(page);
  await page.locator(`[data-testid="${testId}"]`).click();
}

async function ariaChecked(page, testId) {
  return page.locator(`[data-testid="${testId}"]`).getAttribute("aria-checked");
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
    assert.equal(await (await acceptAllButton(page)).isDisabled(), true);

    // 2. With a tracked insertion both requests enable and the dialog states scope.
    await loadFixture(page, "review");
    assert.equal(await commandEnabled(page, "requestAcceptAllRevisions"), true);
    assert.equal(await commandEnabled(page, "requestRejectAllRevisions"), true);
    await (await acceptAllButton(page)).click();
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
    await (await acceptAllButton(page)).click();
    await page.getByTestId("editor-revision-bulk-confirm").click();
    await page
      .getByTestId("editor-revision-bulk-dialog")
      .waitFor({ state: "detached", timeout: 5000 });
    assert.equal(await commandEnabled(page, "acceptAllRevisions"), false);
    assert.equal(await paragraphText(page, 0), beforeAccept);
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    assert.equal(await commandEnabled(page, "acceptAllRevisions"), true);

    // 6. Reject All removes the inserted text and undo restores it.
    await (await rejectAllButton(page)).click();
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

    // 9a. Simple Markup: a fourth Display for Review mode renders the accepted
    // (final) text with margin change bars instead of inline decorations. The
    // bars are driven by the raw revision-bearing paragraph ids, matched onto
    // the projected snapshot (which keeps those ids), and honour Show Markup.
    const changeBars = () => page.locator('[data-testid="editor-change-bar"]');
    assert.equal(
      await changeBars().count(),
      0,
      "All Markup paints no change bars",
    );

    const changeBarIds = () =>
      page.evaluate(async () => {
        const { collectChangeBarParagraphIds } =
          await import("/src/core/commands/reviewMarkup.ts");
        return [
          ...collectChangeBarParagraphIds(
            window.ribbonReference.client.getState(),
          ),
        ].sort();
      });
    const paintedChangeBarIds = () =>
      changeBars().evaluateAll((bars) =>
        bars.map((bar) => bar.getAttribute("data-paragraph-id")).sort(),
      );
    const waitForChangeBarCount = (count) =>
      page.waitForFunction(
        (expected) =>
          document.querySelectorAll('[data-testid="editor-change-bar"]')
            .length === expected,
        count,
        { timeout: 5000 },
      );

    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-simple"]')
      .click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("setReviewDisplayMode")
            .value,
      ),
      "simple",
    );
    const defaultIds = await changeBarIds();
    assert.ok(
      defaultIds.length >= 1,
      "fixture has revision-bearing paragraphs",
    );
    await waitForChangeBarCount(defaultIds.length);
    assert.deepEqual(
      await paintedChangeBarIds(),
      defaultIds,
      "change bars match the raw revision-bearing paragraph ids",
    );
    assert.equal(
      await page.locator('[data-testid="editor-revision-markup"]').count(),
      0,
      "Simple Markup hides inline insert/delete decorations",
    );
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isEnabled,
      ),
      false,
      "Simple Markup is read-only",
    );
    assert.equal(
      await hasRevisions(),
      true,
      "revisions persist in Simple Markup",
    );

    // Hiding insertions removes that paragraph's bar but keeps the deletion's.
    await applyShowMarkup(page, { section: "insertions" });
    const filteredIds = await changeBarIds();
    assert.ok(filteredIds.length < defaultIds.length);
    await waitForChangeBarCount(filteredIds.length);
    assert.deepEqual(await paintedChangeBarIds(), filteredIds);

    // No reviewers visible -> the pane of change bars is empty.
    await applyShowMarkup(page, { allAuthors: false });
    await waitForChangeBarCount(0);
    assert.equal(await changeBars().count(), 0);

    // Restore the default filters.
    await applyShowMarkup(page, { allAuthors: true });
    await applyShowMarkup(page, { section: "insertions" });
    await waitForChangeBarCount(defaultIds.length);
    assert.deepEqual(await paintedChangeBarIds(), defaultIds);

    // Change bars are Simple-Markup-only: Final and All Markup paint none.
    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-final"]')
      .click();
    await waitForChangeBarCount(0);
    assert.equal(await changeBars().count(), 0);

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
    assert.equal(await changeBars().count(), 0);
    assert.ok(
      (await page.locator('[data-testid="editor-revision-markup"]').count()) >
        0,
      "All Markup restores inline decorations",
    );

    // 10. Show Markup: category and reviewer filters change what is painted
    // without editing revision data. The fixture seeds an insertion and an
    // anchored comment from "Reference author"; step 8 adds a deletion from
    // "User", and a reply adds "Reference reviewer" to the reviewer list.
    const commentCountBefore = await page.evaluate(
      () =>
        Object.keys(
          window.ribbonReference.client.getState().document.comments?.items ??
            {},
        ).length,
    );
    assert.equal(commentCountBefore, 2);

    const initialOptions = await markupOptions(page);
    assert.equal(initialOptions.insertions, true);
    assert.equal(initialOptions.deletions, true);
    assert.equal(initialOptions.comments, true);
    assert.equal(initialOptions.formatting, true);
    assert.equal(initialOptions.allAuthors, true);
    assert.deepEqual(initialOptions.visibleAuthors, []);
    assert.ok(initialOptions.knownAuthors.length >= 2);
    assert.ok((await markupCount(page, "insert")) > 0);
    assert.ok((await markupCount(page, "delete")) > 0);
    assert.ok((await commentHighlightCount(page)) > 0);

    await openShowMarkupMenu(page);
    for (const section of [
      "insertions",
      "deletions",
      "formatting",
      "comments",
    ]) {
      assert.equal(
        await ariaChecked(page, `editor-toolbar-show-markup-${section}`),
        "true",
      );
    }
    assert.equal(
      await ariaChecked(page, "editor-toolbar-show-markup-all-reviewers"),
      "true",
    );

    // The dedicated Formatting checkbox toggles its flag both ways (its effect
    // on an actual formatting revision is asserted in step 13).
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-formatting");
    assert.equal((await markupOptions(page)).formatting, false);
    await waitForChecked(
      page,
      "editor-toolbar-show-markup-formatting",
      "false",
    );
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-formatting");
    assert.equal((await markupOptions(page)).formatting, true);
    const reviewerRows = page.locator(
      '[data-testid^="editor-toolbar-show-markup-reviewer-"]',
    );
    assert.equal(
      await reviewerRows.count(),
      initialOptions.knownAuthors.length,
    );
    assert.deepEqual(
      await reviewerRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-author")),
      ),
      initialOptions.knownAuthors,
    );

    // Insertions off: only the "User" deletion decoration remains.
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-insertions");
    await waitForMarkupCount(page, "insert", 0);
    assert.equal((await markupOptions(page)).insertions, false);
    await waitForChecked(
      page,
      "editor-toolbar-show-markup-insertions",
      "false",
    );
    assert.ok((await markupCount(page, "delete")) > 0);
    assert.ok((await commentHighlightCount(page)) > 0);

    // Deletions off too: no revision markup, comment highlights survive.
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-deletions");
    await waitForMarkupCount(page, null, 0);
    assert.equal((await markupOptions(page)).deletions, false);
    assert.ok((await commentHighlightCount(page)) > 0);

    // Comments off: the comment highlights disappear as well.
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-comments");
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="editor-comment-highlight"]')
          .length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal((await markupOptions(page)).comments, false);
    assert.equal(await commentHighlightCount(page), 0);

    // Restore the three categories turned off above (Formatting was already
    // restored by its dedicated checkbox check).
    for (const section of ["insertions", "deletions", "comments"]) {
      await clickShowMarkupItem(page, `editor-toolbar-show-markup-${section}`);
    }
    const restoredOptions = await markupOptions(page);
    assert.equal(restoredOptions.insertions, true);
    assert.equal(restoredOptions.deletions, true);
    assert.equal(restoredOptions.comments, true);
    assert.equal(restoredOptions.formatting, true);
    await waitForMarkupPresent(page, "insert");
    await waitForMarkupPresent(page, "delete");
    await waitForCommentHighlights(page);

    // "All Reviewers" unchecked hides every author's markup.
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-all-reviewers");
    await waitForMarkupCount(page, null, 0);
    const noneVisible = await markupOptions(page);
    assert.equal(noneVisible.allAuthors, false);
    assert.deepEqual(noneVisible.visibleAuthors, []);
    assert.equal(await commentHighlightCount(page), 0);
    await waitForChecked(
      page,
      "editor-toolbar-show-markup-all-reviewers",
      "false",
    );

    // Re-check "All Reviewers" restores everything.
    await clickShowMarkupItem(page, "editor-toolbar-show-markup-all-reviewers");
    assert.equal((await markupOptions(page)).allAuthors, true);
    await waitForMarkupPresent(page, "insert");
    await waitForCommentHighlights(page);

    // One reviewer off: their insertion and comment vanish, the other
    // author's deletion stays, and "All Reviewers" becomes mixed.
    const authorRow = page.locator(
      '[data-testid^="editor-toolbar-show-markup-reviewer-"][data-author="Reference author"]',
    );
    assert.equal(await authorRow.count(), 1);
    await openShowMarkupMenu(page);
    await authorRow.click();
    await waitForMarkupCount(page, "insert", 0);
    assert.equal(await commentHighlightCount(page), 0);
    assert.ok((await markupCount(page, "delete")) > 0);
    const filtered = await markupOptions(page);
    assert.equal(filtered.allAuthors, false);
    assert.ok(!filtered.visibleAuthors.includes("Reference author"));
    await waitForChecked(
      page,
      "editor-toolbar-show-markup-all-reviewers",
      "mixed",
    );

    // Toggling the last hidden reviewer collapses back to "all reviewers".
    await openShowMarkupMenu(page);
    await authorRow.click();
    assert.equal((await markupOptions(page)).allAuthors, true);
    await waitForMarkupPresent(page, "insert");
    await waitForCommentHighlights(page);
    await page.keyboard.press("Escape");

    // Show Markup is view-only: revision and comment data are untouched.
    assert.equal(await hasRevisions(), true);
    assert.equal(
      await page.evaluate(
        () =>
          Object.keys(
            window.ribbonReference.client.getState().document.comments?.items ??
              {},
          ).length,
      ),
      commentCountBefore,
    );

    // 11. The Reviewing Pane lists the tracked revisions, navigates to one,
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

    // 11a. Show Markup filters govern the Reviewing Pane list too. Dispatch
    // through the bus (the same path the gallery uses) and assert the rows
    // and the localized "hidden" hint react without editing revision data.
    const paneRows = page.locator('[data-testid="review-revisions-list"] > li');
    const paneInsertRows = page.locator(
      '[data-testid="review-revisions-list"] [data-revision-type="insert"]',
    );
    const paneDeleteRows = page.locator(
      '[data-testid="review-revisions-list"] [data-revision-type="delete"]',
    );
    const initialInsertRows = await paneInsertRows.count();
    const initialDeleteRows = await paneDeleteRows.count();
    assert.ok(initialInsertRows > 0, "fixture has an insertion to filter");
    assert.ok(initialDeleteRows > 0, "fixture has a deletion to filter");

    await applyShowMarkup(page, { section: "insertions" });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="review-revisions-list"] [data-revision-type="insert"]',
        ).length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await paneRows.count(), countBefore - initialInsertRows);
    assert.equal(await paneDeleteRows.count(), initialDeleteRows);
    await page
      .getByTestId("review-revisions-filtered")
      .waitFor({ state: "visible", timeout: 5000 });
    await applyShowMarkup(page, { section: "insertions" });
    await page.waitForFunction(
      (expected) =>
        document.querySelectorAll('[data-testid="review-revisions-list"] > li')
          .length === expected,
      countBefore,
      { timeout: 5000 },
    );
    assert.equal(
      await page.getByTestId("review-revisions-filtered").count(),
      0,
    );

    // Hiding one reviewer removes only their rows (the insertion and the
    // anchored comment author is "Reference author"; the deletion is "User").
    await applyShowMarkup(page, { author: "Reference author" });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="review-revisions-list"] [data-revision-type="insert"]',
        ).length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await paneDeleteRows.count(), initialDeleteRows);
    await page
      .getByTestId("review-revisions-filtered")
      .waitFor({ state: "visible", timeout: 5000 });

    // No reviewers visible: the pane falls back to its empty state.
    await applyShowMarkup(page, { allAuthors: false });
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="review-revisions-list"] > li')
          .length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await paneRows.count(), 0);

    // Restore; the bulk Accept All footer still addresses the whole document.
    await applyShowMarkup(page, { allAuthors: true });
    await page.waitForFunction(
      (expected) =>
        document.querySelectorAll('[data-testid="review-revisions-list"] > li')
          .length === expected,
      countBefore,
      { timeout: 5000 },
    );
    assert.equal(await revisionCount(), countBefore);

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

    // 13. Formatting (property) revisions paint their own decoration, join the
    // Show Markup reviewer list, and produce a Simple Markup change bar. Reset
    // to the pristine fixture first so this is isolated from the steps above.
    await loadFixture(page, "review");
    await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const { getDocumentParagraphs } = await import("/src/core/model.ts");
      const document = client.document.get();
      const target = getDocumentParagraphs(document)[1];
      client.document.load({
        ...document,
        sections: document.sections.map((section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.id === target.id
              ? {
                  ...target,
                  runs: target.runs.map((run, index) =>
                    index === 0
                      ? {
                          ...run,
                          styles: {
                            ...(run.styles ?? {}),
                            propertyRevision: {
                              id: "format-revision",
                              type: "property",
                              author: "Formatting author",
                              date: 3000,
                              previous: {},
                            },
                          },
                        }
                      : run,
                  ),
                }
              : block,
          ),
        })),
      });
    });
    const propertyMarkup = () =>
      page.locator(
        '[data-testid="editor-revision-markup"][data-revision-type="property"]',
      );
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="editor-revision-markup"][data-revision-type="property"]',
        ).length > 0,
      undefined,
      { timeout: 5000 },
    );
    assert.ok(
      (await propertyMarkup().count()) > 0,
      "a formatting revision paints a distinct decoration in All Markup",
    );
    assert.equal(
      await propertyMarkup().first().getAttribute("data-revision-id"),
      "format-revision",
    );
    const authors = (await markupOptions(page)).knownAuthors;
    assert.ok(
      authors.includes("Formatting author"),
      "formatting revision authors appear in the Show Markup reviewer list",
    );

    // Other categories do not hide formatting (only the dedicated Formatting
    // checkbox does).
    await applyShowMarkup(page, { section: "insertions" });
    assert.ok(
      (await propertyMarkup().count()) > 0,
      "turning insertions off must not hide formatting decorations",
    );
    await applyShowMarkup(page, { section: "insertions" });

    // The dedicated Formatting checkbox hides formatting decorations only;
    // the insert decoration stays painted.
    await applyShowMarkup(page, { section: "formatting" });
    assert.equal((await markupOptions(page)).formatting, false);
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="editor-revision-markup"][data-revision-type="property"]',
        ).length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await propertyMarkup().count(), 0);
    assert.ok(
      (await markupCount(page, "insert")) > 0,
      "formatting off must not hide insertions",
    );
    await applyShowMarkup(page, { section: "formatting" });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="editor-revision-markup"][data-revision-type="property"]',
        ).length > 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal((await markupOptions(page)).formatting, true);

    // Hiding the formatting author removes its decoration (reviewer filtering).
    await applyShowMarkup(page, { author: "Formatting author" });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="editor-revision-markup"][data-revision-type="property"]',
        ).length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await propertyMarkup().count(), 0);
    await applyShowMarkup(page, { author: "Formatting author" });

    // In Simple Markup the formatting paragraph also gets a change bar (and
    // inline formatting decorations are hidden along with insert/delete ones).
    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-simple"]')
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="editor-change-bar"]').length >
        0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(
      await page.locator('[data-testid="editor-revision-markup"]').count(),
      0,
    );
    const simpleIds = await changeBarIds();
    assert.deepEqual(await paintedChangeBarIds(), simpleIds);
    assert.ok(
      simpleIds.length >= 2,
      "formatting and insert paragraphs both bar",
    );

    // Formatting off removes only the formatting paragraph's change bar; the
    // insert paragraph keeps its bar (bars stay consistent with the core helper).
    await applyShowMarkup(page, { section: "formatting" });
    const barsWithoutFormatting = await changeBarIds();
    assert.ok(barsWithoutFormatting.length < simpleIds.length);
    await waitForChangeBarCount(barsWithoutFormatting.length);
    assert.deepEqual(await paintedChangeBarIds(), barsWithoutFormatting);
    await applyShowMarkup(page, { section: "formatting" });
    await waitForChangeBarCount(simpleIds.length);
    assert.deepEqual(await paintedChangeBarIds(), simpleIds);

    // 14. The Reviewing Pane now lists formatting (property) revisions, the
    // Formatting checkbox hides that row, and per-row Accept resolves the
    // underlying w:rPrChange marker (bulk ids and selection ids both include it).
    // Return to All Markup first (Simple Markup is read-only).
    await (
      await openGroup(page, "tracking", "editor-toolbar-display-for-review")
    ).click();
    await page
      .locator('[data-testid="editor-toolbar-display-for-review-all"]')
      .click();

    const formattingIds = () =>
      page.evaluate(async () => {
        const { collectAllRevisionIds } =
          await import("/src/core/commands/history.ts");
        return [
          ...collectAllRevisionIds(window.ribbonReference.client.getState()),
        ];
      });
    assert.ok(
      (await formattingIds()).includes("format-revision"),
      "formatting revision id is counted for bulk Accept/Reject",
    );

    await (
      await openGroup(page, "tracking", "editor-toolbar-revisions-panel")
    ).click();
    await page
      .getByTestId("review-revisions-panel")
      .waitFor({ state: "visible", timeout: 5000 });
    const formattingRows = () =>
      page
        .locator('[data-testid="review-revisions-list"] > li')
        .filter({ has: page.locator('[data-revision-type="property"]') });
    assert.equal(await formattingRows().count(), 1);
    assert.ok(
      (await formattingRows().first().textContent())?.includes(
        locale === "en" ? "Formatting change" : "Alteração de formatação",
      ),
      "the formatting row uses the localized Formatted label",
    );

    // The dedicated Formatting checkbox hides the formatting row.
    await applyShowMarkup(page, { section: "formatting" });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="review-revisions-list"] [data-revision-type="property"]',
        ).length === 0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await formattingRows().count(), 0);
    await applyShowMarkup(page, { section: "formatting" });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-testid="review-revisions-list"] [data-revision-type="property"]',
        ).length === 1,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await formattingRows().count(), 1);

    // Accept the formatting row: the marker, its decoration and the row vanish.
    await formattingRows()
      .first()
      .getByTestId("review-revision-accept")
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-revision-type="property"]').length ===
        0,
      undefined,
      { timeout: 5000 },
    );
    assert.equal(await propertyMarkup().count(), 0);
    assert.equal(await formattingRows().count(), 0);
    assert.ok(
      !(await formattingIds()).includes("format-revision"),
      "accepting removes the formatting revision id",
    );
    await page.getByTestId("review-revisions-close").click();

    // 15. Structural/formatting revisions on table cells paint full-cell
    // outlines (not text underlines), obey Show Markup category/reviewer
    // filters, and their ids are counted by the bulk revision model. Reset to
    // a pristine table fixture and normalize every view filter first.
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("setReviewDisplayMode")
            .value,
      ),
      "all",
      "step 14 restores All Markup before the table-cell checks",
    );
    await applyShowMarkup(page, { allAuthors: true });
    const defaults = await markupOptions(page);
    for (const section of [
      "insertions",
      "deletions",
      "formatting",
      "comments",
    ]) {
      if (!defaults[section]) await applyShowMarkup(page, { section });
    }
    await loadFixture(page, "table");
    await page.evaluate(() => {
      const client = window.ribbonReference.client;
      const doc = client.document.get();
      client.document.load({
        ...doc,
        sections: doc.sections.map((section) => ({
          ...section,
          blocks: section.blocks.map((block) =>
            block.type !== "table"
              ? block
              : {
                  ...block,
                  rows: block.rows.map((row, rowIndex) => ({
                    ...row,
                    cells: row.cells.map((cell, cellIndex) => {
                      if (rowIndex === 1 && cellIndex === 0) {
                        return {
                          ...cell,
                          style: {
                            ...(cell.style ?? {}),
                            revision: {
                              id: "cell-insert",
                              type: "insert",
                              author: "Table author",
                              date: 1000,
                            },
                          },
                        };
                      }
                      if (rowIndex === 1 && cellIndex === 1) {
                        return {
                          ...cell,
                          style: {
                            ...(cell.style ?? {}),
                            propertyRevision: {
                              id: "cell-property",
                              type: "property",
                              author: "Table author",
                              date: 2000,
                              previous: {},
                            },
                          },
                        };
                      }
                      return cell;
                    }),
                  })),
                },
          ),
        })),
      });
    });

    const cellMarkup = () =>
      page.locator(
        '[data-testid="editor-revision-markup"][data-revision-cell="true"]',
      );
    const cellMarkupOf = (type) =>
      page.locator(
        `[data-testid="editor-revision-markup"][data-revision-cell="true"][data-revision-type="${type}"]`,
      );
    const waitForCellCount = (count) =>
      page.waitForFunction(
        (expected) =>
          document.querySelectorAll(
            '[data-testid="editor-revision-markup"][data-revision-cell="true"]',
          ).length === expected,
        count,
        { timeout: 5000 },
      );

    await waitForCellCount(2);
    assert.equal(await cellMarkup().count(), 2);
    assert.equal(await cellMarkupOf("insert").count(), 1);
    assert.equal(await cellMarkupOf("property").count(), 1);
    assert.deepEqual(
      (
        await cellMarkup().evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-revision-id")),
        )
      ).sort(),
      ["cell-insert", "cell-property"],
    );
    // Full-cell outlines carry a 2px border and a box as big as the cell,
    // unlike the 2px-tall text underlines used for run revisions.
    const outlines = await cellMarkup().evaluateAll((nodes) =>
      nodes.map((node) => {
        const cs = getComputedStyle(node);
        return {
          width: parseFloat(node.style.width),
          height: parseFloat(node.style.height),
          borderWidth: cs.borderTopWidth,
          borderStyle: cs.borderTopStyle,
        };
      }),
    );
    assert.equal(outlines.length, 2);
    for (const outline of outlines) {
      assert.ok(outline.width > 40, "cell outline spans the cell width");
      assert.ok(outline.height > 10, "cell outline spans the cell height");
      assert.equal(outline.borderStyle, "solid");
      assert.equal(outline.borderWidth, "2px");
    }

    // Formatting off hides only the property cell.
    await applyShowMarkup(page, { section: "formatting" });
    await waitForCellCount(1);
    assert.equal(await cellMarkupOf("insert").count(), 1);
    assert.equal(await cellMarkupOf("property").count(), 0);
    await applyShowMarkup(page, { section: "formatting" });
    await waitForCellCount(2);

    // Insertions off hides only the inserted cell.
    await applyShowMarkup(page, { section: "insertions" });
    await waitForCellCount(1);
    assert.equal(await cellMarkupOf("insert").count(), 0);
    assert.equal(await cellMarkupOf("property").count(), 1);
    await applyShowMarkup(page, { section: "insertions" });
    await waitForCellCount(2);

    // No reviewers visible hides both; restoring brings both back.
    await applyShowMarkup(page, { allAuthors: false });
    await waitForCellCount(0);
    await applyShowMarkup(page, { allAuthors: true });
    await waitForCellCount(2);

    // Cell authors join the Show Markup reviewer list, and isolating a
    // reviewer by name (the same path the gallery uses) hides their outlines.
    assert.ok(
      (await markupOptions(page)).knownAuthors.includes("Table author"),
      "cell revision authors appear in the Show Markup reviewer list",
    );
    await applyShowMarkup(page, { author: "Table author" });
    await waitForCellCount(0);
    await applyShowMarkup(page, { author: "Table author" });
    await waitForCellCount(2);

    // The bulk revision model already counts cell-level ids, so Accept All /
    // Reject All address these same changes.
    const bulkIds = await page.evaluate(async () => {
      const { collectAllRevisionIds } =
        await import("/src/core/commands/history.ts");
      return [
        ...collectAllRevisionIds(window.ribbonReference.client.getState()),
      ];
    });
    assert.ok(bulkIds.includes("cell-insert"));
    assert.ok(bulkIds.includes("cell-property"));

    // 16. The Reviewing Pane's open state persists across reloads through
    // localStorage, like Word's pane visibility. This runs last: a reload
    // intentionally discards every earlier step's document/view state.
    const paneStorage = () =>
      page.evaluate(() =>
        globalThis.localStorage.getItem("oasis-reviewing-pane-v1"),
      );
    assert.equal(
      await page.locator('[data-testid="review-revisions-panel"]').count(),
      0,
      "the pane is closed before the persistence check",
    );
    // Dispatch through the command bus (the same path the ribbon button uses)
    // so the check is independent of collapsed-group layout at narrow widths.
    await page.evaluate(() => {
      window.ribbonReference.client.commands.execute("toggleRevisionsPanel");
    });
    await page
      .getByTestId("review-revisions-panel")
      .waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await paneStorage(), "true");

    await page.reload();
    await waitForRibbonReference(page);
    await waitForRibbonSettled(page);
    await page
      .getByTestId("review-revisions-panel")
      .waitFor({ state: "visible", timeout: 5000 });
    assert.equal(
      await page.locator('[data-testid="review-revisions-panel"]').count(),
      1,
      "an open Reviewing Pane is restored after reload",
    );

    await page.getByTestId("review-revisions-close").click();
    assert.equal(await paneStorage(), "false");
    await page.reload();
    await waitForRibbonReference(page);
    await waitForRibbonSettled(page);
    assert.equal(
      await page.locator('[data-testid="review-revisions-panel"]').count(),
      0,
      "a closed Reviewing Pane stays closed after reload",
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
        "simple-markup-change-bars-and-ids",
        "simple-markup-readonly-and-no-inline-markup",
        "simple-markup-follows-show-markup-filters",
        "simple-markup-bars-are-mode-specific",
        "show-markup-menu-defaults-and-reviewers",
        "show-markup-formatting-checkbox",
        "show-markup-insertions-filter",
        "show-markup-deletions-filter",
        "show-markup-comments-filter",
        "show-markup-all-reviewers-toggle",
        "show-markup-single-reviewer-filter",
        "show-markup-view-only",
        "reviewing-pane-lists-revisions",
        "reviewing-pane-filter-by-category",
        "reviewing-pane-filter-by-reviewer",
        "reviewing-pane-filter-empty-then-restore",
        "reviewing-pane-navigates",
        "reviewing-pane-accept-one",
        "reviewing-pane-close",
        "formatting-revision-paints-distinct-decoration",
        "formatting-revision-author-in-show-markup",
        "formatting-revision-other-categories-independent",
        "formatting-revision-follows-formatting-checkbox",
        "formatting-revision-reviewer-filter-and-change-bar",
        "formatting-change-bar-follows-formatting-checkbox",
        "reviewing-pane-lists-formatting-revision",
        "reviewing-pane-formatting-row-follows-formatting-checkbox",
        "reviewing-pane-formatting-row-accept-resolves",
        "table-cell-revisions-paint-full-cell-outlines",
        "table-cell-revisions-follow-show-markup-categories",
        "table-cell-revisions-follow-reviewer-filters",
        "table-cell-revision-ids-consistent-with-bulk-model",
        "reviewing-pane-open-state-persists-across-reload",
        "reviewing-pane-closed-state-persists-across-reload",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Review layouts in ${engine}: Accept All / Reject All scope, confirmation, disabled states, undo, selection distinction, revision markup, Display for Review, Simple Markup change bars, Show Markup category/reviewer filters (including the Formatting checkbox), formatting revisions, Reviewing Pane formatting rows and their accept/reject, structural table-cell revision outlines, and the persisted Reviewing Pane open state.`,
  );
} finally {
  await browser.close();
}
