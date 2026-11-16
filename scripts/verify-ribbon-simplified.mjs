#!/usr/bin/env node
/** Actual command reachability and document mutation in the one-line ribbon. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { createSuite, loadFixture, openGroup, waitForRibbonSettled, writeVerification } from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const { base, engine, output, records, browser, sha } = await createSuite("simplified");
const metricIds = [
  ["indent-left", "cm"], ["spacing-after", "pt"],
  ["indent-first-line", "cm"], ["indent-hanging", "cm"],
];
const closeMenus = async page => {
  for (let i = 0; i < 3 && await page.locator(".oasis-editor-portal-theme [role=menu]:visible").count(); i++)
    await page.keyboard.press("Escape");
  await waitForRibbonSettled(page);
};
try {
  for (const theme of ["light", "dark"]) for (const locale of ["en", "pt-BR"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(`${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}&ribbonStyle=simplified&fixture=sections`);
      await waitForRibbonReference(page);
      for (const width of [1440, 480]) {
        await closeMenus(page);
        await loadFixture(page, "sections");
        await page.locator("#ribbon-reference-root").evaluate((el, w) => { el.style.width = `${w}px`; }, width);
        await page.getByTestId("editor-ribbon-tab-layout").click();
        await waitForRibbonSettled(page);
        assert.ok(await page.locator(".oasis-editor-ribbon-simplified").count());
        const section = page.getByTestId("editor-ribbon-panel").locator('[data-ribbon-group="paragraph"]');
        const layoutState = await section.getAttribute("data-ribbon-state");
        for (const [id, unit] of metricIds) {
          const field = await openGroup(page, "paragraph", `editor-toolbar-${id}`);
          await expect(field).toBeVisible();
          await expect(field).toBeEnabled();
          assert.ok((await field.getAttribute("aria-label"))?.endsWith(`(${unit})`));
          assert.equal(await field.locator("xpath=..").locator(".oasis-editor-ui-field-suffix").textContent(), unit);
          await expect(field.locator("xpath=..").locator(".oasis-editor-ui-field-suffix")).toBeVisible();
        }

        const prefix = `${theme}-${locale}-${width}`;
        await page.screenshot({ path: resolve(output, `${prefix}-metrics.png`) });
        const spacing = await openGroup(page, "paragraph", "editor-toolbar-spacing-after");
        const readSpacing = () => page.evaluate(() => window.ribbonReference.client.commands.state("setSpacingAfter").value);
        const initialSpacing = await readSpacing();
        const value = Number(initialSpacing) === 16 ? 18 : 12;
        await spacing.fill(String(value));
        assert.equal(await readSpacing(), initialSpacing, "Draft must not modify the model");
        await spacing.press("Enter");
        await page.waitForFunction(expected => Number(window.ribbonReference.client.commands.state("setSpacingAfter").value) === expected, value * 4 / 3);
        await page.evaluate(() => window.ribbonReference.client.history.undo());
        await page.waitForFunction(expected => window.ribbonReference.client.commands.state("setSpacingAfter").value === expected, initialSpacing);

        await closeMenus(page);
        const indent = await openGroup(page, "paragraph", "editor-toolbar-indent-left");
        const initialIndent = await page.evaluate(() => window.ribbonReference.client.commands.state("setIndentLeft").value);
        const indentText = Number(initialIndent) === 48 ? "2.54" : "1.27";
        const expectedIndent = indentText === "2.54" ? 96 : 48;
        await indent.fill(locale === "pt-BR" ? indentText.replace(".", ",") : indentText);
        await indent.press("Enter");
        await page.waitForFunction(expected => Number(window.ribbonReference.client.commands.state("setIndentLeft").value) === expected, expectedIndent);
        await page.evaluate(() => window.ribbonReference.client.history.undo());
        await page.waitForFunction(expected => window.ribbonReference.client.commands.state("setIndentLeft").value === expected, initialIndent);

        await closeMenus(page);
        await page.getByTestId("editor-ribbon-tab-home").click();
        await waitForRibbonSettled(page);
        for (const group of ["font", "paragraph"]) {
          const launcher = page.getByTestId(`editor-ribbon-group-${group}-launcher`);
          await expect(launcher).toBeVisible();
        }

        await loadFixture(page, "table");
        await page.getByTestId("editor-ribbon-tab-tableLayout").click();
        await waitForRibbonSettled(page);
        const alignState = await page.getByTestId("editor-ribbon-panel").locator('[data-ribbon-group="alignment"]').getAttribute("data-ribbon-state");
        for (const vertical of ["top", "middle", "bottom"]) for (const horizontal of ["left", "center", "right"]) {
          const action = await openGroup(page, "alignment", `editor-toolbar-cell-align-${vertical}-${horizontal}`);
          await expect(action).toBeVisible();
          await expect(action).toBeEnabled();
          assert.ok(await action.getAttribute("aria-label"), "Alignment action has no accessible name");
        }
        await page.screenshot({ path: resolve(output, `${prefix}-alignment.png`) });
        const before = await page.evaluate(() => window.ribbonReference.client.commands.state("tableSetCellAlignment").value);
        const vertical = before?.vertical === "bottom" && before?.horizontal === "right" ? "top" : "bottom";
        const horizontal = vertical === "top" ? "left" : "right";
        await (await openGroup(page, "alignment", `editor-toolbar-cell-align-${vertical}-${horizontal}`)).click();
        await page.waitForFunction(({ vertical, horizontal }) => {
          const value = window.ribbonReference.client.commands.state("tableSetCellAlignment").value;
          return value?.vertical === vertical && value?.horizontal === horizontal;
        }, { vertical, horizontal });
        await closeMenus(page);
        records.push({ sha, engine, theme, locale, width, layoutState, alignState,
          checks: ["four metrics reachable", "spacing commit and undo", "localized indent commit and undo", "dialog launchers reachable", "nine table alignment actions reachable", "table alignment mutation"] });
      }
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
  assert.equal(records.length, 8);
  assert.ok(records.some(r => r.layoutState === "collapsed"), "Collapsed metric popup coverage is missing");
  assert.ok(records.some(r => r.alignState === "collapsed"), "Collapsed alignment popup coverage is missing");
} finally {
  await writeVerification(output, { sha, engine, records });
  await browser.close();
}
