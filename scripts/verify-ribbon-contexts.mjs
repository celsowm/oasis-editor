#!/usr/bin/env node
/* global process, document, window, console, URLSearchParams, Image, getComputedStyle */
import { verifyRibbonChevrons } from "./ribbon-chevron-geometry.mjs";
import { execFileSync } from "node:child_process";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-contexts-${engine}`,
);
await mkdir(output, { recursive: true });
const cases = {
  text: ["home"],
  lists: ["home"],
  styles: ["home"],
  table: ["tableDesign", "tableLayout", "home", "insert"],
  image: ["imageFormat", "insert", "home"],
  sections: ["layout", "insert"],
  review: ["review"],
};
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
const browser = await { chromium, firefox, webkit }[engine].launch();
const records = [],
  hashes = new Map();
const unitEvidence = [];
async function assertUnit(page, testId, unit) {
  const input = page.getByTestId(testId);
  const suffix = input
    .locator("xpath=..")
    .locator(".oasis-editor-ui-field-suffix");
  assert.equal(await suffix.textContent(), unit, `${testId} unit`);
  assert.ok(await suffix.isVisible(), `${testId} unit should be visible`);
  assert.ok(
    await input.evaluate((el) => {
      const suffix = el.parentElement?.querySelector(
        ".oasis-editor-ui-field-suffix",
      );
      if (!suffix) return false;
      const inputRect = el.getBoundingClientRect();
      const suffixRect = suffix.getBoundingClientRect();
      return (
        Math.abs(
          inputRect.top +
            inputRect.height / 2 -
            (suffixRect.top + suffixRect.height / 2),
        ) <= 2
      );
    }),
    `${testId} unit should align with the input`,
  );
  const contrast = await input.evaluate((el) => {
    const suffix = el.parentElement?.querySelector(
      ".oasis-editor-ui-field-suffix",
    );
    if (!suffix) return { input: 0, suffix: 0 };
    const luminance = (color) => {
      const channels = color
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!channels || channels.length !== 3) return 0;
      const linear = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const ratio = (foreground, background) => {
      const values = [luminance(foreground), luminance(background)].sort(
        (left, right) => right - left,
      );
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const background = getComputedStyle(el).backgroundColor;
    return {
      input: ratio(getComputedStyle(el).color, background),
      suffix: ratio(getComputedStyle(suffix).color, background),
    };
  });
  assert.ok(
    contrast.input >= 4.5 && contrast.suffix >= 4.5,
    `${testId} text and unit should retain readable contrast: ${JSON.stringify(contrast)}`,
  );
}
try {
  for (const [fixture, tabs] of Object.entries(cases))
    for (const theme of ["light", "dark"])
      for (const locale of ["en", "pt-BR"]) {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 1,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          `${base}/tests/browser/ribbon/?${new URLSearchParams({ fixture, theme, locale })}`,
        );
        await waitForRibbonReference(page);
        const baseline = await page.evaluate(() => {
          const { client, metadata } = window.ribbonReference;
          return {
            ...metadata,
            version: client.document.version(),
            selection: client.selection.get(),
            dirty: client.document.isDirty(),
            nodes: client.query
              .snapshot()
              .nodes.filter((node) => node.type === "paragraph")
              .map((node) => ({ id: node.id, list: node.node.list })),
            imageContext: client.commands.state("imageContext").isActive,
            tableContext: client.commands.state("tableContext").isActive,
            style: client.commands.state("setStyleId").value,
            revisions: client.commands.state("acceptRevisions").isEnabled,
            orientation: client.commands.state("toggleOrientation").isActive,
            comments: client.document.get().comments?.order.length ?? 0,
          };
        });
        assert.match(baseline.documentSha256, /^[a-f0-9]{64}$/);
        assert.match(baseline.fontSha256, /^[a-f0-9]{64}$/);
        assert.equal(baseline.dirty, false);
        if (hashes.has(fixture))
          assert.equal(
            baseline.documentSha256,
            hashes.get(fixture),
            "Synthetic content changed between sessions/themes/locales",
          );
        hashes.set(fixture, baseline.documentSha256);
        assert.equal(baseline.imageContext, fixture === "image");
        assert.equal(baseline.tableContext, fixture === "table");
        if (fixture === "styles") assert.equal(baseline.style, "Caption");
        if (fixture === "review") {
          assert.equal(baseline.revisions, true);
          assert.equal(baseline.comments, 2);
        }
        if (fixture === "sections")
          assert.equal(
            baseline.orientation,
            true,
            "Landscape fixture selected wrong section",
          );
        if (fixture === "lists")
          assert.ok(
            baseline.nodes.find(
              (node) => node.id === baseline.selection.anchor.paragraphId,
            )?.list,
            "List fixture selected a plain paragraph",
          );
        if (fixture === "image")
          await page.evaluate(async () => {
            const run = window.ribbonReference.client.query
              .snapshot()
              .nodes.find(
                (node) => node.type === "run" && node.node.kind === "image",
              ).node;
            const image = new Image();
            image.src = run.image.src;
            await image.decode();
            if (!image.naturalWidth)
              throw new Error("Synthetic bitmap did not decode");
          });
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
                groups: [...panel.children].map((group) => ({
                  id: group.dataset.ribbonGroup,
                  label: group.getAttribute("aria-label"),
                  state: group.dataset.ribbonState,
                  width: Math.ceil(group.getBoundingClientRect().width),
                  allocated: Number(group.dataset.ribbonWidthAllocated),
                  actions: [
                    ...group.querySelectorAll("button,select,input"),
                  ].filter((el) => el.getBoundingClientRect().width > 0).length,
                })),
              }));
            assert.ok(value.groups.length > 0);
            if (value.overflow === "false")
              assert.equal(value.width, width, "Context host width mismatch");
            for (const group of value.groups) {
              assert.ok(
                group.actions > 0,
                `Empty ${fixture}/${tab}/${group.id}`,
              );
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
              screenshot,
              selection: baseline.selection,
              definitionSha256: baseline.definitionSha256,
              viewportHeight: 900,
              dpr: 1,
              ...fontState,
              fixture,
              theme,
              locale,
              tab,
              requestedWidth: width,
              documentSha256: baseline.documentSha256,
              ...value,
            });
          }
        }
        assert.deepEqual(
          await page.evaluate(() => ({
            version: window.ribbonReference.client.document.version(),
            selection: window.ribbonReference.client.selection.get(),
          })),
          { version: baseline.version, selection: baseline.selection },
          "Context navigation changed content or selection",
        );
        if (fixture === "sections") {
          const header = page
            .getByTestId("editor-toolbar-header-footer")
            .filter({ visible: true });
          if (!(await header.count()))
            await page.getByTestId("editor-ribbon-group-headerFooter").click();
          await header.click();
          const labels = await page
            .locator(
              ".oasis-editor-action-menu .oasis-editor-tool-button-label:visible",
            )
            .evaluateAll((elements) =>
              elements.map((el) => ({
                text: el.textContent,
                width: el.clientWidth,
                scrollWidth: el.scrollWidth,
                height: el.clientHeight,
                scrollHeight: el.scrollHeight,
              })),
            );
          assert.ok(labels.length >= 7);
          for (const label of labels)
            assert.ok(
              label.scrollWidth <= label.width + 1 &&
                label.scrollHeight <= label.height + 1,
              `Clipped menu caption: ${label.text}`,
            );
          for (
            let i = 0;
            i < 3 &&
            (await page
              .locator(".oasis-editor-portal-theme [role=menu]:visible")
              .count());
            i++
          )
            await page.keyboard.press("Escape");

          await page.setViewportSize({ width: 1440, height: 900 });
          await page.getByTestId("editor-ribbon-tab-layout").click();
          await page.getByTestId("editor-toolbar-metrics-dropdown").click();
          await assertUnit(page, "editor-toolbar-spacing-after", "pt");
          await assertUnit(page, "editor-toolbar-indent-left", "cm");
          await assertUnit(page, "editor-toolbar-indent-first-line", "cm");
          await assertUnit(page, "editor-toolbar-indent-hanging", "cm");
          const metricsScreenshot = `${theme}-${locale}-layout-paragraph-metrics-units.png`;
          await page
            .locator(
              ".oasis-editor-portal-theme .oasis-editor-toolbar-panel:visible",
            )
            .last()
            .screenshot({ path: resolve(output, metricsScreenshot) });
          unitEvidence.push({
            sha,
            dirty,
            browser: engine,
            fixture,
            theme,
            locale,
            tab: "layout",
            requestedWidth: 1440,
            viewportHeight: 900,
            dpr: 1,
            scenario: "layout/paragraph-metrics-units",
            screenshot: metricsScreenshot,
          });
          const unitSelection = await page.evaluate(() =>
            window.ribbonReference.client.selection.get(),
          );
          const unitDocument = await page.evaluate(() =>
            JSON.stringify(window.ribbonReference.client.document.get()),
          );

          const initialSpacing = await page.evaluate(
            () =>
              window.ribbonReference.client.commands.state("setSpacingAfter")
                .value,
          );
          await page.getByTestId("editor-toolbar-spacing-after").fill("12");
          await page.waitForFunction(
            () =>
              Number(
                window.ribbonReference.client.commands.state("setSpacingAfter")
                  .value,
              ) === 16,
          );
          await page.evaluate(() =>
            window.ribbonReference.client.history.undo(),
          );
          await page.waitForFunction(
            (value) =>
              window.ribbonReference.client.commands.state("setSpacingAfter")
                .value === value,
            initialSpacing,
          );

          await page.keyboard.press("Escape");
          await page.getByTestId("editor-toolbar-metrics-dropdown").click();
          const initialIndent = await page.evaluate(
            () =>
              window.ribbonReference.client.commands.state("setIndentLeft")
                .value,
          );
          await page.getByTestId("editor-toolbar-indent-left").fill("2.54");
          await page.waitForFunction(
            () =>
              Number(
                window.ribbonReference.client.commands.state("setIndentLeft")
                  .value,
              ) === 96,
          );
          await page.evaluate(() =>
            window.ribbonReference.client.history.undo(),
          );
          await page.waitForFunction(
            (value) =>
              window.ribbonReference.client.commands.state("setIndentLeft")
                .value === value,
            initialIndent,
          );
          assert.equal(
            await page.evaluate(() =>
              JSON.stringify(window.ribbonReference.client.document.get()),
            ),
            unitDocument,
            "Unit conversion edit and undo should restore the exact document",
          );
          assert.deepEqual(
            await page.evaluate(() =>
              window.ribbonReference.client.selection.get(),
            ),
            unitSelection,
            "Unit conversion edit and undo should retain the selection",
          );

          await page.keyboard.press("Escape");
          await page.getByTestId("editor-toolbar-margins-dropdown").click();
          await page.getByTestId("editor-toolbar-margins-custom").click();
          for (const side of ["top", "bottom", "left", "right"])
            await assertUnit(page, `editor-toolbar-margin-${side}`, "cm");
          const marginsScreenshot = `${theme}-${locale}-layout-custom-margins-units.png`;
          await page
            .locator(
              ".oasis-editor-portal-theme .oasis-editor-margins-panel:visible",
            )
            .last()
            .screenshot({ path: resolve(output, marginsScreenshot) });
          unitEvidence.push({
            sha,
            dirty,
            browser: engine,
            fixture,
            theme,
            locale,
            tab: "layout",
            requestedWidth: 1440,
            viewportHeight: 900,
            dpr: 1,
            scenario: "layout/custom-margins-units",
            screenshot: marginsScreenshot,
          });
        }
        // Context removal must close contextual surfaces without leaving empty groups.
        if (["image", "table"].includes(fixture)) {
          if (fixture === "image") {
            await page.setViewportSize({ width: 1440, height: 900 });
            await page.getByTestId("editor-ribbon-tab-imageFormat").click();
            await assertUnit(page, "editor-toolbar-image-height", "cm");
            await assertUnit(page, "editor-toolbar-image-width", "cm");
          }
          await page
            .getByTestId(
              `editor-ribbon-tab-${fixture === "image" ? "imageFormat" : "tableLayout"}`,
            )
            .click();
          const menu = page
            .getByTestId("editor-ribbon-panel")
            .locator("button[aria-haspopup]:visible:not(:disabled)")
            .first();
          if (await menu.count()) await menu.click();
          await page.evaluate((fixture) => {
            const { client } = window.ribbonReference;
            const paragraph = client.query
              .snapshot()
              .nodes.filter((node) => node.type === "paragraph")
              .at(fixture === "image" ? 0 : -1).node;
            const position = {
              paragraphId: paragraph.id,
              runId: paragraph.runs[0].id,
              offset: 0,
            };
            client.selection.set({ anchor: position, focus: position });
          }, fixture);
          assert.equal(
            await page
              .getByTestId(
                `editor-ribbon-tab-${fixture === "image" ? "imageFormat" : "tableLayout"}`,
              )
              .count(),
            0,
          );
          assert.equal(
            await page
              .getByTestId("editor-ribbon-tab-home")
              .getAttribute("aria-selected"),
            "true",
          );
          assert.equal(
            await page
              .locator(".oasis-editor-portal-theme [role=menu]:visible")
              .count(),
            0,
          );
          assert.equal(
            await page.evaluate(() =>
              window.ribbonReference.client.document.version(),
            ),
            baseline.version,
          );
          await page.getByTestId("editor-ribbon-tab-insert").click();
          assert.equal(
            await page.locator('[data-ribbon-group="accessibility"]').count(),
            0,
          );
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(
      {
        browser: engine,
        hashes: Object.fromEntries(hashes),
        records,
        unitEvidence,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Verified ${records.length} contextual layouts and ${unitEvidence.length} unit screenshots in ${engine}; seven deterministic fixtures, selection/context removal and actual widths.`,
  );
} finally {
  await browser.close();
}
