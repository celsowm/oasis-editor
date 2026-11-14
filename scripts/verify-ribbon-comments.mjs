#!/usr/bin/env node
/**
 * P01 Review comments: authoring, threading, resolve/reopen, navigation,
 * deletion with undo, read-only gating and DOCX round-trip, driven through the
 * Review tab and the discussions panel.
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
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-comments-${engine}`,
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

/**
 * The full ribbon and the collapsed-group popup both render the same controls.
 * Playwright's `.visible()` engine does not require a non-empty box, but the
 * click actionability check does — a full-size button inside a collapsed group
 * keeps `display:flex` at 0x0. Choose by measured bounding box instead of
 * pseudo-classes; when no copy is actionable, open the collapsed popup and
 * scope the locator to it.
 */
/**
 * Measurements live in a rAF; right after a state change (fixture import,
 * read-only toggle) groups render from estimates for a frame. Wait until
 * every group reports measured widths — until then a control's box can
 * collapse or expand mid-check, which is indistinguishable from a broken
 * button but is really the responsive planner re-running.
 */
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
  try {
    await page.keyboard.press("Escape");
    await page.getByTestId(`editor-ribbon-group-${group}`).click();
    const popup = page.locator(".oasis-editor-ribbon-collapsed-menu");
    await popup.waitFor({ state: "visible", timeout: 5000 });
    return popup.locator(`[data-testid="${testId}"]`);
  } catch (error) {
    const dump = await page.evaluate((id) => {
      const els = [...document.querySelectorAll(`[data-testid="${id}"]`)].map(
        (el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            w: rect.width,
            h: rect.height,
            display: style.display,
            visibility: style.visibility,
            sectionState: el
              .closest("[data-ribbon-group]")
              ?.getAttribute("data-ribbon-state"),
          };
        },
      );
      return {
        els,
        activeTab: document
          .querySelector(
            '[data-testid^="editor-ribbon-tab-"][aria-selected="true"]',
          )
          ?.getAttribute("data-testid"),
      };
    }, testId);
    console.error("openGroup failed", JSON.stringify(dump));
    throw error;
  }
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

async function selectRange(page, paragraphIndex, from, to) {
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

async function placeCaret(page, paragraphIndex, offset) {
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

async function selectedText(page) {
  return page.evaluate(async () => {
    const { getSelectedText } = await import("/src/core/commands/selection.ts");
    return getSelectedText(window.ribbonReference.client.getState());
  });
}

async function comments(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    const state = window.ribbonReference.client.getState();
    const items = state.document.comments?.items ?? {};
    const order = state.document.comments?.order ?? [];
    const paragraphs = getDocumentParagraphs(state.document);
    const index = new Map(paragraphs.map((p, i) => [p.id, i]));
    return order.map((id) => {
      const comment = items[id];
      return {
        id,
        author: comment.author,
        text: comment.text,
        parentId: comment.parentId ?? null,
        resolved: comment.resolved === true,
        start: comment.start
          ? {
              paragraph: index.get(comment.start.paragraphId),
              offset: comment.start.offset,
            }
          : null,
        end: comment.end
          ? {
              paragraph: index.get(comment.end.paragraphId),
              offset: comment.end.offset,
            }
          : null,
      };
    });
  });
}

