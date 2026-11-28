#!/usr/bin/env node
/** Browser qualification for the extended field-family Ribbon panels. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import {
  createSuite, openGroup, waitForRibbonSettled, writeVerification,
} from "./lib/ribbon-suite.mjs";

// This harness is served with `vite tests/browser/ribbon`, so the page is at
// the root of RIBBON_BASE_URL rather than under /tests/browser/ribbon/.
async function openHarnessPage(browser, base, { theme, locale, width }) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${base}/?theme=${theme}&locale=${locale}`);
  return { page, errors };
}

const { base, engine, output, sha, dirty, records, browser } =
  await createSuite("field-families");
const srcRoot = process.cwd();
async function setCaret(page, index, offset) {
  await page.evaluate(async ([root, paragraphIndex, position]) => {
    const { getDocumentParagraphs, paragraphOffsetToPosition } =
      await import(`/@fs/${root}/src/core/model.ts`);
    const client = window.ribbonReference.client;
    const paragraph = getDocumentParagraphs(client.document.get())[paragraphIndex];
    const pos = paragraphOffsetToPosition(paragraph, position);
    client.selection.set({ anchor: pos, focus: pos });
  }, [srcRoot, index, offset]);
}
async function snapshot(page) {
  return page.evaluate(async root => {
    const { getDocumentParagraphs } = await import(`/@fs/${root}/src/core/model.ts`);
    const client = window.ribbonReference.client;
    const paragraphs = getDocumentParagraphs(client.document.get());
    return {
      texts: paragraphs.map(p => p.runs.map(r => r.text).join("")),
      instructions: paragraphs.flatMap(p => p.runs
        .filter(r => r.kind === "fieldInstruction")
        .map(r => r.fieldInstruction.trim())),
      showFieldCodes: client.getState().showFieldCodes === true,
    };
  }, srcRoot);
}
try {
  for (const { theme, locale, width } of [
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "dark", locale: "en", width: 640 },
  ]) {
    const { page, errors } = await openHarnessPage(browser, base, { theme, locale, width });
    await waitForRibbonReference(page);
    await page.evaluate(async root => {
      const { createEditorDocument, createEditorParagraph } =
        await import(`/@fs/${root}/src/core/editorState.ts`);
      window.ribbonReference.client.document.load(
        createEditorDocument(["Primeiro", "Segundo", "Terceiro"].map(createEditorParagraph)),
      );
      window.ribbonReference.client.history.clear();
    }, srcRoot);
    await page.getByTestId("editor-ribbon-tab-references").click();
    await setCaret(page, 0, 8);
    await waitForRibbonSettled(page);

    // Insert a raw field code through the panel.
    await (await openGroup(page, "fields", "editor-toolbar-insert-field-code")).click();
    const insertPanel = page.getByTestId("editor-field-panel-insert-code");
    await insertPanel.waitFor({ state: "visible" });
    assert.equal(await insertPanel.getByTestId("editor-field-confirm-insert-code").isDisabled(), true);
    await insertPanel.getByTestId("editor-field-code").fill(" PAGE ");
    await insertPanel.getByTestId("editor-field-confirm-insert-code").click();
    await insertPanel.waitFor({ state: "hidden" });
    assert.ok((await snapshot(page)).instructions.includes("PAGE"));

    // Edit the field under the caret through the selection-only command.
    await setCaret(page, 0, 8);
    const edited = await page.evaluate(() =>
      window.ribbonReference.client.commands.execute("editFieldCodeAtSelection", " NUMPAGES "));
    assert.equal(edited, true);
    assert.ok((await snapshot(page)).instructions.includes("NUMPAGES"));

    // Toggle field-code painting from the Ribbon.
    await (await openGroup(page, "fields", "editor-toolbar-show-field-codes")).click();
    assert.equal((await snapshot(page)).showFieldCodes, true);

    // Mark a TA authority through its panel.
    await setCaret(page, 2, 9);
    await waitForRibbonSettled(page);
    await (await openGroup(page, "fields", "editor-toolbar-mark-authority")).click();
    const authorityPanel = page.getByTestId("editor-field-panel-authority");
    await authorityPanel.waitFor({ state: "visible" });
    await authorityPanel.getByTestId("editor-authority-long").fill("Barber v. Alboni");
    await authorityPanel.getByTestId("editor-field-confirm-authority").click();
    await authorityPanel.waitFor({ state: "hidden" });
    assert.ok((await snapshot(page)).instructions.some(i => i.startsWith('TA \\l "Barber')));

    // DOCX round-trip preserves the newly authored raw instructions.
    const before = await snapshot(page);
    const bytes = await page.evaluate(async () => {
      const c = window.ribbonReference.client;
      const result = await c.io.export({ format: "docx" });
      if (!result.ok) throw Error(JSON.stringify(result.error));
      const blob = result.value.blob;
      const opened = await c.io.import({ format: "docx", data: blob });
      if (!opened.ok) throw Error(JSON.stringify(opened.error));
      return [...new Uint8Array(await blob.arrayBuffer())];
    });
    await (await import("node:fs/promises")).writeFile(
      resolve(output, `${theme}-${width}-fields.docx`), new Uint8Array(bytes));
    const after = await snapshot(page);
    assert.deepEqual(after.instructions, before.instructions);
    assert.deepEqual(errors, []);
    records.push({ sha, dirty, engine, theme, locale, width,
      checks: ["insert-code-panel", "edit-code-at-selection", "show-field-codes", "authority-panel", "docx-roundtrip"] });
    await page.close();
  }
  await writeVerification(output, records);
  console.log(`Verified extended field families in ${records.length} Ribbon layouts.`);
} finally {
  await browser.close();
}
