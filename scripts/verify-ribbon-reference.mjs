#!/usr/bin/env node
/* global process, document, getComputedStyle, innerWidth, console */
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSuite } from "./lib/ribbon-suite.mjs";

const { base, engine, output, sha, dirty, records, browser } =
  await createSuite("ribbon-checks");
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
      await expect(
        panel,
        `${theme}/${locale}: Escape closes the gallery`,
      ).toHaveCount(0);
      await expect(
        expand,
        `${theme}/${locale}: Escape restores the gallery trigger`,
      ).toBeFocused();
      // Regression: the yellow highlight pencil's triangular tip must span the
      // same width as its trunk and eraser band (each short edge is (4.8, 4.8)).
      const pencilPaths = await page.evaluate(() => {
        const btn = document.querySelector(
          '[data-testid="editor-toolbar-highlight"]',
        );
        const svg = Array.from(btn?.querySelectorAll("svg") ?? []).find((s) =>
          s.querySelector('path[fill="#facc15"]'),
        );
        return svg
          ? Array.from(svg.querySelectorAll("path")).map(
              (el) => el.getAttribute("d") ?? "",
            )
          : [];
      });
      assert.equal(
        pencilPaths.length,
        3,
        "highlight pencil has trunk, eraser and tip paths",
      );
      const [trunk, eraser, tip] = pencilPaths.map((d) =>
        (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number),
      );
      const widthSquared = (a, b, c, d) => (c - a) ** 2 + (d - b) ** 2;
      const trunkWidth = widthSquared(trunk[0], trunk[1], trunk[2], trunk[3]);
      const eraserWidth = widthSquared(
        eraser[0],
        eraser[1],
        eraser[2],
        eraser[3],
      );
      const tipWidth = widthSquared(tip[0], tip[1], tip[4], tip[5]);
      assert.ok(
        Math.abs(trunkWidth - tipWidth) < 0.01 &&
          Math.abs(eraserWidth - tipWidth) < 0.01,
        `${theme}/${locale}: pencil tip must match trunk/eraser width`,
      );
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
      const ribbonTabs = await page
        .getByRole("tab")
        .evaluateAll((elements) =>
          elements.map((el) => el.id.replace("oasis-editor-ribbon-tab-", "")),
        );
      for (const width of [1440, 1200, 960, 800, 640]) {
        await page.setViewportSize({ width, height: 900 });
        for (const tab of ribbonTabs) {
          await page.getByTestId(`editor-ribbon-tab-${tab}`).click();
          const clippedLabels = await page
            .locator(
              ".oasis-editor-toolbar-view-ribbon .oasis-editor-tool-button-label:visible",
            )
            .evaluateAll((elements) =>
              elements
                .filter(
                  (el) =>
                    el.scrollWidth > el.clientWidth + 1 ||
                    el.scrollHeight > el.clientHeight + 1,
                )
                .map((el) => ({
                  id: el.closest("button")?.dataset.testid ?? null,
                  text: el.textContent?.trim() ?? "",
                  clientWidth: el.clientWidth,
                  scrollWidth: el.scrollWidth,
                  clientHeight: el.clientHeight,
                  scrollHeight: el.scrollHeight,
                })),
            );
          assert.deepEqual(
            clippedLabels,
            [],
            `${theme}/${locale}/${width}/${tab}: Ribbon labels must not clip`,
          );

          const expected =
            tab === "references"
              ? {
                  id: "editor-toolbar-update-toc",
                  label: locale === "en" ? "Update" : "Atualizar",
                  title:
                    locale === "en"
                      ? "Update Table of Contents"
                      : "Atualizar Sumário",
                }
              : tab === "review"
                ? {
                    id: "editor-toolbar-reply-comment",
                    label: locale === "en" ? "Reply" : "Responder",
                    title:
                      locale === "en"
                        ? "Reply to Comment"
                        : "Responder comentário",
                  }
                : undefined;
          if (expected) {
            const button = page.getByTestId(expected.id);
            assert.equal(
              await button
                .locator(".oasis-editor-tool-button-label")
                .textContent(),
              expected.label,
              `${theme}/${locale}/${width}: concise action label`,
            );
            assert.equal(
              await button.getAttribute("title"),
              expected.title,
              `${theme}/${locale}/${width}: complete action tooltip`,
            );
          }
        }
      }
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
      // Regression: the compact style select must show the active style even
      // when that style is filtered out of the quick-style option list (it used
      // to render a blank / "just white" control).
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.evaluate(() =>
        window.ribbonReference.client.ui.update({
          toolbar: { view: "compact" },
        }),
      );
      await page.waitForTimeout(200);
      await page.evaluate(() =>
        window.ribbonReference.client.commands.execute("setStyleId", "header"),
      );
      await page.waitForTimeout(200);
      const compactStyle = await page.evaluate(() => {
        const select = document.querySelector(
          ".oasis-editor-style-gallery-compact",
        );
        if (!select) return null;
        return {
          value: select.value,
          text: select.options[select.selectedIndex]?.textContent?.trim() ?? "",
        };
      });
      assert.ok(
        compactStyle &&
          compactStyle.value === "header" &&
          compactStyle.text.length > 0,
        `${theme}/${locale}: compact style select must show the active style`,
      );
      await page.evaluate(() =>
        window.ribbonReference.client.ui.update({
          toolbar: { view: "ribbon" },
        }),
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
        pencilTipWidth: "pass",
        compactStyleVisible: "pass",
        errors,
      });
      await page.close();
    }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    `Verified ${evidence.length} theme/language combinations in ${engine}: composition, gallery, keyboard tabs, highlight-pencil tip width and the compact style select.`,
  );
} finally {
  await browser.close();
}
