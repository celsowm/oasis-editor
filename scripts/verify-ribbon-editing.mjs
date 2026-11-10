#!/usr/bin/env node
/** Actual Ribbon actions, undo boundaries and a DOCX round-trip for D02. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import JSZip from "jszip";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-editing-${engine}`,
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
async function control(page, id, group = "font") {
  const target = page.locator(`[data-testid="editor-toolbar-${id}"]:visible`);
  if (!(await target.isVisible())) {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByTestId(`editor-ribbon-group-${group}`).click();
  }
  return target;
}
async function click(page, id, group) {
  await (await control(page, id, group)).click();
}
async function choose(page, style) {
  await click(page, "underline-dropdown");
  await page.getByTestId(`editor-toolbar-underline-style-${style}`).click();
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs, positionToParagraphOffset } =
      await import("/src/core/model.ts");
    const client = window.ribbonReference.client;
    const paragraphs = getDocumentParagraphs(client.document.get());
    const selection = client.selection.get();
    const position = (pos) => {
      const index = paragraphs.findIndex((p) => p.id === pos.paragraphId);
      return {
        index,
        offset: positionToParagraphOffset(paragraphs[index], pos),
      };
    };
    return {
      paragraphs: paragraphs.map((p) => ({
        text: p.runs.map((r) => r.text).join(""),
        chars: p.runs.flatMap((r) =>
          [...r.text].map((char) => ({ char, ...r.styles })),
        ),
      })),
      selection: {
        anchor: position(selection.anchor),
        focus: position(selection.focus),
      },
      canUndo: client.history.canUndo(),
      canRedo: client.history.canRedo(),
      version: client.document.version(),
    };
  });
}
function underline(snapshot, style) {
  const chars = snapshot.paragraphs[0].chars;
  assert.equal(snapshot.paragraphs[0].text, "before first second after");
  assert.ok(
    chars
      .slice(7, 19)
      .every((c) =>
        style === null
          ? !c.underline && c.underlineStyle == null
          : c.underline === true &&
            (style === "single"
              ? c.underlineStyle == null
              : c.underlineStyle === style),
      ),
  );
  assert.equal(chars[7].bold, true);
  assert.equal(chars[13].italic, true);
  assert.ok(
    chars
      .slice(0, 7)
      .concat(chars.slice(19))
      .every((c) => !c.underline),
  );
}
try {
  for (const theme of ["light", "dark"])
    for (const locale of ["en", "pt-BR"])
      for (const width of [1440, 640]) {
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
        await page.evaluate(async () => {
          const { getDocumentParagraphs, paragraphOffsetToPosition } =
            await import("/src/core/model.ts");
          const c = window.ribbonReference.client;
          await c.import.html(
            "<p>before <strong>first</strong><em> second</em> after</p><p>Untouched.</p>",
          );
          const p = getDocumentParagraphs(c.document.get())[0];
          c.selection.set({
            anchor: paragraphOffsetToPosition(p, 7),
            focus: paragraphOffsetToPosition(p, 19),
          });
          c.history.clear();
          c.document.markClean();
        });
        const initial = await snapshot(page);
        await choose(page, "double");
        const double = await snapshot(page);
        underline(double, "double");
        assert.deepEqual(
          double.selection,
          initial.selection,
          "Menu changed target selection",
        );
        await click(page, "undo", "history");
        const undone = await snapshot(page);
        assert.deepEqual(
          undone.paragraphs,
          initial.paragraphs,
          "One undo did not restore original formatting",
        );
        assert.equal(
          undone.canUndo,
          false,
          "Choosing a variant created multiple history steps",
        );
        await click(page, "redo", "history");
        assert.deepEqual((await snapshot(page)).paragraphs, double.paragraphs);
        await choose(page, "single");
        underline(await snapshot(page), "single");
        await click(page, "undo", "history");
        assert.deepEqual((await snapshot(page)).paragraphs, double.paragraphs);
        await click(page, "underline-dropdown");
        await page.getByTestId("editor-toolbar-underline-remove").click();
        underline(await snapshot(page), null);
        await click(page, "undo", "history");
        assert.deepEqual(
          (await snapshot(page)).paragraphs,
          double.paragraphs,
          "Removing underline needs one undo",
        );
        await page.evaluate(() =>
          window.ribbonReference.client.commands.execute("wordUnderline"),
        );
        underline(await snapshot(page), "words");
        await click(page, "undo", "history");
        assert.deepEqual((await snapshot(page)).paragraphs, double.paragraphs);
        await page.evaluate(() =>
          window.ribbonReference.client.commands.execute("doubleUnderline"),
        );
        underline(await snapshot(page), null);
        await click(page, "undo", "history");
        assert.deepEqual((await snapshot(page)).paragraphs, double.paragraphs);
        const roundTrip = await page.evaluate(async () => {
          const c = window.ribbonReference.client;
          const exported = await c.io.export({ format: "docx" });
          if (!exported.ok) throw new Error(JSON.stringify(exported.error));
          const bytes = [
            ...new Uint8Array(await exported.value.blob.arrayBuffer()),
          ];
          const imported = await c.io.import({
            format: "docx",
            data: exported.value.blob,
          });
          if (!imported.ok) throw new Error(JSON.stringify(imported.error));
          return { bytes, warnings: imported.warnings };
        });
        underline(await snapshot(page), "double");
        const archive = await JSZip.loadAsync(new Uint8Array(roundTrip.bytes));
        const documentXml = await archive
          .file("word/document.xml")
          .async("string");
        assert.match(documentXml, /<w:u\b[^>]*w:val="double"/);
        assert.deepEqual(
          (await snapshot(page)).paragraphs.map((p) => p.text),
          initial.paragraphs.map((p) => p.text),
        );
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(true),
        );
        assert.equal(
          await (await control(page, "underline")).isDisabled(),
          true,
          "Read-only underline main remained enabled",
        );
        assert.equal(
          await page
            .locator(
              '[data-testid="editor-toolbar-underline-dropdown"]:visible',
            )
            .isDisabled(),
          true,
          "Read-only underline menu remained enabled",
        );
        assert.deepEqual(errors, []);
        const filename = `${theme}-${locale}-${width}.docx`;
        await writeFile(
          resolve(output, filename),
          new Uint8Array(roundTrip.bytes),
        );
        records.push({
          sha,
          dirty,
          engine,
          theme,
          locale,
          width,
          selection: double.selection,
          document: filename,
          importWarnings: roundTrip.warnings,
          checks: [
            "multirun-target",
            "variant-apply",
            "single-variant-replacement",
            "one-step-undo-redo",
            "remove-one-step-undo",
            "convenience-command-variant-and-toggle",
            "docx-reimport",
            "docx-underline-markup",
            "readonly-controls",
          ],
        });
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} underline editing workflows in ${engine}: original target, atomic undo/redo, DOCX reimport and read-only state.`,
  );
} finally {
  await browser.close();
}
