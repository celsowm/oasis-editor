#!/usr/bin/env node
/** Actual keyboard selection finalization, inherited appearance and Painter lifecycle. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-painter-${engine}`,
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
async function control(page, id, group = "clipboard") {
  const locator = page.locator(`[data-testid="editor-toolbar-${id}"]:visible`);
  if (!(await locator.isVisible())) {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByTestId(`editor-ribbon-group-${group}`).click();
  }
  return locator;
}
async function select(page, index, start, end = start) {
  await page.evaluate(
    async ({ index, start, end }) => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } =
        await import("/src/core/model.ts");
      const c = window.ribbonReference.client,
        p = getDocumentParagraphs(c.document.get())[index];
      c.selection.set({
        anchor: paragraphOffsetToPosition(p, start),
        focus: paragraphOffsetToPosition(p, end),
      });
    },
    { index, start, end },
  );
}
async function setup(page) {
  await page.evaluate(async () => {
    const c = window.ribbonReference.client;
    await c.import.html(
      '<h1>Heading source</h1><p><a href="https://example.com/destination">alpha</a> target</p><p>second target</p>',
    );
    c.history.clear();
    c.document.markClean();
  });
  await select(page, 0, 1, 7);
  return page.evaluate(() => ({
    font: window.ribbonReference.client.commands.state("setFontFamily").value,
    size: window.ribbonReference.client.commands.state("setFontSize").value,
    color: window.ribbonReference.client.commands.state("setColor").value,
    version: window.ribbonReference.client.document.version(),
    text: window.ribbonReference.client.query.getText(),
  }));
}
async function targetByKeyboard(page, index) {
  await select(page, index, 0);
  await page.evaluate(() => window.ribbonReference.client.focus.focus());
  await expect(page.getByTestId("editor-input")).toBeFocused();
  await page.keyboard.press("Shift+End");
}
async function snapshot(page) {
  return page.evaluate(() => {
    const c = window.ribbonReference.client;
    return {
      paragraphs: c.query
        .snapshot()
        .nodes.filter((n) => n.type === "paragraph")
        .map((n) => n.node),
      active: c.commands.state("formatPainter").isActive,
      continuous: c.commands.state("formatPainterContinuous").isActive,
      text: c.query.getText(),
      version: c.document.version(),
      undo: c.history.canUndo(),
      redo: c.history.canRedo(),
      cursor: document
        .querySelector(".oasis-editor-app")
        .classList.contains("oasis-editor-format-painter-active"),
    };
  });
}
function appearance(value, index, source) {
  for (const r of value.paragraphs[index].runs) {
    assert.deepEqual(
      {
        font: r.styles?.fontFamily,
        size: r.styles?.fontSize,
        color: r.styles?.color,
      },
      {
        font: source.font,
        size: (Number(source.size) * 4) / 3,
        color: source.color,
      },
      "Painter missed the source's inherited appearance",
    );
  }
  assert.notEqual(
    value.paragraphs[index].style?.styleId,
    "heading1",
    "Partial source selection painted paragraph style",
  );
  if (index === 1)
    assert.equal(
      value.paragraphs[index].runs[0].styles.link,
      "https://example.com/destination",
      "Painter replaced destination hyperlink",
    );
  assert.equal(value.text, source.text);
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
        const source = await setup(page);
        await (await control(page, "format-painter")).click();
        assert.equal((await snapshot(page)).active, true);
        assert.equal((await snapshot(page)).version, source.version);
        await targetByKeyboard(page, 1);
        const painted = await snapshot(page);
        appearance(painted, 1, source);
        assert.equal(painted.active, false);
        assert.equal(painted.cursor, false);
        await (await control(page, "undo", "history")).click();
        const undone = await snapshot(page);
        assert.equal(undone.undo, false);
        assert.notEqual(
          undone.paragraphs[1].runs[0].styles?.fontFamily,
          source.font,
        );
        await (await control(page, "redo", "history")).click();
        appearance(await snapshot(page), 1, source);
        await setup(page);
        await (await control(page, "format-painter-dropdown")).click();
        await page
          .locator(
            '[data-testid="editor-toolbar-format-painter-continuous"]:visible',
          )
          .click();
        await targetByKeyboard(page, 1);
        appearance(await snapshot(page), 1, source);
        assert.equal((await snapshot(page)).continuous, true);
        await targetByKeyboard(page, 2);
        appearance(await snapshot(page), 2, source);
        assert.equal((await snapshot(page)).continuous, true);
        const beforeEscape = (await snapshot(page)).version;
        await page.keyboard.press("Escape");
        assert.equal((await snapshot(page)).active, false);
        assert.equal((await snapshot(page)).version, beforeEscape);
        await setup(page);
        await (await control(page, "format-painter")).click();
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(true),
        );
        assert.equal(
          (await snapshot(page)).active,
          false,
          "Read-only transition left Painter armed",
        );
        assert.equal((await snapshot(page)).cursor, false);
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(false),
        );
        await setup(page);
        await (await control(page, "format-painter")).click();
        await page.evaluate(() =>
          window.ribbonReference.client.import.html(
            "<p>Replacement document.</p>",
          ),
        );
        assert.equal(
          (await snapshot(page)).active,
          false,
          "Document replacement left Painter armed",
        );
        assert.equal((await snapshot(page)).cursor, false);
        assert.deepEqual(errors, []);
        records.push({
          sha,
          dirty,
          engine,
          theme,
          locale,
          width,
          input: "real keyboard Shift+End; target caret seeded by client",
          checks: [
            "inherited-appearance",
            "destination-link-preserved",
            "one-shot-disarm",
            "undo-redo",
            "continuous-two-targets",
            "escape-no-mutation",
            "read-only-cancel",
            "replacement-cancel",
          ],
          unverified: ["pointer/touch gestures", "OS/VoiceOver", "DOCX/PDF"],
        });
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Painter keyboard/lifecycle workflows in ${engine}; named source, one-shot/continuous, undo and read-only/replacement cancellation.`,
  );
} finally {
  await browser.close();
}
