#!/usr/bin/env node
/** Focused cross-engine regression for the reported blank style gallery. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { createSuite, writeVerification } from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const { base, engine, output, records, browser, sha } = await createSuite("style-gallery");
try {
  for (const theme of ["light", "dark"]) {
    for (const locale of ["en", "pt-BR"]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(`${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`);
        await waitForRibbonReference(page);
        await page.evaluate(async () => {
          const { getDocumentParagraphs, paragraphOffsetToPosition } = await import("/src/core/model.ts");
          const client = window.ribbonReference.client;
          const doc = client.document.get();
          doc.styles = {
            ...doc.styles,
            GalleryRegressionHeading: {
              id: "GalleryRegressionHeading",
              name: "Custom regression heading",
              type: "paragraph",
              qFormat: true,
              uiPriority: 100,
              textStyle: { bold: true, fontSize: 24 },
            },
          };
          const paragraph = getDocumentParagraphs(doc)[0];
          paragraph.style = { ...paragraph.style, styleId: "GalleryRegressionHeading" };
          client.document.load(doc);
          const pos = paragraphOffsetToPosition(paragraph, 0);
          client.selection.set({ anchor: pos, focus: pos });
          await document.fonts.ready;
        });
        const gallery = page.locator(".oasis-editor-style-gallery-ribbon:visible").first();
        await expect(gallery).toBeVisible();
        const strip = gallery.locator(".oasis-editor-style-gallery-strip");
        const active = strip.locator('[data-style-id="GalleryRegressionHeading"]');
        const originalWidth = await gallery.evaluate((el) => el.style.width);
        for (const width of [131, 131.5, 132, 105, 212, 238]) {
          await gallery.evaluate((el, width) => { el.style.width = `${width}px`; }, width);
          if (width === 105) {
            await expect(strip.locator(".oasis-editor-style-gallery-placeholder")).toHaveText("Custom regression heading");
          } else {
            await expect(active).toBeVisible();
            await expect(active).toHaveAttribute("aria-selected", "true");
          }
          const geometry = await strip.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return {
              width: r.width,
              cards: [...el.querySelectorAll(".oasis-editor-style-gallery-card")].map((card) => {
                const b = card.getBoundingClientRect();
                return { id: card.dataset.styleId, left: b.left - r.left, right: b.right - r.left };
              }),
              placeholder: el.querySelector(".oasis-editor-style-gallery-placeholder")?.textContent ?? null,
            };
          });
          assert.ok(geometry.cards.length || geometry.placeholder, "Blank strip");
          for (const card of geometry.cards) {
            assert.ok(card.left >= -0.5 && card.right <= geometry.width + 0.5, JSON.stringify(geometry));
          }
          records.push({ sha, engine, theme, locale, requestedWidth: width, ...geometry });
        }
        await gallery.evaluate((el, width) => { el.style.width = width; }, originalWidth);
        // Reduce the actual embedded editor width without shrinking the browser viewport.
        for (const width of [1200, 1050, 900, 750]) {
          await page.locator("#ribbon-reference-root").evaluate((el, width) => { el.style.width = `${width}px`; }, width);
          await page.waitForTimeout(150);
          if (await gallery.isVisible()) {
            const cardOrLabel = strip.locator(".oasis-editor-style-gallery-card, .oasis-editor-style-gallery-placeholder");
            assert.ok(await cardOrLabel.count(), "Embedded editor has a blank style gallery");
          }
        }
        await page.locator("#ribbon-reference-root").evaluate((el) => { el.style.width = "100%"; });
        await expect(gallery).toBeVisible();
        await gallery.getByTestId("editor-toolbar-style-expand").click();
        const panel = page.getByTestId("editor-toolbar-style-panel");
        await expect(panel).toBeVisible();
        await expect(panel.locator('[data-style-id="GalleryRegressionHeading"]')).toHaveAttribute("aria-selected", "true");
        await expect.poll(async () => {
          const rect = await panel.boundingBox();
          return !!rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1440.5 && rect.y + rect.height <= 900.5;
        }).toBe(true);
        await page.screenshot({ path: resolve(output, `${engine}-${theme}-${locale}.png`) });
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    }
  }
  await writeVerification(output, { sha, engine, records });
} finally {
  await browser.close();
}
