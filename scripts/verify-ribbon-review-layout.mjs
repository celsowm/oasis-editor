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
          let initialMeasurements;
          for (const width of [1440, 1152, 960, 800, 640, 480, 1440]) {
            await page.locator("#ribbon-reference-root").evaluate((el, w) => { el.style.width = `${w}px`; }, width);
            await waitForRibbonSettled(page);
            await expect.poll(async () => page.locator('[data-testid="editor-ribbon-panel"] > [data-ribbon-group]').evaluateAll((groups) =>
              groups.every((g) => Math.abs(Math.ceil(g.getBoundingClientRect().width) - Number(g.dataset.ribbonWidthAllocated)) <= 1)
            )).toBe(true);
            const measured = await page.locator('[data-testid="editor-ribbon-panel"] > [data-ribbon-group]').evaluateAll((groups) =>
              groups.map((g) => ({
                id: g.dataset.ribbonGroup,
                full: Number(g.dataset.ribbonWidthFull),
                compact: Number(g.dataset.ribbonWidthCompact),
                collapsed: Number(g.dataset.ribbonWidthCollapsed),
              }))
            );
            if (!initialMeasurements) initialMeasurements = measured;
            else assert.deepEqual(measured, initialMeasurements, "Intrinsic review widths changed with resize state");
            const geometry = await page.locator('[data-testid="editor-ribbon-panel"] > [data-ribbon-group]').evaluateAll((groups) =>
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
            // Check the actual anchor coordinates, not just group allocation.
            const alignment = await page.locator('[data-testid="editor-ribbon-panel"] > [data-ribbon-group]').evaluateAll((groups) => {
              const rect = (el) => {
                const r = el.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              };
              return groups.filter((g) => g.dataset.ribbonState !== "collapsed").map((group) => {
                const content = group.querySelector("[data-ribbon-content-group]");
                const large = [...content.querySelectorAll(".oasis-editor-ribbon-large-items .oasis-editor-tool-button")].map((button) => ({
                  icon: rect(button.querySelector("svg")),
                  label: rect(button.querySelector(".oasis-editor-tool-button-label")),
                }));
                const rows = [...content.querySelectorAll(".oasis-editor-ribbon-normal-rows > .oasis-editor-ribbon-row")].map((row) =>
                  [...row.querySelectorAll(".oasis-editor-tool-button")].filter((b) => b.getBoundingClientRect().width > 0).map(rect)
                );
                return { id: group.dataset.ribbonGroup, large, rows, body: rect(content), group: rect(group), caption: rect(group.querySelector(".oasis-editor-ribbon-group-label")) };
              });
            });
            const primary = alignment.flatMap((g) => g.large);
            if (primary.length > 1) {
              assert.ok(Math.max(...primary.map((b) => b.icon.y)) - Math.min(...primary.map((b) => b.icon.y)) <= 1, JSON.stringify(alignment));
              assert.ok(Math.max(...primary.map((b) => b.label.y)) - Math.min(...primary.map((b) => b.label.y)) <= 1, JSON.stringify(alignment));
            }
            for (const g of alignment) {
              // Every small command stays in its own horizontal band and above
              // the caption. Detect a fourth row caused by implicit grid tracks.
              for (const row of g.rows) {
                if (!row.length) continue;
                const top = Math.min(...row.map((b) => b.y));
                for (const button of row) {
                  assert.ok(Math.abs(button.y - top) <= 1, "Wrapped review row: " + JSON.stringify(g));
                  assert.ok(button.y + button.height <= g.caption.y + 1, "Command overlaps group caption: " + JSON.stringify(g));
                }
              }
              if (g.id === "comments") {
                assert.deepEqual(g.rows.map((row) => row.length), [2, 2, 3], JSON.stringify(g));
              }
              // Border accounts for the half-pixel center difference.
              assert.ok(Math.abs(g.group.x + (g.group.width - 1) / 2 - (g.caption.x + g.caption.width / 2)) <= 1.5, JSON.stringify(g));
              if (g.id === "tracking" && g.rows[0]?.length && g.rows[1]?.length) {
                assert.ok(Math.abs(g.rows[0][0].x - g.rows[1][0].x) <= 1, JSON.stringify(g));
                assert.ok(Math.abs(g.rows[0][0].width - g.rows[1][0].width) <= 1, JSON.stringify(g));
              }
              if (g.id === "changes" || g.id === "comments") {
                for (const row of g.rows.slice(1)) for (let i = 0; i < Math.min(row.length, g.rows[0].length); i++) {
                  assert.ok(Math.abs(row[i].x - g.rows[0][i].x) <= 1, JSON.stringify(g));
                }
              }
            }
            const file = `${engine}-${theme}-${locale}-${fixture}-${width}.png`;
            await page.screenshot({ path: resolve(output, file) });
            records.push({ sha, engine, theme, locale, fixture, width, geometry, alignment, screenshot: file });
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
