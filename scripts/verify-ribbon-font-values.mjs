#!/usr/bin/env node
/** Mixed Font fields, point-valued HTML, invalid commands and read-only state. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-font-values-${engine}`,
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
async function snapshot(page) {
  return page.evaluate(async () => {
    const {
      getDocumentParagraphs,
      resolveEffectiveTextStyleForParagraph,
      positionToParagraphOffset,
    } = await import("/src/core/model.ts");
    const c = window.ribbonReference.client,
      d = c.document.get(),
      p = getDocumentParagraphs(d)[0],
      s = c.selection.get();
    return {
      chars: p.runs.flatMap((r) => {
        const e = resolveEffectiveTextStyleForParagraph(
          r.styles,
          p.style?.styleId,
          d.styles,
        );
        return [...r.text].map((char) => ({
          char,
          size: e.fontSize,
          family: e.fontFamily,
          link: r.styles?.link,
        }));
      }),
      selection: {
        anchor: positionToParagraphOffset(p, s.anchor),
        focus: positionToParagraphOffset(p, s.focus),
      },
      version: c.document.version(),
      dirty: c.document.isDirty(),
      undo: c.history.canUndo(),
      redo: c.history.canRedo(),
      size: c.commands.state("setFontSize").value,
      family: c.commands.state("setFontFamily").value,
    };
  });
}
async function field(page, id) {
  const control = page.locator(`[data-testid="editor-toolbar-${id}"]:visible`);
  if (!(await control.isVisible()))
    await page.getByTestId("editor-ribbon-group-font").click();
  return control;
}
function applied(actual, before, docx = false) {
  // DOCX stores a font name, not a CSS fallback list; import adds its generic family.
  if (docx) {
    const primary = (value) => ({
      ...value,
      chars: value.chars.map((char) => ({
        ...char,
        family: char.family
          ?.split(",")[0]
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      })),
    });
    actual = primary(actual);
    before = primary(before);
  }
  assert.deepEqual(actual.chars.slice(0, 7), before.chars.slice(0, 7));
  assert.deepEqual(actual.chars.slice(19), before.chars.slice(19));
  for (const char of actual.chars.slice(7, 19)) {
    assert.ok(Math.abs(char.size - 64 / 3) < 0.001);
    assert.equal(char.family, "Arial");
    assert.equal(char.link, "https://example.com/target");
  }
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
        const measuredWidth = await page
          .locator(".oasis-editor-toolbar-view-ribbon")
          .evaluate((el) => el.getBoundingClientRect().width);
        assert.ok(
          Math.abs(measuredWidth - width) < 1,
          "Reference width mismatch",
        );
        await page.evaluate(async () => {
          const { getDocumentParagraphs, paragraphOffsetToPosition } =
            await import("/src/core/model.ts");
          const c = window.ribbonReference.client;
          await c.import.html(
            '<p style="font-family:Arial;font-size:12pt">before <a href="https://example.com/target"><span style="font-size:10.5pt">first </span><span style="font-size:18pt;font-family:Georgia">second</span></a> after</p>',
          );
          const p = getDocumentParagraphs(c.document.get())[0];
          c.selection.set({
            anchor: paragraphOffsetToPosition(p, 7),
            focus: paragraphOffsetToPosition(p, 19),
          });
          c.history.clear();
          c.document.markClean();
        });
        const before = await snapshot(page);
        assert.equal(before.size, "");
        assert.equal(before.family, "");
        assert.equal(before.chars[7].size, 14);
        assert.equal(before.chars[13].size, 24);
        assert.equal(await (await field(page, "font-size")).inputValue(), "");
        assert.equal(await (await field(page, "font-family")).inputValue(), "");
        const invalid = await page.evaluate(() => {
          const c = window.ribbonReference.client;
          return [
            "nonsense",
            -1,
            0,
            "Infinity",
            " ",
            1e308,
            { size: "wrong" },
          ].map((value) => c.commands.execute("setFontSize", value));
        });
        assert.ok(
          invalid.every((result) => result === false),
          "Invalid sizes must report failure",
        );
        assert.deepEqual(
          await snapshot(page),
          before,
          "Invalid input changed model/history/selection",
        );
        await (await field(page, "font-size")).selectOption("16");
        const sized = await snapshot(page);
        assert.equal(sized.size, "16");
        assert.equal(sized.family, "");
        assert.deepEqual(sized.selection, before.selection);
        await (await field(page, "font-family")).selectOption("Arial");
        const after = await snapshot(page);
        applied(after, before);
        assert.deepEqual(after.selection, before.selection);
        await page.evaluate(() => window.ribbonReference.client.history.undo());
        assert.deepEqual((await snapshot(page)).chars, sized.chars);
        await page.evaluate(() => window.ribbonReference.client.history.undo());
        assert.deepEqual((await snapshot(page)).chars, before.chars);
        assert.equal((await snapshot(page)).undo, false);
        await page.evaluate(() => {
          const c = window.ribbonReference.client;
          c.history.redo();
          c.history.redo();
        });
        applied(await snapshot(page), before);
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(true),
        );
        for (const id of ["font-size", "font-family"])
          assert.equal(await (await field(page, id)).isDisabled(), true);
        const readOnly = await snapshot(page);
        await assert.rejects(
          page.evaluate(() =>
            window.ribbonReference.client.commands.execute("setFontSize", 24),
          ),
          /Command disabled: setFontSize/,
        );
        assert.deepEqual(await snapshot(page), readOnly);
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(false),
        );
        for (const id of ["font-size", "font-family"])
          assert.equal(await (await field(page, id)).isEnabled(), true);
        const bytes = await page.evaluate(async () => {
          const c = window.ribbonReference.client,
            r = await c.io.export({ format: "docx" });
          if (!r.ok) throw new Error(JSON.stringify(r.error));
          const bytes = [...new Uint8Array(await r.value.blob.arrayBuffer())];
          const loaded = await c.io.import({
            format: "docx",
            data: r.value.blob,
          });
          if (!loaded.ok) throw new Error(JSON.stringify(loaded.error));
          return bytes;
        });
        applied(await snapshot(page), before, true);
        assert.deepEqual(errors, []);
        const filename = `${theme}-${locale}-${width}.docx`;
        await writeFile(resolve(output, filename), new Uint8Array(bytes));
        records.push({
          sha,
          dirty,
          engine,
          theme,
          locale,
          width,
          measuredWidth,
          document: filename,
          checks: [
            "point-html-import",
            "mixed-fields",
            "invalid-size-noop",
            "original-multirun-target",
            "links-and-outside-text",
            "size-family-undo-redo",
            "readonly-fields",
            "DOCX-self-reimport",
          ],
        });
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Font value workflows in ${engine}: point HTML, mixed fields, invalid input, selection, read-only, undo/redo and DOCX self-reimport.`,
  );
} finally {
  await browser.close();
}
