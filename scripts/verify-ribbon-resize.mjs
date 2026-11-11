#!/usr/bin/env node
import { verifyRibbonChevrons } from "./ribbon-chevron-geometry.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-resize-${engine}`,
);
await mkdir(output, { recursive: true });
const browser = await { chromium, firefox, webkit }[engine].launch();
const records = [];
const ranks = { full: 0, compact: 1, collapsed: 2 };
const snapshot = async (page) => {
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[data-ribbon-group]")].every(
      (el) => Number(el.dataset.ribbonWidthFull) > 0,
    ),
  );
  await page.waitForTimeout(100);
  return page.getByTestId("editor-ribbon-panel").evaluate((panel) => ({
    width: panel.clientWidth,
    scrollWidth: panel.scrollWidth,
    overflow: panel.dataset.ribbonOverflow,
    groups: [...panel.children].map((group) => ({
      id: group.dataset.ribbonGroup,
      state: group.dataset.ribbonState,
      width: Math.ceil(group.getBoundingClientRect().width),
      allocated: Number(group.dataset.ribbonWidthAllocated),
      full: Number(group.dataset.ribbonWidthFull),
      compact: Number(group.dataset.ribbonWidthCompact),
      collapsed: Number(group.dataset.ribbonWidthCollapsed),
    })),
  }));
};
const validate = (value) => {
  for (const group of value.groups)
    assert.ok(
      Math.abs(group.width - group.allocated) <= 1,
      `Actual width differs from planned width: ${JSON.stringify(group)}`,
    );
  if (value.overflow === "false")
    assert.ok(
      value.scrollWidth <= value.width + 1,
      `Inaccessible clipping: ${JSON.stringify(value)}`,
    );
};
try {
  for (const theme of ["light", "dark"])
    for (const locale of ["en", "pt-BR"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`,
      );
      await waitForRibbonReference(page);
      await page.evaluate(() => document.fonts.ready);
      const original = await page.evaluate(() => ({
        version: window.ribbonReference.client.document.version(),
        selection: window.ribbonReference.client.selection.get(),
      }));
      const values = new Map();
      for (const width of [1440, 1200, 1040, 960, 880, 800, 640, 480, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const value = await snapshot(page);
        validate(value);
        if (values.size) {
          const previous = [...values.values()].at(-1);
          value.groups.forEach((group, index) =>
            assert.ok(
              ranks[group.state] >= ranks[previous.groups[index].state],
              `Narrower width restored ${group.id}`,
            ),
          );
        }
        values.set(width, value);
        records.push({ theme, locale, width, direction: "shrink", ...value });
      }
      // Below the minimum, explicit buttons must reach the final group.
      assert.equal(values.get(320).overflow, "true");
      await page.locator(".oasis-editor-ribbon-scroll-button").last().click();
      await page.waitForTimeout(400);
      assert.ok(
        await page
          .getByTestId("editor-ribbon-panel")
          .evaluate((el) => el.scrollLeft > 0),
      );
      for (const width of [480, 640, 800, 880, 960, 1040, 1200, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const value = await snapshot(page);
        validate(value);
        assert.deepEqual(
          value,
          values.get(width),
          `Resize history changed ${width}px arrangement`,
        );
        records.push({ theme, locale, width, direction: "expand", ...value });
      }
      // Width changes preserve mounted controls and focused formatting fields.
      const font = page.getByTestId("editor-toolbar-font-family");
      await font.focus();
      const handle = await font.elementHandle();
      await page.setViewportSize({ width: 1200, height: 900 });
      await snapshot(page);
      assert.ok(
        await handle.evaluate(
          (el) => el === document.activeElement && el.isConnected,
        ),
      );
      await page.setViewportSize({ width: 640, height: 900 });
      await snapshot(page);
      assert.ok(
        await page
          .getByTestId("editor-ribbon-group-font")
          .evaluate((el) => el === document.activeElement),
      );
      await page.getByTestId("editor-ribbon-group-font").click();
      const popup = page.locator(".oasis-editor-ribbon-collapsed-menu");
      await popup.waitFor();
      assert.equal(await popup.locator(".oasis-editor-ribbon-row").count(), 2);
      const childTrigger = popup.getByTestId(
        "editor-toolbar-underline-dropdown",
      );
      await childTrigger.click();
      await page.waitForTimeout(60);
      assert.equal(await popup.count(), 1, "Child menu trigger closed parent");
      // Click inside the portalled child, but outside an action, to exercise
      // outside-dismiss ownership without applying a document command.
      const child = page
        .locator('[role="menu"]')
        .filter({ has: page.getByTestId("editor-toolbar-underline-remove") });
      assert.equal(await child.count(), 1, "Child menu must open");
      await child.evaluate((el) =>
        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
      );
      await verifyRibbonChevrons(page);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(50);
      assert.equal(
        await popup.count(),
        1,
        "Escape should dismiss only the child",
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(50);
      assert.equal(await popup.count(), 0);
      // Identical group IDs on another tab must use that tab's own content.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByTestId("editor-ribbon-tab-layout").click();
      const layout = await snapshot(page);
      validate(layout);
      await page.getByTestId("editor-ribbon-tab-home").click();
      const home = await snapshot(page);
      validate(home);
      assert.notEqual(
        layout.groups.find((group) => group.id === "paragraph").full,
        home.groups.find((group) => group.id === "paragraph").full,
      );
      assert.deepEqual(home, values.get(1440));
      assert.deepEqual(
        await page.evaluate(() => ({
          version: window.ribbonReference.client.document.version(),
          selection: window.ribbonReference.client.selection.get(),
        })),
        original,
        "Measurement/navigation mutated document or selection",
      );
      await page.setViewportSize({ width: 960, height: 900 });
      await snapshot(page);
      await page.reload();
      await waitForRibbonReference(page);
      const direct = await snapshot(page);
      validate(direct);
      assert.deepEqual(
        direct,
        values.get(960),
        "Direct load differs from resizing",
      );
      // Extension and language changes must invalidate even the full widths
      // of a currently collapsed group, and removal must recover the baseline.
      await page.evaluate(() =>
        window.ribbonReference.client.ui.toolbar.items.register({
          type: "button",
          id: "reference-extension",
          command: "bold",
          tab: "home",
          group: "font",
          label: "A deliberately wide extension formatting command",
          row: 1,
        }),
      );
      const extended = await snapshot(page);
      validate(extended);
      assert.ok(
        extended.groups.find((group) => group.id === "font").full >
          direct.groups.find((group) => group.id === "font").full,
      );
      await page.evaluate(() =>
        window.ribbonReference.client.ui.toolbar.items.remove(
          "reference-extension",
        ),
      );
      assert.deepEqual(await snapshot(page), direct);
      await page.evaluate(
        (locale) => window.ribbonReference.client.ui.update({ locale }),
        locale === "en" ? "pt-BR" : "en",
      );
      validate(await snapshot(page));
      const historyLabel = await page
        .locator('[data-ribbon-group="history"]')
        .getAttribute("aria-label");
      assert.equal(historyLabel, locale === "en" ? "Histórico" : "History");
      await page.evaluate(
        (locale) => window.ribbonReference.client.ui.update({ locale }),
        locale,
      );
      assert.deepEqual(await snapshot(page), direct);
      // Theme geometry changes must include actual gallery chrome in its budget.
      await page.setViewportSize({ width: 1440, height: 900 });
      const beforeTheme = await snapshot(page);
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "reference-roomy-style";
        style.textContent =
          ".reference-roomy .oasis-editor-ribbon-group-compact { padding-inline: 20px; }";
        document.head.append(style);
        document
          .querySelector(".oasis-editor-app")
          .classList.add("reference-roomy");
      });
      const roomy = await snapshot(page);
      validate(roomy);
      assert.ok(
        roomy.groups.find((group) => group.id === "styles").compact >
          beforeTheme.groups.find((group) => group.id === "styles").compact,
      );
      await page.evaluate(() => {
        document
          .querySelector(".oasis-editor-app")
          .classList.remove("reference-roomy");
        document.getElementById("reference-roomy-style").remove();
      });
      assert.deepEqual(await snapshot(page), beforeTheme);
      // A late web-font swap can change measured intrinsic widths without
      // changing the Ribbon DOM or its host theme. The FontFaceSet listener
      // must schedule a fresh measurement, and the original metrics must
      // return when the font styling is removed.
      const beforeFont = await snapshot(page);
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "reference-late-font-style";
        style.textContent =
          '.oasis-editor-ribbon-group[data-ribbon-group="paragraph"] > .oasis-editor-ribbon-group-label { font-family: monospace !important; font-size: 32px !important; letter-spacing: 10px !important; max-width: none !important; width: max-content !important; }';
        document.head.append(style);
        document.fonts.dispatchEvent(new Event("loadingdone"));
      });
      const lateFont = await snapshot(page);
      assert.ok(
        lateFont.groups.find((group) => group.id === "paragraph").full >
          beforeFont.groups.find((group) => group.id === "paragraph").full,
        "Late font metrics did not invalidate Ribbon measurements",
      );
      await page.evaluate(() => {
        document.getElementById("reference-late-font-style").remove();
        document.fonts.dispatchEvent(new Event("loadingdone"));
      });
      assert.deepEqual(
        await snapshot(page),
        beforeFont,
        "Removing late font metrics did not restore the baseline layout",
      );
      // An idle Ribbon must not continuously create measurement copies.
      await page.waitForTimeout(100);
      await page.evaluate(() => {
        window.referenceIdleMeasures = 0;
        window.referenceMeasureObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations)
            for (const node of mutation.addedNodes) {
              if (
                node instanceof HTMLElement &&
                node.dataset.ribbonMeasurementCopy
              )
                window.referenceIdleMeasures++;
            }
        });
        window.referenceMeasureObserver.observe(
          document.querySelector(".oasis-editor-ribbon-panel-frame"),
          { childList: true },
        );
      });
      await page.waitForTimeout(300);
      assert.equal(
        await page.evaluate(() => {
          window.referenceMeasureObserver.disconnect();
          return window.referenceIdleMeasures;
        }),
        0,
        "Idle measurement loop",
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify({ browser: engine, records }, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} layouts in ${engine}: exact state widths, monotonic reduction, direct/resize parity, overflow, focus and nested popups.`,
  );
} finally {
  await browser.close();
}
