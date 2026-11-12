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
const fixtureScenarios = {
  text: "text/caret",
  lists: "list/selected-item",
  styles: "style/caption-paragraph",
  table: "table/selected-cell",
  image: "image/selected-object",
  sections: "section/landscape-paragraph",
  review: "review/changed-text-range",
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
/**
 * Contextual popups must not outlive the context that owned them, stale
 * measurements must not be reused when a context returns, and a mixed cell
 * alignment selection must not masquerade as a uniform one.
 */
const transitionImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/mXPo5QAAAABJRU5ErkJggg==";
const transitionEvidence = [];
async function verifyContextTransitions() {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await page.goto(
    `${base}/tests/browser/ribbon/?${new URLSearchParams({ fixture: "table", theme: "light", locale: "en" })}`,
  );
  await waitForRibbonReference(page);
  await page.evaluate(
    async ({ image }) => {
      const c = window.ribbonReference.client;
      await c.import.html(
        `<p>Alpha target</p><table><tr><td>Cell one</td><td>Cell two</td></tr><tr><td>Cell three</td><td>Cell four</td></tr></table><p><img alt="Synthetic red square" width="48" height="48" src="${image}" /></p><p>Omega target</p>`,
      );
      c.history.clear();
      c.document.markClean();
    },
    { image: transitionImage },
  );

  const settle = async () => {
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-ribbon-group]")].every(
        (group) => Number(group.dataset.ribbonWidthFull) > 0,
      ),
    );
    await page.waitForTimeout(120);
  };
  const selectTarget = (target) =>
    page.evaluate(async ({ target }) => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } = await import(
        "/src/core/model.ts"
      );
      const c = window.ribbonReference.client;
      const paragraphs = getDocumentParagraphs(c.document.get());
      const text = (paragraph) =>
        paragraph.runs.map((run) => run.text).join("");
      if (target === "table") {
        const cell = paragraphs.find((paragraph) =>
          text(paragraph).includes("Cell one"),
        );
        c.selection.set({
          anchor: paragraphOffsetToPosition(cell, 2),
          focus: paragraphOffsetToPosition(cell, 2),
        });
      } else if (target === "text") {
        const paragraph = paragraphs.find((candidate) =>
          text(candidate).includes("Omega"),
        );
        c.selection.set({
          anchor: paragraphOffsetToPosition(paragraph, 0),
          focus: paragraphOffsetToPosition(paragraph, 5),
        });
      } else {
        const paragraph = paragraphs.find((candidate) =>
          candidate.runs.some((run) => run.kind === "image"),
        );
        c.selection.set({
          anchor: paragraphOffsetToPosition(paragraph, 0),
          focus: paragraphOffsetToPosition(paragraph, 1),
        });
      }
    }, { target });

  const snapshot = () =>
    page.evaluate(() => {
      const active = document.activeElement;
      const client = window.ribbonReference.client;
      return {
        tab: document.querySelector(".oasis-editor-ribbon-tab-active")
          ?.textContent,
        selectedTab: [
          ...document.querySelectorAll("[role=tab][aria-selected=true]"),
        ].map((el) => el.getAttribute("data-testid")),
        portals: document.querySelectorAll(".oasis-editor-portal-theme").length,
        portalMenus: [
          ...document.querySelectorAll(
            ".oasis-editor-portal-theme [role=menu],.oasis-editor-portal-theme [role=listbox]",
          ),
        ].filter((el) => el.getBoundingClientRect().width > 0).length,
        focus: {
          tag: active?.tagName ?? null,
          testId: active?.getAttribute?.("data-testid") ?? null,
          isBody: active === document.body,
        },
        groups: [...document.querySelectorAll("[data-ribbon-group]")].map(
          (group) => ({
            id: group.dataset.ribbonGroup,
            state: group.dataset.ribbonState,
            width: Math.ceil(group.getBoundingClientRect().width),
            allocated: Number(group.dataset.ribbonWidthAllocated),
            full: Number(group.dataset.ribbonWidthFull),
          }),
        ),
        document: JSON.stringify(client.document.get()),
        dirty: client.document.isDirty(),
        undo: client.history.canUndo(),
        tableContext: client.commands.state("tableContext").isActive,
        imageContext: client.commands.state("imageContext").isActive,
      };
    });

  const assertPopupClosed = (state, label) => {
    assert.equal(state.portals, 0, `${label}: popup portal survived`);
    assert.equal(state.portalMenus, 0, `${label}: popup menu survived`);
    assert.equal(state.focus.isBody, false, `${label}: focus fell to body`);
  };

  try {
    await selectTarget("table");
    await page.waitForTimeout(180);
    const tableBaseline = await snapshot();
    assert.equal(tableBaseline.tableContext, true);
    assert.ok(
      tableBaseline.selectedTab.includes("editor-ribbon-tab-tableDesign"),
      "Table context did not activate Table Design",
    );

    // A Home popup with keyboard focus inside must close, without mutating the
    // document or its history, when the selection enters an image context.
    await page.getByTestId("editor-ribbon-tab-home").click();
    await page.waitForTimeout(120);
    await page.getByTestId("editor-toolbar-underline-dropdown").click();
    await page.getByTestId("editor-toolbar-underline-style-double").focus();
    const homePopup = await snapshot();
    assert.equal(homePopup.portals, 1, "Home popup did not open");
    await selectTarget("image");
    await page.waitForTimeout(200);
    const afterImage = await snapshot();
    assertPopupClosed(afterImage, "Home popup on table -> image");
    assert.ok(
      afterImage.selectedTab.includes("editor-ribbon-tab-imageFormat"),
      "Image context did not activate Picture Format",
    );
    assert.equal(afterImage.imageContext, true);
    assert.equal(afterImage.tableContext, false);
    assert.equal(
      afterImage.document,
      tableBaseline.document,
      "Context change mutated the document",
    );
    assert.equal(afterImage.undo, false, "Context change pushed history");
    assert.equal(afterImage.dirty, false, "Context change dirtied the document");

    // Returning to the table must not resurrect the popup or reuse widths.
    await selectTarget("table");
    await page.waitForTimeout(220);
    const tableReturn = await snapshot();
    assertPopupClosed(tableReturn, "table context restored");
    assert.ok(
      tableReturn.selectedTab.includes("editor-ribbon-tab-tableDesign"),
      "Table context did not restore Table Design",
    );
    assert.deepEqual(
      tableReturn.groups,
      tableBaseline.groups,
      "Re-entering a context reused stale measurements",
    );

    // The collapsed-group popup follows the same policy at a narrow width.
    await page.setViewportSize({ width: 640, height: 900 });
    await selectTarget("table");
    await page.waitForTimeout(200);
    await page.getByTestId("editor-ribbon-tab-home").click();
    await page.waitForTimeout(120);
    await page.getByTestId("editor-ribbon-group-font").click();
    const collapsedPopup = await snapshot();
    assert.equal(collapsedPopup.portals, 1, "Collapsed group popup did not open");
    await selectTarget("image");
    await page.waitForTimeout(220);
    const afterCollapsed = await snapshot();
    assertPopupClosed(afterCollapsed, "collapsed Font popup -> image");
    assert.ok(
      afterCollapsed.selectedTab.includes("editor-ribbon-tab-imageFormat"),
      "Collapsed-popup transition did not activate Picture Format",
    );
    const collapsedScreenshot = "context-transition-640-image.png";
    await settle();
    await page
      .locator(".oasis-editor-toolbar")
      .screenshot({ path: resolve(output, collapsedScreenshot) });
    transitionEvidence.push({
      sha,
      dirty,
      browser: engine,
      theme: "light",
      locale: "en",
      scenario: "transition/collapsed-popup-to-image",
      screenshot: collapsedScreenshot,
      requestedWidth: 640,
      width: await page.evaluate(
        () => document.querySelector(".oasis-editor-toolbar").clientWidth,
      ),
      viewportHeight: 900,
      dpr: await page.evaluate(() => window.devicePixelRatio),
    });

    // Mixed cell alignment must be reported as mixed, and uniform state must
    // recover once a single cell is selected again.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(async () => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } =
        await import("/src/core/model.ts");
      const c = window.ribbonReference.client;
      const paragraphs = getDocumentParagraphs(c.document.get());
      const text = (paragraph) =>
        paragraph.runs.map((run) => run.text).join("");
      const first = paragraphs.find((paragraph) =>
        text(paragraph).includes("Cell one"),
      );
      const fourth = paragraphs.find((paragraph) =>
        text(paragraph).includes("Cell four"),
      );
      const place = (paragraph) => {
        c.selection.set({
          anchor: paragraphOffsetToPosition(paragraph, 2),
          focus: paragraphOffsetToPosition(paragraph, 2),
        });
      };
      place(first);
      c.commands.execute("tableSetCellAlignment", {
        horizontal: "right",
        vertical: "middle",
      });
      place(fourth);
      c.commands.execute("tableSetCellAlignment", {
        horizontal: "left",
        vertical: "top",
      });
      c.selection.set({
        anchor: paragraphOffsetToPosition(first, 2),
        focus: paragraphOffsetToPosition(fourth, 2),
      });
      c.history.clear();
      c.document.markClean();
    });
    await page.waitForTimeout(220);
    await page.getByTestId("editor-ribbon-tab-tableLayout").click();
    await page.waitForTimeout(150);
    await settle();
    const readMatrix = () =>
      page.getByTestId("editor-toolbar-cell-alignment-matrix").evaluate((el) => ({
        alignment: el.dataset.alignmentState,
        horizontal: el.dataset.horizontalState,
        vertical: el.dataset.verticalState,
        pressed: el.querySelectorAll('button[aria-pressed="true"]').length,
        description: el.getAttribute("aria-description"),
      }));
    const mixed = await readMatrix();
    assert.equal(mixed.alignment, "mixed", "Mixed cells were not reported mixed");
    assert.equal(mixed.pressed, 0, "Mixed selection pressed a single option");
    assert.ok(mixed.description, "Mixed selection kept a uniform description");
    const mixedScreenshot = "context-transition-mixed-alignment.png";
    await settle();
    await page
      .locator(".oasis-editor-toolbar")
      .screenshot({ path: resolve(output, mixedScreenshot) });
    transitionEvidence.push({
      sha,
      dirty,
      browser: engine,
      theme: "light",
      locale: "en",
      scenario: "transition/mixed-cell-alignment",
      screenshot: mixedScreenshot,
      requestedWidth: 1440,
      width: await page.evaluate(
        () => document.querySelector(".oasis-editor-toolbar").clientWidth,
      ),
      viewportHeight: 900,
      dpr: await page.evaluate(() => window.devicePixelRatio),
    });
    await page.evaluate(async () => {
      const { getDocumentParagraphs, paragraphOffsetToPosition } =
        await import("/src/core/model.ts");
      const c = window.ribbonReference.client;
      const first = getDocumentParagraphs(c.document.get()).find((paragraph) =>
        paragraph.runs.map((run) => run.text).join("").includes("Cell one"),
      );
      c.selection.set({
        anchor: paragraphOffsetToPosition(first, 2),
        focus: paragraphOffsetToPosition(first, 2),
      });
    });
    await page.waitForTimeout(180);
    const uniform = await readMatrix();
    assert.equal(uniform.alignment, "uniform");
    assert.equal(uniform.pressed, 1, "Uniform cell did not press one option");
    assert.equal(uniform.horizontal, "right");
    assert.equal(uniform.vertical, "middle");
    assert.equal(uniform.description, null);

    // Object selection: character formatting is disabled for the image run in
    // every entry point (toolbar, shortcut, programmatic) and never mutates the
    // document, while paragraph commands and Picture Format stay available.
    await selectTarget("image");
    await page.waitForTimeout(200);
    const readCommands = () =>
      page.evaluate(() => {
        const c = window.ribbonReference.client;
        const read = (command) => {
          const state = c.commands.state(command);
          return { enabled: state.isEnabled, active: state.isActive };
        };
        return {
          bold: read("bold"),
          italic: read("italic"),
          underline: read("underline"),
          color: read("setColor"),
          fontFamily: read("setFontFamily"),
          fontSize: read("setFontSize"),
          characterStyle: read("setCharacterStyleId"),
          alignCenter: read("alignCenter"),
          bulletList: read("bulletList"),
          paragraphStyle: read("setStyleId"),
          imageWidth: read("imageWidthCm"),
          imageCrop: read("imageCrop"),
          canExecuteBold: c.commands.canExecute("bold"),
          version: c.document.version(),
          dirty: c.document.isDirty(),
          undo: c.history.canUndo(),
          document: JSON.stringify(c.document.get()),
        };
      });
    const imageGate = await readCommands();
    for (const command of [
      "bold",
      "italic",
      "underline",
      "color",
      "fontFamily",
      "fontSize",
      "characterStyle",
    ]) {
      assert.equal(
        imageGate[command].enabled,
        false,
        `${command} stayed enabled for an inline image selection`,
      );
    }
    for (const command of [
      "alignCenter",
      "bulletList",
      "paragraphStyle",
      "imageWidth",
      "imageCrop",
    ]) {
      assert.equal(
        imageGate[command].enabled,
        true,
        `${command} should stay available for an inline image selection`,
      );
    }
    assert.equal(
      imageGate.canExecuteBold,
      false,
      "Programmatic bold bypassed the object-selection gate",
    );

    await page.getByTestId("editor-ribbon-tab-home").click();
    await page.waitForTimeout(160);
    const disabledControls = await page.evaluate(() =>
      [
        "editor-toolbar-bold",
        "editor-toolbar-italic",
        "editor-toolbar-underline",
        "editor-toolbar-font-family",
        "editor-toolbar-font-size",
      ].map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        return { id, disabled: Boolean(el?.disabled) };
      }),
    );
    for (const control of disabledControls) {
      assert.equal(
        control.disabled,
        true,
        `${control.id} did not reflect the object-selection gate`,
      );
    }

    const mod = await page.evaluate(() =>
      /Mac/i.test(navigator.userAgent) ? "Meta" : "Control",
    );
    await page.keyboard.press(`${mod}+b`);
    await page.waitForTimeout(160);
    const afterShortcut = await readCommands();
    assert.equal(
      afterShortcut.document,
      imageGate.document,
      "Ctrl/Cmd+B mutated an inline image selection",
    );
    assert.equal(afterShortcut.undo, false, "Shortcut pushed history");
    assert.equal(afterShortcut.dirty, false, "Shortcut dirtied the document");
    assert.equal(afterShortcut.bold.active, false);

    await selectTarget("text");
    await page.waitForTimeout(200);
    const textGate = await readCommands();
    for (const command of ["bold", "italic", "underline", "color"]) {
      assert.equal(
        textGate[command].enabled,
        true,
        `${command} stayed disabled for a text selection`,
      );
    }
    assert.equal(textGate.canExecuteBold, true);

    assert.deepEqual(errors, [], "Context transitions logged errors");
  } finally {
    await page.close();
  }
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
                dpr: window.devicePixelRatio,
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
            assert.equal(value.width, width, "Context host width mismatch");
            assert.equal(value.dpr, 1, "Context capture DPR mismatch");
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
          const unitGeometry = await page
            .locator(".oasis-editor-toolbar")
            .evaluate((toolbar) => ({
              width: toolbar.getBoundingClientRect().width,
              dpr: window.devicePixelRatio,
            }));
          assert.equal(
            unitGeometry.width,
            1440,
            "Unit capture host width mismatch",
          );
          assert.equal(unitGeometry.dpr, 1, "Unit capture DPR mismatch");
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
            ...unitGeometry,
            viewportHeight: 900,
            scenario: "layout/paragraph-metrics-units",
            screenshot: metricsScreenshot,
          });
          const unitSelection = await page.evaluate(() =>
            window.ribbonReference.client.selection.get(),
          );
          const unitDocument = await page.evaluate(() =>
            JSON.stringify(window.ribbonReference.client.document.get()),
          );

          // Word's Layout fields: the unit is part of the accessible name, the
          // decimal form follows the document language, and a draft only
          // commits on Enter/blur (the paragraph command returns focus to the
          // document, so per-keystroke commits would steal focus).
          const decimalSeparator = locale === "pt-BR" ? "," : ".";
          for (const [testId, unit] of [
            ["editor-toolbar-spacing-after", "pt"],
            ["editor-toolbar-indent-left", "cm"],
            ["editor-toolbar-indent-first-line", "cm"],
            ["editor-toolbar-indent-hanging", "cm"],
          ]) {
            const shape = await page.evaluate((id) => {
              const input = document.querySelector(`[data-testid="${id}"]`);
              return {
                type: input?.getAttribute("type") ?? "",
                inputMode: input?.getAttribute("inputmode") ?? "",
                ariaLabel: input?.getAttribute("aria-label") ?? "",
              };
            }, testId);
            assert.ok(
              shape.ariaLabel.endsWith(`(${unit})`),
              `${testId} accessible name should carry the unit: ${shape.ariaLabel}`,
            );
            assert.equal(
              shape.type,
              locale === "pt-BR" ? "text" : "number",
              `${testId} input type should follow the decimal separator`,
            );
            if (locale === "pt-BR")
              assert.equal(shape.inputMode, "decimal", `${testId} inputMode`);
          }

          await page.evaluate(() => {
            window.__unitPanel = document.querySelector(
              ".oasis-editor-portal-theme .oasis-editor-toolbar-panel",
            );
          });
          const initialSpacing = await page.evaluate(
            () =>
              window.ribbonReference.client.commands.state("setSpacingAfter")
                .value,
          );
          const spacingField = page.getByTestId("editor-toolbar-spacing-after");
          await spacingField.fill("12");
          assert.equal(
            await page.evaluate(
              () =>
                window.ribbonReference.client.commands.state("setSpacingAfter")
                  .value,
            ),
            initialSpacing,
            "Typing a metric must not commit it",
          );
          await spacingField.press("Enter");
          await page.waitForFunction(
            () =>
              Number(
                window.ribbonReference.client.commands.state("setSpacingAfter")
                  .value,
              ) === 16,
          );
          assert.equal(
            await page.evaluate(() => window.__unitPanel?.isConnected),
            true,
            "Metrics panel remounted when a metric committed",
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
          const indentField = page.getByTestId("editor-toolbar-indent-left");
          // 1.27 cm is exactly 48 px, so the committed display round-trips.
          await indentField.fill(`1${decimalSeparator}27`);
          await indentField.press("Enter");
          await page.waitForFunction(
            () =>
              Number(
                window.ribbonReference.client.commands.state("setIndentLeft")
                  .value,
              ) === 48,
          );
          assert.equal(
            await indentField.inputValue(),
            `1${decimalSeparator}27`,
            "Committed metric should display the localized decimal form",
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

          // Read-only documents keep the panel visible but grey every control
          // out, like Word, so a disabled command can never be executed.
          await page.evaluate(() =>
            window.ribbonReference.client.ui.setReadOnly(true),
          );
          await page.waitForTimeout(150);
          const readOnlyMetrics = await page.evaluate(() =>
            [
              "editor-toolbar-spacing-after",
              "editor-toolbar-indent-left",
              "editor-toolbar-indent-first-line",
              "editor-toolbar-indent-hanging",
              "editor-toolbar-page-break-before",
              "editor-toolbar-keep-with-next",
              "editor-toolbar-paragraph-shading",
              "editor-toolbar-paragraph-borders",
            ].map((id) => {
              const element = document.querySelector(`[data-testid="${id}"]`);
              return { id, disabled: Boolean(element?.disabled) };
            }),
          );
          for (const control of readOnlyMetrics)
            assert.equal(
              control.disabled,
              true,
              `${control.id} stayed enabled in a read-only document`,
            );
          await page.evaluate(() =>
            window.ribbonReference.client.ui.setReadOnly(false),
          );
          await page.waitForTimeout(150);

          await page.keyboard.press("Escape");
          await page.getByTestId("editor-toolbar-margins-dropdown").click();
          await page.getByTestId("editor-toolbar-margins-custom").click();
          for (const side of ["top", "bottom", "left", "right"])
            await assertUnit(page, `editor-toolbar-margin-${side}`, "cm");
          assert.equal(
            await page
              .getByTestId("editor-toolbar-margin-left")
              .getAttribute("type"),
            "text",
            "Custom margin input should accept the localized decimal separator",
          );
          assert.equal(
            await page
              .getByTestId("editor-toolbar-margin-left")
              .getAttribute("inputmode"),
            "decimal",
            "Custom margin input should request a decimal keypad",
          );
          assert.ok(
            (
              await page.getByTestId("editor-toolbar-margin-left").inputValue()
            ).includes(decimalSeparator),
            "Custom margin drafts should display the document decimal separator",
          );
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
            ...unitGeometry,
            viewportHeight: 900,
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
            const imageSeparator = locale === "pt-BR" ? "," : ".";
            const imageShape = await page.evaluate(() =>
              ["editor-toolbar-image-width", "editor-toolbar-image-height"].map(
                (id) => {
                  const input = document.querySelector(`[data-testid="${id}"]`);
                  return {
                    id,
                    ariaLabel: input?.getAttribute("aria-label") ?? "",
                    type: input?.getAttribute("type") ?? "",
                    inputMode: input?.getAttribute("inputmode") ?? "",
                    value: input?.value ?? "",
                  };
                },
              ),
            );
            for (const shape of imageShape) {
              assert.ok(
                shape.ariaLabel.endsWith("(cm)"),
                `${shape.id} accessible name should carry the unit: ${shape.ariaLabel}`,
              );
              assert.equal(
                shape.type,
                locale === "pt-BR" ? "text" : "number",
                `${shape.id} input type should follow the decimal separator`,
              );
              if (locale === "pt-BR")
                assert.equal(
                  shape.inputMode,
                  "decimal",
                  `${shape.id} inputMode`,
                );
              assert.ok(
                shape.value.includes(imageSeparator),
                `${shape.id} should display the document decimal separator: ${shape.value}`,
              );
            }

            // A size draft must not commit per keystroke: the command refocuses
            // the document, which used to drop the Picture Format contextual tab
            // and made multi-digit sizes impossible to type.
            const imageWidthField = page.getByTestId(
              "editor-toolbar-image-width",
            );
            const initialWidth = await page.evaluate(
              () =>
                window.ribbonReference.client.commands.state("imageWidthCm")
                  .value,
            );
            await imageWidthField.fill(`2${imageSeparator}5`);
            assert.equal(
              await page.evaluate(
                () =>
                  window.ribbonReference.client.commands.state("imageWidthCm")
                    .value,
              ),
              initialWidth,
              "Typing an image size must not commit it",
            );
            await imageWidthField.press("Enter");
            await page.waitForFunction(
              () =>
                window.ribbonReference.client.commands.state("imageWidthCm")
                  .value > 2,
            );
            assert.equal(
              await page
                .getByTestId("editor-ribbon-tab-imageFormat")
                .getAttribute("aria-selected"),
              "true",
              "Committing an image size should keep the Picture Format tab",
            );
            await page.evaluate(() =>
              window.ribbonReference.client.history.undo(),
            );
            await page.waitForFunction(
              (value) =>
                window.ribbonReference.client.commands.state("imageWidthCm")
                  .value === value,
              initialWidth,
            );

            // Read-only: the size fields and every other Picture Format action
            // must refuse to mutate the document.
            const imageDocument = await page.evaluate(() =>
              JSON.stringify(window.ribbonReference.client.document.get()),
            );
            await page.evaluate(() =>
              window.ribbonReference.client.ui.setReadOnly(true),
            );
            await page.waitForTimeout(200);
            for (const id of [
              "editor-toolbar-image-width",
              "editor-toolbar-image-height",
            ]) {
              assert.equal(
                await page.getByTestId(id).isDisabled(),
                true,
                `${id} should be disabled in a read-only document`,
              );
            }
            const refused = await page.evaluate(() => {
              try {
                window.ribbonReference.client.commands.execute(
                  "imageWidthCm",
                  "3",
                );
                return "executed";
              } catch (error) {
                return error.message;
              }
            });
            assert.match(refused, /Command disabled: imageWidthCm/);
            assert.equal(
              await page.evaluate(() =>
                JSON.stringify(window.ribbonReference.client.document.get()),
              ),
              imageDocument,
              "A read-only document must not be resized",
            );
            await page.evaluate(() =>
              window.ribbonReference.client.ui.setReadOnly(false),
            );
            await page.waitForTimeout(200);
            await page.getByTestId("editor-ribbon-tab-imageFormat").click();
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
  await verifyContextTransitions();
  const expectedLayouts = Object.values(cases).reduce(
    (total, tabs) => total + tabs.length * 2 * 2 * 5,
    0,
  );
  assert.equal(
    records.length,
    expectedLayouts,
    "Context capture matrix is incomplete",
  );
  assert.equal(
    unitEvidence.length,
    2 * 2 * 2,
    "Unit capture matrix is incomplete",
  );
  assert.equal(
    transitionEvidence.length,
    2,
    "Context transition evidence is incomplete",
  );
  for (const record of records) {
    assert.ok(record.scenario, `Missing scenario for ${record.screenshot}`);
    assert.ok(record.screenshot, "Missing screenshot filename");
    assert.equal(record.sha, sha, `Wrong source SHA for ${record.screenshot}`);
    assert.equal(
      record.dirty,
      dirty,
      `Inconsistent dirty state for ${record.screenshot}`,
    );
    assert.equal(
      record.browser,
      engine,
      `Wrong browser for ${record.screenshot}`,
    );
    assert.equal(
      record.requestedWidth,
      record.width,
      `Wrong measured width for ${record.screenshot}`,
    );
    assert.equal(record.dpr, 1, `Wrong DPR for ${record.screenshot}`);
  }
  for (const record of unitEvidence) {
    assert.ok(
      record.scenario,
      `Missing unit scenario for ${record.screenshot}`,
    );
    assert.equal(record.sha, sha, `Wrong source SHA for ${record.screenshot}`);
    assert.equal(
      record.dirty,
      dirty,
      `Inconsistent dirty state for ${record.screenshot}`,
    );
    assert.equal(
      record.browser,
      engine,
      `Wrong browser for ${record.screenshot}`,
    );
    assert.equal(
      record.requestedWidth,
      record.width,
      `Wrong measured width for ${record.screenshot}`,
    );
    assert.equal(record.dpr, 1, `Wrong DPR for ${record.screenshot}`);
  }
  for (const record of transitionEvidence) {
    assert.ok(
      record.scenario,
      `Missing transition scenario for ${record.screenshot}`,
    );
    assert.equal(record.sha, sha, `Wrong source SHA for ${record.screenshot}`);
    assert.equal(
      record.dirty,
      dirty,
      `Inconsistent dirty state for ${record.screenshot}`,
    );
    assert.equal(
      record.browser,
      engine,
      `Wrong browser for ${record.screenshot}`,
    );
    assert.equal(
      record.requestedWidth,
      record.width,
      `Wrong measured width for ${record.screenshot}`,
    );
    assert.equal(record.dpr, 1, `Wrong DPR for ${record.screenshot}`);
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(
      {
        browser: engine,
        hashes: Object.fromEntries(hashes),
        records,
        unitEvidence,
        transitionEvidence,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Verified ${records.length} contextual layouts and ${unitEvidence.length} unit screenshots in ${engine}; seven deterministic fixtures, selection/context removal, popup transitions and actual widths.`,
  );
} finally {
  await browser.close();
}
