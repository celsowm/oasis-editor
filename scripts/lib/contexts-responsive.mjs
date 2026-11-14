/**
 * The responsive capture matrix for one fixture: every tab at five widths,
 * asserting allocation/actual parity, monotonic compaction, clipping and
 * icon-geometry chevrons, before a screenshot lands in the evidence folder.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { verifyRibbonChevrons } from "../ribbon-chevron-geometry.mjs";
import { fixtureScenarios } from "./contexts-fixtures.mjs";

export async function captureResponsiveRibbon(page, ctx) {
  const {
    fixture,
    tabs,
    theme,
    locale,
    output,
    sha,
    dirty,
    engine,
    records,
    baseline,
  } = ctx;
  const rank = { full: 0, compact: 1, collapsed: 2 };
  for (const tab of tabs) {
    const previous = new Map();
    for (const width of [1440, 1200, 960, 800, 640]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByTestId(`editor-ribbon-tab-${tab}`).click();
      await page.waitForFunction(() =>
        [...document.querySelectorAll("[data-ribbon-group]")].every(
          (group) => Number(group.dataset.ribbonWidthFull) > 0,
        ),
      );
      await page.waitForTimeout(80);
      const value = await page
        .getByTestId("editor-ribbon-panel")
        .evaluate((panel) => ({
          width: panel.clientWidth,
          scrollWidth: panel.scrollWidth,
          overflow: panel.dataset.ribbonOverflow,
          dpr: window.devicePixelRatio,
          groups: [...panel.children].map((group) => ({
            id: group.dataset.ribbonGroup,
            label: group.getAttribute("aria-label"),
            state: group.dataset.ribbonState,
            width: Math.ceil(group.getBoundingClientRect().width),
            allocated: Number(group.dataset.ribbonWidthAllocated),
            actions: [...group.querySelectorAll("button,select,input")].filter(
              (el) => el.getBoundingClientRect().width > 0,
            ).length,
          })),
        }));
      assert.ok(value.groups.length > 0);
      assert.equal(value.width, width, "Context host width mismatch");
      assert.equal(value.dpr, 1, "Context capture DPR mismatch");
      for (const group of value.groups) {
        assert.ok(group.actions > 0, `Empty ${fixture}/${tab}/${group.id}`);
        assert.notEqual(
          group.label,
          group.id,
          "Internal group identifier leaked",
        );
        assert.ok(
          Math.abs(group.width - group.allocated) <= 1,
          `Wrong state width: ${JSON.stringify(group)}`,
        );
        if (previous.has(group.id))
          assert.ok(
            rank[group.state] >= rank[previous.get(group.id)],
            `Narrower context restored ${group.id}`,
          );
        previous.set(group.id, group.state);
      }
      if (value.overflow === "false")
        assert.ok(
          value.scrollWidth <= value.width + 1,
          `Clipped context ${fixture}/${tab}`,
        );
      if (tab === "insert") {
        const accessibility = value.groups.some(
          (group) => group.id === "accessibility",
        );
        assert.equal(accessibility, fixture === "image");
      }
      const screenshot = `${fixture}-${theme}-${locale}-${width}-${tab}.png`;
      const fontState = await page.evaluate(() =>
        window.ribbonReference.fingerprintFonts(),
      );
      await page
        .locator(".oasis-editor-toolbar")
        .screenshot({ path: resolve(output, screenshot) });
      const iconGeometry = await verifyRibbonChevrons(page);
      records.push({
        ...iconGeometry,
        sha,
        dirty,
        browser: engine,
        screenshot,
        selection: baseline.selection,
        definitionSha256: baseline.definitionSha256,
        viewportHeight: 900,
        ...fontState,
        fixture,
        scenario: `${fixtureScenarios[fixture]}/${tab}`,
        theme,
        locale,
        tab,
        requestedWidth: width,
        documentSha256: baseline.documentSha256,
        ...value,
      });
    }
  }
}
