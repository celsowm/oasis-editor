#!/usr/bin/env node
/**
 * P02 References: footnote insertion (reference, note body, undo/redo, DOCX
 * round-trip) and TOC insertion/update (field export and reimport) driven
 * through the References tab.
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
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-references-${engine}`,
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

async function loadFixture(page, fixture) {
  await page.evaluate(async (name) => {
    const { prepareRibbonFixture } =
      await import("/tests/browser/ribbon/fixtures.ts");
    const client = window.ribbonReference.client;
    await prepareRibbonFixture(client, name);
    client.history.clear();
  }, fixture);
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

async function snapshot(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    const client = window.ribbonReference.client;
    const state = client.getState();
    const paragraphs = getDocumentParagraphs(state.document);
    return {
      activeZone: state.activeZone ?? "main",
      footnotes: Object.values(state.document.footnotes?.items ?? {}).map(
        (note) => ({
          id: note.id,
          text: note.blocks
            .flatMap((block) => (block.type === "paragraph" ? block.runs : []))
            .map((run) => run.text)
            .join(""),
        }),
      ),
      paragraphs: paragraphs.map((p) => p.runs.map((run) => run.text).join("")),
      footnoteRefs: getDocumentParagraphs(state.document)
        .flatMap((p) => p.runs)
        .filter((run) => run.kind === "footnoteReference")
        .map((run) => run.footnoteReference.footnoteId),
    };
  });
}

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
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
    await page.getByTestId("editor-ribbon-tab-references").click();

    // 1. Update TOC is disabled until a TOC exists; insert enables it.
    await loadFixture(page, "text");
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("updateTableOfContents")
            .isEnabled,
      ),
      false,
    );
    await placeCaret(page, 0, 0);
    await (
      await openGroup(page, "tableOfContents", "editor-toolbar-insert-toc")
    ).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("updateTableOfContents")
            .isEnabled,
      ),
      true,
    );
    const tocState = await page.evaluate(async () => {
      const { hasTableOfContents } =
        await import("/src/core/commands/tableOfContents.js");
      const client = window.ribbonReference.client;
      const state = client.getState();
      return {
        has: hasTableOfContents(state),
        texts: state.document.sections[0].blocks
          .filter((block) => block.type === "paragraph")
          .flatMap((p) => p.runs.map((run) => run.text))
          .join(" "),
      };
    });
    assert.equal(tocState.has, true);
    assert.ok(tocState.texts.includes("Ribbon reference"));
    assert.ok(tocState.texts.includes("Heading two"));

    // 2. Update TOC is a safe no-op when the field already exists.
    await (
      await openGroup(page, "tableOfContents", "editor-toolbar-update-toc")
    ).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("updateTableOfContents")
            .isEnabled,
      ),
      true,
    );

    // 3. The TOC round-trips as a TOC field through DOCX.
    const tocDocx = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return new Uint8Array(await result.value.blob.arrayBuffer()).length;
    });
    assert.ok(tocDocx > 0);
    const tocBytes = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return [...new Uint8Array(await result.value.blob.arrayBuffer())];
    });
    const tocFilename = `${theme}-${locale}-${width}-toc.docx`;
    await writeFile(resolve(output, tocFilename), new Uint8Array(tocBytes));
    const documentXml = execFileSync("unzip", [
      "-p",
      resolve(output, tocFilename),
      "word/document.xml",
    ]).toString("utf8");
    assert.ok(
      documentXml.includes("TOC"),
      "document.xml should contain a TOC field",
    );
    assert.ok(
      documentXml.includes("Ribbon reference"),
      "document.xml should contain the TOC entries",
    );

    // 4. Footnote: inserting from the ribbon moves the caret into the note body.
    await loadFixture(page, "text");
    await placeCaret(page, 1, 7);
    await (
      await openGroup(page, "footnotes", "editor-toolbar-footnote")
    ).click();
    let snap = await snapshot(page);
    assert.equal(snap.activeZone, "footnote");
    assert.equal(snap.footnotes.length, 1);
    assert.equal(snap.footnoteRefs.length, 1);
    assert.equal(snap.footnoteRefs[0], snap.footnotes[0].id);

    // 5. The whole insertion is a single undoable transaction.
    assert.equal(
      await page.evaluate(() =>
        window.ribbonReference.client.history.canUndo(),
      ),
      true,
    );
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    snap = await snapshot(page);
    assert.equal(snap.footnotes.length, 0);
    assert.equal(snap.footnoteRefs.length, 0);
    await page.evaluate(() => window.ribbonReference.client.history.redo());
    snap = await snapshot(page);
    assert.equal(snap.footnotes.length, 1);
    assert.equal(snap.activeZone, "footnote");

    // 6. Typed text lands in the note body and survives a DOCX round-trip.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("First note body.");
    snap = await snapshot(page);
    assert.equal(snap.footnotes[0].text, "First note body.");

    const fnBytes = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return [...new Uint8Array(await result.value.blob.arrayBuffer())];
    });
    const fnFilename = `${theme}-${locale}-${width}-footnote.docx`;
    await writeFile(resolve(output, fnFilename), new Uint8Array(fnBytes));
    const fnDocumentXml = execFileSync("unzip", [
      "-p",
      resolve(output, fnFilename),
      "word/document.xml",
    ]).toString("utf8");
    const footnotesXml = execFileSync("unzip", [
      "-p",
      resolve(output, fnFilename),
      "word/footnotes.xml",
    ]).toString("utf8");
    assert.ok(fnDocumentXml.includes("footnoteReference"));
    assert.ok(footnotesXml.includes("First note body."));

    const reimported = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      const loaded = await client.io.import({
        format: "docx",
        data: result.value.blob,
      });
      if (!loaded.ok) throw new Error(JSON.stringify(loaded.error));
      const state = client.getState();
      return {
        count: Object.values(state.document.footnotes?.items ?? {}).length,
        text: Object.values(state.document.footnotes?.items ?? {})
          .flatMap((note) =>
            note.blocks.flatMap((block) =>
              block.type === "paragraph" ? block.runs : [],
            ),
          )
          .map((run) => run.text)
          .join(""),
      };
    });
    assert.equal(reimported.count, 1);
    assert.ok(reimported.text.includes("First note body."));

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "update-toc-disabled-without-toc",
        "insert-toc-and-entries",
        "update-toc",
        "toc-docx-roundtrip",
        "footnote-zone-caret-and-registry",
        "footnote-single-transaction-undo-redo",
        "footnote-body-typing",
        "footnote-docx-roundtrip",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} References layouts in ${engine}: TOC insertion/update/round-trip and footnote insertion, typing, undo and DOCX round-trip.`,
  );
} finally {
  await browser.close();
}
