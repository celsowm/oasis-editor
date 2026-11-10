#!/usr/bin/env node
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-checks-${engine}`,
);
await mkdir(output, { recursive: true });
const browser = await { chromium, firefox, webkit }[engine].launch();
const evidence = [];
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
      await page.waitForTimeout(150);
      const cards = page.locator(
        ".oasis-editor-style-gallery-strip .oasis-editor-style-gallery-card",
      );
      assert.ok((await cards.count()) > 0);
      const wholeCards = await cards.evaluateAll((elements) =>
        elements.every((el) => {
          const card = el.getBoundingClientRect();
          const strip = el.parentElement.getBoundingClientRect();
          return card.left >= strip.left - 1 && card.right <= strip.right + 1;
        }),
      );
      assert.ok(wholeCards, "Only complete cards should appear in the strip");
      const expand = page.getByTestId("editor-toolbar-style-expand");
      await expand.click();
      const panel = page.getByTestId("editor-toolbar-style-panel");
      await panel.waitFor();
      const panelBackground = await panel.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      const ribbonBackground = await page
        .getByTestId("editor-ribbon-panel")
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      assert.equal(
        panelBackground,
        ribbonBackground,
        "Expanded gallery must use current chrome theme",
      );
      const first = panel.getByRole("option").first();
      await first.focus();
      await page.keyboard.press("ArrowRight");
      assert.ok(
        await panel
          .getByRole("option")
          .nth(1)
          .evaluate((el) => el === document.activeElement),
      );
      await panel.screenshot({
        path: resolve(output, `${theme}-${locale}-styles.png`),
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(30);
      assert.equal(await panel.count(), 0);
      assert.ok(await expand.evaluate((el) => el === document.activeElement));
      await page.getByTestId("editor-ribbon-tab-insert").click();
      assert.equal(
        await page.locator('[data-ribbon-group="accessibility"]').count(),
        0,
        "No empty Accessibility group",
      );
      const labels = await page
        .locator("[data-ribbon-group]")
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute("aria-label")),
        );
      assert.ok(!labels.includes("headerFooter"));
      assert.ok(
        labels.includes(
          locale === "en" ? "Header & Footer" : "Cabeçalho e Rodapé",
        ),
      );
      await page.setViewportSize({ width: 640, height: 900 });
      const home = page.getByTestId("editor-ribbon-tab-home");
      await home.focus();
      await page.keyboard.press("ArrowRight");
      const insert = page.getByTestId("editor-ribbon-tab-insert");
      assert.ok(await insert.evaluate((el) => el === document.activeElement));
      assert.equal(await insert.getAttribute("aria-selected"), "true");
      await page.keyboard.press("End");
      const active = page.getByRole("tab", { selected: true });
      assert.ok(
        await active.evaluate((el) => {
          const bounds = el.getBoundingClientRect();
          return (
            el === document.activeElement &&
            bounds.left >= 0 &&
            bounds.right <= innerWidth + 1
          );
        }),
        "Keyboard-selected tab must be focused and visible",
      );
      assert.deepEqual(errors, []);
      evidence.push({
        browser: engine,
        theme,
        locale,
        wholeCards,
        panelBackground,
        ribbonBackground,
        keyboardTabs: "pass",
        emptyGroups: "pass",
        errors,
      });
      await page.close();
    }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    `Verified ${evidence.length} theme/language combinations in ${engine}: composition, gallery, keyboard tabs.`,
  );
} finally {
  await browser.close();
}
