#!/usr/bin/env node
/** Real Font controls, inherited values, partial ranges, typing and DOCX resets. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit, expect } from "@playwright/test";
import JSZip from "jszip";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ??
    `debug_artifacts/ribbon-inherited-formatting-${engine}`,
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
async function seed(page, caret = false) {
  await page.evaluate(async (caret) => {
    const { getDocumentParagraphs, paragraphOffsetToPosition } =
      await import("/src/core/model.ts");
    const c = window.ribbonReference.client;
    await c.import.html("<p>before target after</p>");
    const d = c.document.get(),
      p = getDocumentParagraphs(d)[0];
    p.style = { styleId: "InheritedNote" };
    p.runs[0].styles = {
      styleId: "EmphasisNote",
      link: "https://example.com/destination",
    };
    d.styles = {
      ...d.styles,
      InheritedNote: {
        id: "InheritedNote",
        name: "Inherited note",
        type: "paragraph",
        textStyle: { bold: true, underline: true, underlineStyle: "double" },
      },
      EmphasisNote: {
        id: "EmphasisNote",
        name: "Emphasis note",
        type: "character",
        textStyle: { italic: true },
      },
    };
    c.document.load(d);
    c.selection.set({
      anchor: paragraphOffsetToPosition(p, 7),
      focus: paragraphOffsetToPosition(p, caret ? 7 : 13),
    });
    c.history.clear();
    c.document.markClean();
  }, caret);
  return snapshot(page);
}
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
      text: c.query.getText(),
      chars: p.runs.flatMap((r) => {
        const e = resolveEffectiveTextStyleForParagraph(
          r.styles,
          p.style?.styleId,
          d.styles,
        );
        return [...r.text].map((char) => ({
          char,
          bold: e.bold,
          italic: e.italic,
          underline: e.underline,
          variant: e.underline ? (e.underlineStyle ?? "single") : null,
          link: r.styles?.link,
        }));
      }),
      selection: {
        anchor: positionToParagraphOffset(p, s.anchor),
        focus: positionToParagraphOffset(p, s.focus),
      },
      version: c.document.version(),
      undo: c.history.canUndo(),
      redo: c.history.canRedo(),
      active: {
        bold: c.commands.state("bold").isActive,
        italic: c.commands.state("italic").isActive,
        underline: c.commands.state("underline").isActive,
      },
    };
  });
}
function changed(value, before, mode) {
  assert.equal(value.text, before.text);
  assert.deepEqual(value.chars.slice(0, 7), before.chars.slice(0, 7));
  assert.deepEqual(value.chars.slice(13), before.chars.slice(13));
  for (const c of value.chars.slice(7, 13)) {
    assert.equal(c.link, "https://example.com/destination");
    if (mode === "single") {
      assert.equal(c.underline, true);
      assert.equal(c.variant, "single");
    } else {
      assert.equal(c[mode], false);
    }
  }
}
async function apply(page, mode) {
  if (mode === "single") {
    await click(page, "underline-dropdown");
    await page.getByTestId("editor-toolbar-underline-style-single").click();
  } else await click(page, mode);
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
        for (const mode of ["bold", "italic", "underline", "single"]) {
          const before = await seed(page);
          assert.deepEqual(before.active, {
            bold: true,
            italic: true,
            underline: true,
          });
          await apply(page, mode);
          const after = await snapshot(page);
          changed(after, before, mode);
          assert.deepEqual(after.selection, before.selection);
          if (mode !== "single") assert.equal(after.active[mode], false);
          await click(page, "undo", "history");
          assert.deepEqual((await snapshot(page)).chars, before.chars);
          assert.equal((await snapshot(page)).undo, false);
          await click(page, "redo", "history");
          changed(await snapshot(page), before, mode);
          const exported = await page.evaluate(async () => {
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
          changed(await snapshot(page), before, mode);
          const zip = await JSZip.loadAsync(new Uint8Array(exported));
          const xml = await zip.file("word/document.xml").async("string");
          const mark =
            mode === "bold"
              ? '<w:b w:val="0"/>'
              : mode === "italic"
                ? '<w:i w:val="0"/>'
                : `<w:u w:val="${mode === "single" ? "single" : "none"}"/>`;
          assert.ok(xml.includes(mark), "Missing explicit DOCX reset");
          await writeFile(
            resolve(output, `${theme}-${locale}-${width}-${mode}.docx`),
            new Uint8Array(exported),
          );
          records.push({
            sha,
            dirty,
            engine,
            theme,
            locale,
            width,
            mode,
            checks: [
              "effective-inherited-state",
              "partial-target-only",
              "selection-and-link-preservation",
              "first-click-off-or-single",
              "one-step-undo-redo",
              "DOCX-reset-XML",
              "self-reimport",
            ],
            unverified: ["Word-open/repair", "PDF", "VoiceOver/actual Safari"],
          });
        }
        for (const mode of ["bold", "single"]) {
          const before = await seed(page, true);
          await apply(page, mode);
          assert.equal((await snapshot(page)).version, before.version);
          assert.equal((await snapshot(page)).undo, false);
          await expect(page.getByTestId("editor-input")).toBeFocused();
          await page.keyboard.type("typed");
          const typed = await snapshot(page);
          assert.equal(typed.text, "before typedtarget after");
          for (const c of typed.chars.slice(7, 12)) {
            if (mode === "bold") assert.equal(c.bold, false);
            else {
              assert.equal(c.underline, true);
              assert.equal(c.variant, "single");
            }
          }
          assert.deepEqual(typed.chars.slice(12), before.chars.slice(7));
          await click(page, "undo", "history");
          assert.equal((await snapshot(page)).text, before.text);
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} inherited Font workflows in ${engine}, plus 16 caret typing paths: original ranges, explicit off/single, undo and DOCX self-reimport.`,
  );
} finally {
  await browser.close();
}
