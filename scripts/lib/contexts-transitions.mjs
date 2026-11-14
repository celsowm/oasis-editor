/**
 * Contextual popup transitions: must not outlive the context that owned them,
 * stale measurements must not be reused when a context returns, and a mixed
 * cell alignment selection must not masquerade as a uniform one.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { waitForRibbonReference } from "../ribbon-reference-ready.mjs";

export const transitionImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/mXPo5QAAAABJRU5ErkJggg==";

export async function verifyContextTransitions({
  browser,
  base,
  engine,
  sha,
  dirty,
  output,
}) {
  const transitionEvidence = [];
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
    page.evaluate(
      async ({ target }) => {
        const { getDocumentParagraphs, paragraphOffsetToPosition } =
          await import("/src/core/model.ts");
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
      },
      { target },
    );

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
    assert.equal(
      afterImage.dirty,
      false,
      "Context change dirtied the document",
    );

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
    assert.equal(
      collapsedPopup.portals,
      1,
      "Collapsed group popup did not open",
    );
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
      page
        .getByTestId("editor-toolbar-cell-alignment-matrix")
        .evaluate((el) => ({
          alignment: el.dataset.alignmentState,
          horizontal: el.dataset.horizontalState,
          vertical: el.dataset.verticalState,
          pressed: el.querySelectorAll('button[aria-pressed="true"]').length,
          description: el.getAttribute("aria-description"),
        }));
    const mixed = await readMatrix();
    assert.equal(
      mixed.alignment,
      "mixed",
      "Mixed cells were not reported mixed",
    );
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
        paragraph.runs
          .map((run) => run.text)
          .join("")
          .includes("Cell one"),
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
  return { transitionEvidence };
}
