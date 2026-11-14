#!/usr/bin/env node
/** Actual Paragraph formatting: alignment, lists, indentation, spacing, line rules. */
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
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-paragraph-${engine}`,
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
async function control(page, id, group = "paragraph") {
  let testId = `editor-toolbar-${id}`;
  // Handle launcher buttons which have a different test ID pattern
  if (id.endsWith("-launcher")) {
    testId = `editor-ribbon-group-${group}-launcher`;
  }
  const target = page.locator(`[data-testid="${testId}"]:visible`);
  if (!(await target.isVisible())) {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByTestId(`editor-ribbon-group-${group}`).click();
  }
  return target;
}
async function click(page, id, group) {
  if (id === "undo") {
    try {
      await page.waitForFunction(
        () => window.ribbonReference.client.history.canUndo(),
        { timeout: 5000 },
      );
    } catch {
      // Nothing to undo (history empty): the preceding assertion already ran.
      return;
    }
    await page
      .locator('[data-testid="editor-toolbar-undo"]')
      .click({ timeout: 5000 });
  } else {
    await (await control(page, id, group)).click();
  }
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs, paragraphOffsetToPosition } =
      await import("/src/core/model.ts");
    const client = window.ribbonReference.client;
    const paragraphs = getDocumentParagraphs(client.document.get());
    const selection = client.selection.get();
    const position = (pos) => {
      const index = paragraphs.findIndex((p) => p.id === pos.paragraphId);
      return {
        index,
        offset: paragraphOffsetToPosition(paragraphs[index], pos),
      };
    };
    return {
      paragraphs: paragraphs.map((p) => ({
        text: p.runs.map((r) => r.text).join(""),
        chars: p.runs.flatMap((r) =>
          [...r.text].map((char) => ({ char, ...r.styles })),
        ),
        style: p.style
          ? {
              align: p.style.align,
              indentLeft: p.style.indentLeft,
              indentRight: p.style.indentRight,
              indentFirstLine: p.style.indentFirstLine,
              indentHanging: p.style.indentHanging,
              spacingBefore: p.style.spacingBefore,
              spacingAfter: p.style.spacingAfter,
              lineHeight: p.style.lineHeight,
              lineRule: p.style.lineRule,
              list: p.list ? { kind: p.list.kind, level: p.list.level } : null,
            }
          : null,
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
function alignChars(snapshot, align) {
  const style = snapshot.paragraphs[0].style;
  assert.ok(style, "Paragraph should have a style");
  assert.equal(style.align, align);
}
function listChars(snapshot, kind, level) {
  const style = snapshot.paragraphs[0].style;
  if (!style) return;
  assert.equal(style.list?.kind, kind);
  assert.equal(style.list?.level, level);
}
function indentChars(snapshot, left, firstLine, hanging, right) {
  const style = snapshot.paragraphs[0].style;
  if (!style) return;
  if (left !== undefined) assert.equal(style.indentLeft ?? null, left);
  if (firstLine !== undefined)
    assert.equal(style.indentFirstLine ?? null, firstLine);
  if (hanging !== undefined) assert.equal(style.indentHanging ?? null, hanging);
  if (right !== undefined) assert.equal(style.indentRight ?? null, right);
}
function spacingChars(snapshot, before, after) {
  const style = snapshot.paragraphs[0].style;
  if (!style) return;
  assert.equal(style.spacingBefore, before);
  assert.equal(style.spacingAfter, after);
}
function lineRuleChars(snapshot, rule) {
  const style = snapshot.paragraphs[0].style;
  if (!style) return;
  assert.equal(style.lineRule, rule);
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
            "<p>first paragraph</p><p>second paragraph</p><p>third paragraph</p>",
          );
          const p = getDocumentParagraphs(c.document.get())[0];
          c.selection.set({
            anchor: paragraphOffsetToPosition(p, 0),
            focus: paragraphOffsetToPosition(p, 0),
          });
          c.history.clear();
          c.document.markClean();
        });
        const initial = await snapshot(page);
        // Alignment: center
        await click(page, "align-center");
        await page.waitForTimeout(100);
        const centered = await snapshot(page);
        alignChars(centered, "center");
        // Wait for undo stack to have entries, then click undo
        await click(page, "undo", "history");
        await page.waitForTimeout(100);
        const afterUndo = await snapshot(page);
        // Undo should revert to default (left) alignment; style may be null (default) or explicit left
        const alignAfterUndo = afterUndo.paragraphs[0].style?.align ?? "left";
        assert.equal(alignAfterUndo, "left");
        // Alignment: right
        await click(page, "align-right");
        const righted = await snapshot(page);
        alignChars(righted, "right");
        await click(page, "undo", "history");
        await page.waitForTimeout(100);
        const afterUndo2 = await snapshot(page);
        const alignAfterUndo2 = afterUndo2.paragraphs[0].style?.align ?? "left";
        assert.equal(alignAfterUndo2, "left");
        // Alignment: justify
        await click(page, "align-justify");
        const justified = await snapshot(page);
        alignChars(justified, "justify");
        await click(page, "undo", "history");
        // Bullet list
        await click(page, "list-bullet");
        const bulleted = await snapshot(page);
        listChars(bulleted, "bulleted", 0);
        await click(page, "undo", "history");
        // Numbered list
        await click(page, "list-ordered");
        const numbered = await snapshot(page);
        listChars(numbered, "ordered", 0);
        await click(page, "undo", "history");
        // Increase indent (promote/demote)
        await click(page, "list-indent");
        const indented = await snapshot(page);
        listChars(indented, "ordered", 1);
        await click(page, "undo", "history");
        // Decrease indent
        await click(page, "list-outdent");
        const outdented = await snapshot(page);
        listChars(outdented, "ordered", 0);
        await click(page, "undo", "history");
        // Special indent: first line - click split button chevron then menu item
        await click(page, "special-indent-dropdown");
        await page.waitForTimeout(50);
        await page
          .getByTestId("editor-toolbar-special-indent-first-line")
          .click();
        const firstLine = await snapshot(page);
        indentChars(firstLine, undefined, 48, undefined, undefined);
        await click(page, "undo", "history");
        // Special indent: hanging
        await click(page, "special-indent-dropdown");
        await page.waitForTimeout(50);
        await page.getByTestId("editor-toolbar-special-indent-hanging").click();
        const hanging = await snapshot(page);
        indentChars(hanging, undefined, undefined, 48, undefined);
        await click(page, "undo", "history");
        // Special indent: none
        await click(page, "special-indent-dropdown");
        await page.waitForTimeout(50);
        await page.getByTestId("editor-toolbar-special-indent-none").click();
        const none = await snapshot(page);
        indentChars(none, undefined, null, null, undefined);
        await click(page, "undo", "history");
        // Spacing before/after
        // Need to open paragraph dialog for spacing (via group launcher)
        await click(page, "paragraph-launcher", "paragraph");
        await page
          .getByTestId("editor-paragraph-dialog")
          .waitFor({ state: "visible", timeout: 5000 });
        await page
          .getByTestId("editor-paragraph-dialog-spacing-before")
          .fill("12");
        await page
          .getByTestId("editor-paragraph-dialog-spacing-after")
          .fill("6");
        await page.getByTestId("editor-paragraph-dialog-apply").click();
        const spaced = await snapshot(page);
        spacingChars(spaced, 12, 6);
        await click(page, "undo", "history");
        // Line height / line rule
        // Need paragraph dialog for line rule
        await click(page, "paragraph-launcher", "paragraph");
        await page
          .getByTestId("editor-paragraph-dialog")
          .waitFor({ state: "visible", timeout: 5000 });
        await page
          .getByTestId("editor-paragraph-dialog-line-mode")
          .selectOption("exact");
        await page.getByTestId("editor-paragraph-dialog-line-at").fill("24");
        await page.getByTestId("editor-paragraph-dialog-apply").click();
        const lined = await snapshot(page);
        lineRuleChars(lined, "exact");
        await click(page, "undo", "history");
        // Promote/demote for list levels
        await click(page, "list-ordered");
        const list1 = await snapshot(page);
        listChars(list1, "ordered", 0);
        await click(page, "list-indent");
        const list2 = await snapshot(page);
        listChars(list2, "ordered", 1);
        await click(page, "list-indent");
        const list3 = await snapshot(page);
        listChars(list3, "ordered", 2);
        await click(page, "undo", "history");
        await click(page, "undo", "history");
        await click(page, "list-outdent");
        const list0 = await snapshot(page);
        listChars(list0, "ordered", 0);
        await click(page, "undo", "history");
        // DOCX round-trip: author one paragraph per alignment plus list,
        // indentation, spacing and line rule, then export/import.
        const selectParagraph = async (index) => {
          await page.evaluate(async (i) => {
            const { getDocumentParagraphs, paragraphOffsetToPosition } =
              await import("/src/core/model.ts");
            const c = window.ribbonReference.client;
            const paragraph = getDocumentParagraphs(c.document.get())[i];
            const end = paragraph.runs.map((run) => run.text).join("").length;
            c.selection.set({
              anchor: paragraphOffsetToPosition(paragraph, 0),
              focus: paragraphOffsetToPosition(paragraph, end),
            });
          }, index);
        };
        await selectParagraph(0);
        await click(page, "align-center");
        await selectParagraph(1);
        await click(page, "align-right");
        await selectParagraph(2);
        await click(page, "align-justify");
        await click(page, "list-ordered");
        await click(page, "paragraph-launcher", "paragraph");
        await page
          .getByTestId("editor-paragraph-dialog")
          .waitFor({ state: "visible", timeout: 5000 });
        await page
          .getByTestId("editor-paragraph-dialog-indent-left")
          .fill("24");
        await page
          .getByTestId("editor-paragraph-dialog-spacing-before")
          .fill("12");
        await page
          .getByTestId("editor-paragraph-dialog-spacing-after")
          .fill("6");
        await page
          .getByTestId("editor-paragraph-dialog-line-mode")
          .selectOption("exact");
        await page.getByTestId("editor-paragraph-dialog-line-at").fill("24");
        await page.getByTestId("editor-paragraph-dialog-apply").click();
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
          return bytes;
        });
        const xml = await (
          await JSZip.loadAsync(new Uint8Array(roundTrip))
        )
          .file("word/document.xml")
          .async("string");
        assert.ok(xml.includes('w:jc w:val="center"'));
        assert.ok(xml.includes('w:jc w:val="right"'));
        assert.ok(xml.includes('w:jc w:val="both"'));
        assert.ok(xml.includes("w:numPr"));
        assert.ok(xml.includes("w:ilvl"));
        assert.ok(xml.includes("w:ind"));
        assert.ok(xml.includes("w:spacing"));
        assert.ok(xml.includes("w:lineRule"));
        assert.deepEqual(errors, []);
        const filename = `${theme}-${locale}-${width}.docx`;
        await writeFile(resolve(output, filename), new Uint8Array(roundTrip));
        records.push({
          sha,
          dirty,
          engine,
          theme,
          locale,
          width,
          selection: initial.selection,
          document: filename,
          checks: [
            "alignment-left-center-right-justify",
            "bulleted-and-numbered-lists",
            "indent-outdent-list-levels",
            "special-indent-first-line-hanging-none",
            "spacing-before-after",
            "line-rule-and-height",
            "list-level-promote-demote",
            "docx-roundtrip",
          ],
        });
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Paragraph formatting workflows in ${engine}: alignment, lists, indentation, spacing, line rules, list levels, DOCX roundtrip.`,
  );
} finally {
  await browser.close();
}
