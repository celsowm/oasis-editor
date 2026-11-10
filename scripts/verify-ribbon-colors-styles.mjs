#!/usr/bin/env node
/** Actual color splits and style galleries: targets, history, availability and formats. */
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
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-colors-styles-${engine}`,
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
const modes = [
  { id: "color", key: "color", initial: "ff0000", pick: "0070c0" },
  { id: "highlight", key: "highlight", initial: "ffff00", pick: "ff0000" },
  { id: "text-shading", key: "shading", initial: "00b050", pick: "ff0000" },
];
async function control(page, id, group = "font") {
  const result = page.locator(`[data-testid="editor-toolbar-${id}"]:visible`);
  if (!(await result.isVisible())) {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByTestId(`editor-ribbon-group-${group}`).click();
  }
  return result;
}
async function seed(page) {
  await page.evaluate(async () => {
    const { getDocumentParagraphs, paragraphOffsetToPosition } =
      await import("/src/core/model.ts");
    const c = window.ribbonReference.client;
    await c.import.html(
      '<p style="color:rgb(255,0,0);background-color:rgb(255,255,0)">before <a href="https://example.com/target">target</a> after</p>',
    );
    const d = c.document.get(),
      p = getDocumentParagraphs(d)[0];
    for (const r of p.runs)
      r.styles = { ...r.styles, shading: "rgb(0,176,80)" };
    d.styles = {
      ...d.styles,
      RibbonParagraph: {
        id: "RibbonParagraph",
        name: "Reference heading",
        type: "paragraph",
        qFormat: true,
        uiPriority: -10,
        textStyle: { bold: true, fontSize: 24 },
      },
      RibbonCharacter: {
        id: "RibbonCharacter",
        name: "Reference emphasis",
        type: "character",
        qFormat: true,
        uiPriority: -9,
        textStyle: { italic: true },
      },
    };
    c.document.load(d);
    c.selection.set({
      anchor: paragraphOffsetToPosition(p, 7),
      focus: paragraphOffsetToPosition(p, 13),
    });
    c.history.clear();
    c.document.markClean();
  });
  return snapshot(page);
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const {
      getDocumentParagraphs,
      resolveEffectiveTextStyleForParagraph,
      positionToParagraphOffset,
    } = await import("/src/core/model.ts");
    const { normalizeOpaqueRgbColor } = await import("/src/core/color.ts");
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
          color: normalizeOpaqueRgbColor(e.color),
          highlight: normalizeOpaqueRgbColor(e.highlight),
          shading: normalizeOpaqueRgbColor(e.shading),
          bold: e.bold,
          italic: e.italic,
          link: r.styles?.link,
          characterStyle: r.styles?.styleId ?? null,
        }));
      }),
      paragraphStyle: p.style?.styleId ?? null,
      selection: {
        anchor: positionToParagraphOffset(p, s.anchor),
        focus: positionToParagraphOffset(p, s.focus),
      },
      version: c.document.version(),
      undo: c.history.canUndo(),
      redo: c.history.canRedo(),
      dirty: c.document.isDirty(),
    };
  });
}
function changed(actual, before, key, color) {
  assert.deepEqual(actual.chars.slice(0, 7), before.chars.slice(0, 7));
  assert.deepEqual(actual.chars.slice(13), before.chars.slice(13));
  assert.deepEqual(
    actual.chars.slice(7, 13),
    before.chars.slice(7, 13).map((c) => ({ ...c, [key]: color })),
  );
}
async function roundTrip(page, filename) {
  const bytes = await page.evaluate(async () => {
    const c = window.ribbonReference.client,
      r = await c.io.export({ format: "docx" });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const bytes = [...new Uint8Array(await r.value.blob.arrayBuffer())];
    const loaded = await c.io.import({ format: "docx", data: r.value.blob });
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.error));
    return bytes;
  });
  await writeFile(resolve(output, filename), new Uint8Array(bytes));
  const xml = await (
    await JSZip.loadAsync(new Uint8Array(bytes))
  )
    .file("word/document.xml")
    .async("string");
  assert.doesNotMatch(
    xml,
    /w:(?:val|color|fill)="(?:rgb|rgba)\(/,
    "CSS RGB leaked into an OOXML color value",
  );
  return xml;
}
async function capture(page, filename) {
  const ribbon = await page
    .locator("section.oasis-editor-toolbar-view-ribbon")
    .boundingBox();
  const panels = await page
    .locator(
      ".oasis-editor-color-menu:visible,.oasis-editor-ribbon-collapsed-menu:visible",
    )
    .evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect();
        return { right: r.right, bottom: r.bottom };
      }),
    );
  const right = Math.max(
    ribbon.x + ribbon.width,
    ...panels.map((r) => r.right),
  );
  const bottom = Math.max(
    ribbon.y + ribbon.height,
    ...panels.map((r) => r.bottom),
  );
  assert.ok(
    right <= page.viewportSize().width + 1 &&
      bottom <= page.viewportSize().height + 1,
    "Color popup escapes viewport",
  );
  const hiddenDocument = await page.addStyleTag({
    content:
      ".oasis-editor-editor-shell, .oasis-editor-statusbar { visibility:hidden !important; }",
  });
  try {
    await page.screenshot({
      path: resolve(output, filename),
      clip: {
        x: 0,
        y: ribbon.y,
        width: Math.ceil(right),
        height: Math.ceil(bottom - ribbon.y),
      },
    });
  } finally {
    await hiddenDocument.evaluate((el) => el.remove());
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
          .locator("section.oasis-editor-toolbar-view-ribbon")
          .evaluate((e) => e.getBoundingClientRect().width);
        assert.ok(Math.abs(measuredWidth - width) < 1);
        for (const mode of modes) {
          const before = await seed(page);
          await (await control(page, `${mode.id}-dropdown`)).click();
          const initial = page.getByTestId(
            `editor-toolbar-${mode.id}-standard-swatch-${mode.initial}`,
          );
          await expect(initial).toHaveAttribute("aria-checked", "true");
          const paletteTheme = await page
            .locator(".oasis-editor-color-menu:visible")
            .evaluate((menu) => {
              const style = getComputedStyle(menu);
              return {
                background: style.backgroundColor,
                color: style.color,
              };
            });
          assert.deepEqual(
            paletteTheme,
            theme === "dark"
              ? { background: "rgb(36, 36, 36)", color: "rgb(241, 241, 241)" }
              : { background: "rgb(255, 255, 255)", color: "rgb(32, 33, 36)" },
            `${theme} palette theme tokens were not applied`,
          );
          if (width === 640) {
            const collapsedMenuTheme = await page
              .locator(".oasis-editor-ribbon-collapsed-menu:visible")
              .evaluate((menu) => {
                const style = getComputedStyle(menu);
                return {
                  background: style.backgroundColor,
                  color: style.color,
                };
              });
            assert.deepEqual(
              collapsedMenuTheme,
              theme === "dark"
                ? {
                    background: "rgb(36, 36, 36)",
                    color: "rgb(241, 241, 241)",
                  }
                : {
                    background: "rgb(255, 255, 255)",
                    color: "rgb(32, 33, 36)",
                  },
              `${theme} collapsed menu theme tokens were not applied`,
            );
          }
          const pick = page.getByTestId(
            `editor-toolbar-${mode.id}-standard-swatch-${mode.pick}`,
          );
          await pick.hover();
          assert.deepEqual(
            await snapshot(page),
            before,
            "Hover mutated document/history/selection",
          );
          const image = `${theme}-${locale}-${width}-${mode.id}.png`;
          await capture(page, image);
          await pick.click();
          await expect(
            page.locator(".oasis-editor-color-menu:visible"),
          ).toHaveCount(0);
          if (width === 640)
            await expect(
              page.locator(".oasis-editor-ribbon-collapsed-menu:visible"),
            ).toHaveCount(0);
          await expect(page.getByTestId("editor-input")).toBeFocused();
          const after = await snapshot(page);
          changed(after, before, mode.key, mode.pick.toUpperCase());
          assert.deepEqual(after.selection, before.selection);
          await page.evaluate(() =>
            window.ribbonReference.client.history.undo(),
          );
          assert.deepEqual((await snapshot(page)).chars, before.chars);
          assert.equal((await snapshot(page)).undo, false);
          await page.evaluate(() =>
            window.ribbonReference.client.history.redo(),
          );
          changed(
            await snapshot(page),
            before,
            mode.key,
            mode.pick.toUpperCase(),
          );
          await (await control(page, `${mode.id}-dropdown`)).click();
          await page.getByTestId(`editor-toolbar-${mode.id}-clear`).click();
          changed(
            await snapshot(page),
            before,
            mode.key,
            mode.key === "color" ? "000000" : null,
          );
          await (await control(page, mode.id)).click();
          changed(
            await snapshot(page),
            before,
            mode.key,
            mode.pick.toUpperCase(),
          );
          const filename = `${theme}-${locale}-${width}-${mode.id}.docx`;
          await roundTrip(page, filename);
          changed(
            await snapshot(page),
            before,
            mode.key,
            mode.pick.toUpperCase(),
          );
          await (await control(page, `${mode.id}-dropdown`)).click();
          await page
            .getByTestId(
              `editor-toolbar-${mode.id}-standard-swatch-${mode.pick}`,
            )
            .focus();
          const available = await snapshot(page);
          await page.evaluate(() =>
            window.ribbonReference.client.ui.setReadOnly(true),
          );
          await expect(
            page.locator(".oasis-editor-color-menu:visible"),
          ).toHaveCount(0);
          for (const id of [mode.id, `${mode.id}-dropdown`])
            await expect(await control(page, id)).toBeDisabled();
          assert.deepEqual(await snapshot(page), available);
          await page.evaluate(() =>
            window.ribbonReference.client.ui.setReadOnly(false),
          );
          for (const id of [mode.id, `${mode.id}-dropdown`])
            await expect(await control(page, id)).toBeEnabled();
          await expect(
            page.locator(".oasis-editor-color-menu:visible"),
          ).toHaveCount(0);
          records.push({
            sha,
            dirty,
            engine,
            theme,
            locale,
            width,
            measuredWidth,
            mode: mode.id,
            image,
            document: filename,
            checks: [
              "RGB-selected-swatch",
              "preview-no-mutation",
              "original-target-and-links",
              "nested-dismissal-and-focus",
              "one-step-undo-redo",
              "clear-and-remembered-primary",
              "DOCX-XML-and-self-reimport",
              "read-only-revocation",
            ],
          });
        }
        const before = await seed(page);
        await (await control(page, "style-expand", "styles")).click();
        await page
          .getByTestId("editor-toolbar-style-panel")
          .locator('[data-style-id="RibbonParagraph"]')
          .click();
        await expect(page.getByTestId("editor-input")).toBeFocused();
        const paragraph = await snapshot(page);
        assert.equal(paragraph.paragraphStyle, "RibbonParagraph");
        assert.ok(paragraph.chars.every((c) => c.bold));
        assert.deepEqual(paragraph.selection, before.selection);
        await page.evaluate(() => window.ribbonReference.client.history.undo());
        assert.deepEqual((await snapshot(page)).chars, before.chars);
        await page.evaluate(() => window.ribbonReference.client.history.redo());
        await (await control(page, "style-expand", "styles")).click();
        await page
          .getByTestId("editor-toolbar-style-panel")
          .locator('[data-style-id="RibbonCharacter"]')
          .click();
        const character = await snapshot(page);
        assert.deepEqual(
          character.chars.slice(0, 7),
          paragraph.chars.slice(0, 7),
        );
        assert.deepEqual(character.chars.slice(13), paragraph.chars.slice(13));
        assert.ok(
          character.chars
            .slice(7, 13)
            .every(
              (c) =>
                c.italic &&
                c.characterStyle === "RibbonCharacter" &&
                c.link === "https://example.com/target",
            ),
        );
        assert.deepEqual(character.selection, before.selection);
        await page.evaluate(() => window.ribbonReference.client.history.undo());
        assert.deepEqual((await snapshot(page)).chars, paragraph.chars);
        await page.evaluate(() => window.ribbonReference.client.history.redo());
        const filename = `${theme}-${locale}-${width}-styles.docx`;
        await roundTrip(page, filename);
        assert.deepEqual((await snapshot(page)).chars, character.chars);
        assert.equal((await snapshot(page)).paragraphStyle, "RibbonParagraph");
        await (await control(page, "style-expand", "styles")).click();
        const available = await snapshot(page);
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(true),
        );
        await expect(
          page.getByTestId("editor-toolbar-style-panel"),
        ).toHaveCount(0);
        await expect(
          await control(page, "style-expand", "styles"),
        ).toBeDisabled();
        await expect
          .poll(() =>
            page
              .locator(".oasis-editor-style-gallery-card:visible")
              .evaluateAll((cards) =>
                cards.every((card) => card.hasAttribute("disabled")),
              ),
          )
          .toBe(true);
        assert.deepEqual(await snapshot(page), available);
        await page.evaluate(() =>
          window.ribbonReference.client.ui.setReadOnly(false),
        );
        await expect(
          await control(page, "style-expand", "styles"),
        ).toBeEnabled();
        await expect(
          page.getByTestId("editor-toolbar-style-panel"),
        ).toHaveCount(0);
        assert.deepEqual(errors, []);
        records.push({
          sha,
          dirty,
          engine,
          theme,
          locale,
          width,
          measuredWidth,
          mode: "styles",
          document: filename,
          checks: [
            "paragraph-and-character-scope",
            "selection-and-link-preservation",
            "separate-undo-redo",
            "DOCX-self-reimport",
            "read-only-gallery",
          ],
        });
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} color/style workflows in ${engine}: RGB palettes, original targets, undo/redo, menu lifecycle, read-only and DOCX self-reimport.`,
  );
} finally {
  await browser.close();
}
