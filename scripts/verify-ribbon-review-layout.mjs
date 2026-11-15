#!/usr/bin/env node
/** Visual and command-state regression for the redesigned Review ribbon. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import {
  createSuite, openRibbonPage, loadFixture, openGroup,
  waitForRibbonSettled, writeVerification,
} from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const { base, engine, output, records, browser, sha } = await createSuite("review-layout");
const commandIds = [
  ["changes", "accept-revisions", "acceptRevisions"],
  ["changes", "reject-revisions", "rejectRevisions"],
  ["changes", "accept-all-revisions", "requestAcceptAllRevisions"],
  ["changes", "reject-all-revisions", "requestRejectAllRevisions"],
  ["changes", "previous-revision", "previousRevision"],
  ["changes", "next-revision", "nextRevision"],
  ["comments", "new-comment", "newComment"],
  ["comments", "previous-comment", "previousComment"],
  ["comments", "next-comment", "nextComment"],
];

try {
  for (const theme of ["light", "dark"]) {
    for (const locale of ["en", "pt-BR"]) {
      const { page, errors } = await openRibbonPage(browser, base, { theme, locale, width: 1440 });
      try {
        await waitForRibbonReference(page);
        await page.getByTestId("editor-ribbon-tab-review").click();
        for (const fixture of ["text", "review"]) {
          await loadFixture(page, fixture);
          await waitForRibbonSettled(page);
          // Permit the panel to measure the full labels at a wide host first.
          await page.locator("#ribbon-reference-root").evaluate((el) => { el.style.width = "100%"; });
          await expect.poll(async () => page.locator('[data-ribbon-group="tracking"]').getAttribute("data-ribbon-state")).not.toBe("collapsed");
          const display = await openGroup(page, "tracking", "editor-toolbar-display-for-review");
          await expect(display).toBeVisible();
          const mode = await page.evaluate(() => window.ribbonReference.client.commands.state("setReviewDisplayMode").value);
          const modes = locale === "pt-BR"
            ? { all: "Marcação completa", simple: "Marcação simples", final: "Final", original: "Original" }
            : { all: "All Markup", simple: "Simple Markup", final: "Final", original: "Original" };
          await expect(display).toContainText(modes[mode] ?? modes.all);
          await expect(display.locator("svg.oasis-review-icon")).toHaveCount(1);
          const markup = await openGroup(page, "tracking", "editor-toolbar-show-markup");
          await expect(markup).toContainText(locale === "pt-BR" ? "Filtrar marcações" : "Markup Filters");
          for (const width of [1440, 1152, 960, 800, 640, 480]) {
            await page.locator("#ribbon-reference-root").evaluate((el, w) => { el.style.width = `${w}px`; }, width);
            await waitForRibbonSettled(page);
            await expect.poll(async () => page.locator("[data-ribbon-group]").evaluateAll((groups) =>
              groups.every((g) => Math.abs(Math.ceil(g.getBoundingClientRect().width) - Number(g.dataset.ribbonWidthAllocated)) <= 1)
            )).toBe(true);
            const geometry = await page.locator("[data-ribbon-group]").evaluateAll((groups) =>
              groups.map((g) => ({ id: g.dataset.ribbonGroup, state: g.dataset.ribbonState, width: g.getBoundingClientRect().width }))
            );
            for (const [group, id, command] of commandIds) {
              const control = await openGroup(page, group, `editor-toolbar-${id}`);
              const enabled = await page.evaluate((name) => window.ribbonReference.client.commands.state(name).isEnabled, command);
              if (enabled) await expect(control).toBeEnabled();
              else await expect(control).toBeDisabled();
              await expect(control).toBeVisible();
              await expect(control).toHaveAccessibleName(/\S/);
              await expect(control.locator("svg.oasis-review-icon")).toHaveCount(1);
              // A collapsed group may have a portalled copy. Close only after
              // checking all state for this action; openGroup locates the next.
              await page.keyboard.press("Escape");
            }
            const file = `${engine}-${theme}-${locale}-${fixture}-${width}.png`;
            await page.screenshot({ path: resolve(output, file) });
            records.push({ sha, engine, theme, locale, fixture, width, geometry, screenshot: file });
          }
        }
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
