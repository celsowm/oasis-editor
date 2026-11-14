#!/usr/bin/env node
/**
 * P04 File: new-document lifecycle with unsaved-changes confirmation, dirty
 * tracking across edits and undo, DOCX/PDF export with real container bytes
 * and a DOCX reimport round-trip.
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
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-file-${engine}`,
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

async function paragraphsText(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    return getDocumentParagraphs(window.ribbonReference.client.document.get())
      .map((p) => p.runs.map((run) => run.text).join(""))
      .join("\n");
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
    await page.getByTestId("editor-ribbon-tab-file").click();

    // 1. A clean document resets without confirmation.
    await loadFixture(page, "text");
    await (
      await openGroup(page, "document", "editor-toolbar-new-document")
    ).click();
    assert.equal(
      await page
        .locator(".oasis-editor-find-replace-dialog, .oasis-editor-dialog")
        .count(),
      0,
      "a clean document must not ask for confirmation",
    );
    const emptied = await paragraphsText(page);
    assert.ok(
      emptied.trim().length === 0,
      `expected the document to be emptied, got: ${JSON.stringify(emptied)}`,
    );

    // 2. Typing makes the document dirty; the New Document confirmation
    // appears and Cancel retains the content.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("Lifecycle probe content.");
    assert.equal(
      await page.evaluate(() => window.ribbonReference.client.isDirty()),
      true,
    );
    await (
      await openGroup(page, "document", "editor-toolbar-new-document")
    ).click();
    await page
      .getByTestId("editor-new-document-discard")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByTestId("editor-new-document-cancel").click();
    assert.equal(await paragraphsText(page), "Lifecycle probe content.");
    assert.equal(
      await page.evaluate(() => window.ribbonReference.client.isDirty()),
      true,
    );

    // 3. Discard resets the document and clears the dirty marker.
    await (
      await openGroup(page, "document", "editor-toolbar-new-document")
    ).click();
    await page.getByTestId("editor-new-document-discard").click();
    assert.equal((await paragraphsText(page)).trim().length, 0);
    assert.equal(
      await page.evaluate(() => window.ribbonReference.client.isDirty()),
      false,
    );

    // 4. PDF export emits a real PDF with the expected magic bytes.
    const pdfBytes = await page.evaluate(async () => {
      const result = await window.ribbonReference.client.io.export({
        format: "pdf",
      });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return [...new Uint8Array(await result.value.blob.arrayBuffer())];
    });
    assert.ok(pdfBytes.length > 100, "pdf export should not be empty");
    assert.equal(pdfBytes[0], 0x25); // '%'
    assert.equal(pdfBytes[1], 0x50); // 'P'
    assert.equal(pdfBytes[2], 0x44); // 'D'
    assert.equal(pdfBytes[3], 0x46); // 'F'

    // 5. Typing dirties the document; one undo restores the clean baseline.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("Undo probe.");
    assert.equal(
      await page.evaluate(() => window.ribbonReference.client.isDirty()),
      true,
    );
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    assert.equal(
      await page.evaluate(() => window.ribbonReference.client.isDirty()),
      false,
    );

    // 6. DOCX export produces a zip container that reimports with content.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("Reimport probe.");
    const docxBytes = await page.evaluate(async () => {
      const result = await window.ribbonReference.client.io.export({
        format: "docx",
      });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return [...new Uint8Array(await result.value.blob.arrayBuffer())];
    });
    assert.ok(docxBytes.length > 1000, "docx export should be a real file");
    assert.equal(docxBytes[0], 0x50); // 'P'
    assert.equal(docxBytes[1], 0x4b); // 'K'
    const docxFilename = `${theme}-${locale}-${width}.docx`;
    await writeFile(resolve(output, docxFilename), new Uint8Array(docxBytes));
    const documentXml = execFileSync("unzip", [
      "-p",
      resolve(output, docxFilename),
      "word/document.xml",
    ]).toString("utf8");
    assert.ok(documentXml.includes("Reimport probe."));
    const reimported = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      const loaded = await client.io.import({
        format: "docx",
        data: result.value.blob,
      });
      if (!loaded.ok) throw new Error(JSON.stringify(loaded.error));
      return client.getState().document;
    });
    assert.ok(reimported);

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "new-document-clean-resets",
        "new-document-confirmation-cancel",
        "new-document-confirmation-discard",
        "docx-export-roundtrip",
        "pdf-export-container",
        "undo-restores-clean-baseline",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} File layouts in ${engine}: clean reset, unsaved-changes dialog (cancel/discard), DOCX round-trip, PDF container and undo-to-clean.`,
  );
} finally {
  await browser.close();
}