async function submitComposer(page, { author, body }) {
  await page.getByTestId("comment-composer-author").fill(author);
  await page.getByTestId("comment-composer-body").fill(body);
  await page.getByTestId("comment-composer-submit").click();
  await page.getByTestId("editor-dialog").waitFor({ state: "detached" });
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
    await loadFixture(page, "text");

    // 1. New Comment needs selectable text: disabled on an empty paragraph,
    // enabled for a range and (as a caret-word expansion) for a caret in text.
    await page.evaluate(async () => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } =
        await import("/src/core/model.ts");
      const client = window.ribbonReference.client;
      await client.import.html("<p></p>");
      const paragraph = getDocumentParagraphs(client.document.get())[0];
      client.selection.set({
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 0),
      });
    });
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("newComment").isEnabled,
      ),
      false,
    );
    await loadFixture(page, "text");
    await placeCaret(page, 1, 0);
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("newComment").isEnabled,
      ),
      true,
    );
    await selectRange(page, 1, 0, 6);
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("newComment").isEnabled,
      ),
      true,
    );

    // 2. Authoring a comment anchors it and paints the highlight.
    await openGroup(page, "comments", "editor-toolbar-new-comment");
    await (
      await openGroup(page, "comments", "editor-toolbar-new-comment")
    ).click();
    await page.getByTestId("editor-dialog").waitFor({ state: "visible" });
    await submitComposer(page, {
      author: "Reviewer One",
      body: "Please tighten this sentence.",
    });
    let threads = await comments(page);
    assert.equal(threads.length, 1);
    assert.equal(threads[0].author, "Reviewer One");
    assert.equal(threads[0].text, "Please tighten this sentence.");
    assert.deepEqual(threads[0].start, { paragraph: 1, offset: 0 });
    assert.deepEqual(threads[0].end, { paragraph: 1, offset: 6 });
    assert.equal(threads[0].parentId, null);
    assert.equal(
      (await page.locator('[data-testid="editor-comment-highlight"]').count()) >
        0,
      true,
    );

    // 3. The discussions panel lists the thread.
    await (
      await openGroup(page, "comments", "editor-toolbar-comments-panel")
    ).click();
    await page
      .getByTestId("review-comments-panel")
      .waitFor({ state: "visible" });
    const panelText = await page
      .getByTestId("review-comments-panel")
      .textContent();
    assert.ok(panelText?.includes("Please tighten this sentence."));

    // 4. Replying keeps a parent link and shows the parent context in the dialog.
    await page.getByTestId("review-comment-reply").first().click();
    await page.getByTestId("editor-dialog").waitFor({ state: "visible" });
    const replyContext = await page
      .getByTestId("comment-reply-context")
      .textContent();
    assert.ok(replyContext?.includes("Please tighten this sentence."));
    await submitComposer(page, {
      author: "Reviewer Two",
      body: "Agreed, shortening it now.",
    });
    threads = await comments(page);
    assert.equal(threads.length, 2);
    const reply = threads.find((c) => c.parentId);
    assert.ok(reply, "reply should carry a parentId");
    assert.equal(reply.text, "Agreed, shortening it now.");
    assert.equal(reply.start, null);
    // Replies render collapsed behind the thread toggle; expand before reading.
    await page.getByTestId("review-toggle-replies").first().click();
    assert.equal(
      await page
        .getByTestId("review-comments-panel")
        .textContent()
        .then((text) => text?.includes("Agreed, shortening it now.")),
      true,
    );

    // 5. Resolve and reopen from the panel.
    await page.getByTestId("review-comment-resolve").first().click();
    threads = await comments(page);
    assert.equal(threads.find((c) => !c.parentId)?.resolved, true);
    assert.ok(
      (await page.getByTestId("review-comment-resolve").first().textContent())
        ?.length,
    );
    await page.getByTestId("review-comment-resolve").first().click();
    threads = await comments(page);
    assert.equal(threads.find((c) => !c.parentId)?.resolved, false);

    // The panel's overlay intercepts ribbon clicks; close it for the ribbon steps.
    await page.getByTestId("review-comments-close").click();
    await page
      .getByTestId("review-comments-panel")
      .waitFor({ state: "detached", timeout: 5000 });

    // 6. Navigation moves the selection onto the commented range.
    await placeCaret(page, 3, 0);
    await (
      await openGroup(page, "comments", "editor-toolbar-next-comment")
    ).click();
    assert.equal(await selectedText(page), "Normal");

    // 7. Deleting the thread is one undoable step, including its reply.
    await (
      await openGroup(page, "comments", "editor-toolbar-delete-comment")
    ).click();
    assert.equal((await comments(page)).length, 0);
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    threads = await comments(page);
    assert.equal(threads.length, 2);
    assert.ok(threads.some((c) => c.parentId));

    // 8. Read-only blocks authoring.
    await page.evaluate(() =>
      window.ribbonReference.client.ui.setReadOnly(true),
    );
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("newComment").isEnabled,
      ),
      false,
    );
    await page.evaluate(() =>
      window.ribbonReference.client.ui.setReadOnly(false),
    );

    // 9. Resolve, export and reimport: text, anchors, parent and state survive.
    await (
      await openGroup(page, "comments", "editor-toolbar-comments-panel")
    ).click();
    await page.getByTestId("review-comments-panel").waitFor({
      state: "visible",
    });
    await page.getByTestId("review-comment-resolve").first().click();
    const exported = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      const bytes = [...new Uint8Array(await result.value.blob.arrayBuffer())];
      const loaded = await client.io.import({
        format: "docx",
        data: result.value.blob,
      });
      if (!loaded.ok) throw new Error(JSON.stringify(loaded.error));
      return bytes;
    });
    const filename = `${theme}-${locale}-${width}.docx`;
    await writeFile(resolve(output, filename), new Uint8Array(exported));
    const commentsXml = execFileSync("unzip", [
      "-p",
      resolve(output, filename),
      "word/comments.xml",
    ]).toString("utf8");
    assert.ok(commentsXml.includes("Please tighten this sentence."));
    assert.ok(commentsXml.includes("Agreed, shortening it now."));
    threads = await comments(page);
    assert.equal(threads.length, 2);
    const root = threads.find((c) => !c.parentId);
    assert.ok(root, "root comment should survive the round-trip");
    assert.equal(root.author, "Reviewer One");
    assert.equal(root.text, "Please tighten this sentence.");
    assert.equal(root.resolved, true);
    assert.deepEqual(root.start, { paragraph: 1, offset: 0 });
    assert.deepEqual(root.end, { paragraph: 1, offset: 6 });
    const restoredReply = threads.find((c) => c.parentId);
    assert.equal(restoredReply?.text, "Agreed, shortening it now.");

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "selection-gated-authoring",
        "anchored-comment-and-highlight",
        "panel-lists-thread",
        "reply-parent-context",
        "resolve-reopen",
        "comment-navigation",
        "delete-undo-thread",
        "readonly-blocks-authoring",
        "docx-comments-roundtrip",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} comment layouts in ${engine}: authoring, anchoring/highlight, panel, reply threading, resolve/reopen, navigation, delete/undo, read-only and DOCX round-trip.`,
  );
} finally {
  await browser.close();
}
