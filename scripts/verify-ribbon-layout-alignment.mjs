#!/usr/bin/env node
/** Layout tab field/label/unit and page setup alignment regression. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { createSuite, openRibbonPage, waitForRibbonSettled, writeVerification } from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const { base, engine, output, records, browser, sha } = await createSuite("layout-alignment");
const near = (a, b, message) => assert.ok(Math.abs(a - b) <= 1, `${message}: ${a} vs ${b}`);
try {
  for (const theme of ["light", "dark"]) {
    for (const locale of ["en", "pt-BR"]) {
      const { page, errors } = await openRibbonPage(browser, base, { theme, locale, width: 1440 });
      try {
        await waitForRibbonReference(page);
        await page.getByTestId("editor-ribbon-tab-layout").click();
        for (const width of [1440, 1152, 800, 560, 1440]) {
          await page.locator("#ribbon-reference-root").evaluate((el, w) => { el.style.width = `${w}px`; }, width);
          await waitForRibbonSettled(page);
          const panel = page.getByTestId("editor-ribbon-panel");
          const paragraph = panel.locator('[data-ribbon-group="paragraph"]');
          const section = panel.locator('[data-ribbon-group="section"]');
          const fields = paragraph.locator(".oasis-editor-metric-inline-field");
          const geometry = await panel.evaluate((el) => {
            const rect = (node) => {
              const r = node.getBoundingClientRect();
              return { x: r.x, y: r.y, width: r.width, height: r.height };
            };
            const paragraph = el.querySelector('[data-ribbon-group="paragraph"]');
            const section = el.querySelector('[data-ribbon-group="section"]');
            return {
              paragraphState: paragraph.dataset.ribbonState,
              sectionState: section.dataset.ribbonState,
              fields: [...paragraph.querySelectorAll(".oasis-editor-metric-inline-field")].map((field) => ({
                label: rect(field.querySelector(".oasis-editor-tool-metric-label")),
                input: rect(field.querySelector("input")),
                unit: rect(field.querySelector(".oasis-editor-ui-field-suffix")),
              })),
              buttons: [...section.querySelectorAll(".oasis-editor-ribbon-large-items > .oasis-editor-toolbar-item > .oasis-editor-toolbar-dropdown > button")].map((button) => ({
                button: rect(button),
                icon: rect(button.querySelector("svg")),
                label: rect(button.querySelector(".oasis-editor-tool-button-label")),
                chevron: rect(button.querySelector(".oasis-editor-dropdown-chevron")),
              })),
            };
          });
          if (geometry.paragraphState !== "collapsed") {
            await expect(fields).toHaveCount(4);
            const [a,b,c,d] = geometry.fields;
            for (const [first,second] of [[a,c],[b,d]]) {
              for (const k of ["label","input","unit"]) near(first[k].x, second[k].x, `${locale}: ${k} column`);
            }
            for (const [first,second] of [[a,b],[c,d]]) {
              near(first.input.y, second.input.y, "field row");
              near(first.input.height, second.input.height, "field height");
            }
            assert.ok(a.input.width >= 50, "numeric control is clipped");
          }
          if (geometry.sectionState !== "collapsed") {
            assert.equal(geometry.buttons.length, 2);
            const [a,b] = geometry.buttons;
            for (const k of ["icon","label","chevron"]) near(a[k].y,b[k].y,`page setup ${k} band`);
            near(a.button.width,b.button.width,"page setup button width");
          }
          const file = `${engine}-${theme}-${locale}-${width}.png`;
          await page.screenshot({ path: resolve(output,file) });
          records.push({ sha, engine, theme, locale, width, geometry, screenshot: file });
        }
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    }
  }
  await writeVerification(output, { sha, engine, records });
} finally { await browser.close(); }
