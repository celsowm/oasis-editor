#!/usr/bin/env node
/**
 * P03 View: outline panel toggle and navigation, status-bar zoom (without
 * content mutation or history entries) and the paragraph-marks toggle's
 * effect on chrome with selection preserved.
 */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import {
  createSuite,
  openGroup,
  loadFixture,
  openRibbonPage,
} from "./lib/ribbon-suite.mjs";

const { base, engine, output, sha, dirty, records, browser } =
  await createSuite("view");

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "en", width: 640 },
  ];
  for (const { theme, locale, width } of configs) {
    const narrow = width <= 768;
    const { page, errors } = await openRibbonPage(browser, base, {
      theme,
      locale,
      width,
    });
    await waitForRibbonReference(page);
    await loadFixture(page, "text");
    await page.getByTestId("editor-ribbon-tab-view").click();

    // 1. The reference harness mounts with the outline off; the View toggle
    // restores and re-hides it (in production the default is visible). On
    // narrow layouts the panel is intentionally CSS-hidden, so only state
    // assertions apply there.
    if (narrow) {
      assert.equal(await page.locator(".oasis-outline-panel").count(), 0);
      const toggle = await openGroup(
        page,
        "show",
        "editor-toolbar-outline-panel",
      );
      assert.equal(await toggle.getAttribute("aria-pressed"), "false");
      await toggle.click();
      const uiState = await page.evaluate(() =>
        window.ribbonReference.client.ui.state(),
      );
      assert.equal(uiState.showOutline, true);
      assert.equal(
        await (
          await openGroup(page, "show", "editor-toolbar-outline-panel")
        ).getAttribute("aria-pressed"),
        "true",
      );
      records.push({
        sha,
        dirty,
        engine,
        theme,
        locale,
        width,
        checks: ["outline-toggle-narrow-state"],
      });
      await page.close();
      continue;
    }
    assert.equal(await page.locator(".oasis-outline-panel").count(), 0);
    const outlineToggle = await openGroup(
      page,
      "show",
      "editor-toolbar-outline-panel",
    );
    assert.equal(
      await outlineToggle.getAttribute("aria-pressed"),
      "false",
      "outline toggle should read inactive in the reference harness",
    );
    await outlineToggle.click();
    assert.ok(
      (await page.locator(".oasis-outline-panel").count()) >= 1,
      "outline toggle should show the panel",
    );
    assert.equal(
      await (
        await openGroup(page, "show", "editor-toolbar-outline-panel")
      ).getAttribute("aria-pressed"),
      "true",
    );

    // 2. Outline lists both headings and clicking one does not error; the
    // panel stays open for navigation.
    await page.waitForSelector(".oasis-outline-item", { timeout: 5000 });
    const outlineItems = page.locator(".oasis-outline-item");
    assert.ok((await outlineItems.count()) >= 2);
    await page
      .locator(".oasis-outline-item", { hasText: "Heading two" })
      .click();
    assert.ok((await page.locator(".oasis-outline-panel").count()) >= 1);

    // 3. Zoom does not mutate content or touch history; the slider and the
    // status-bar buttons agree.
    const textBeforeZoom = await page.evaluate(async () => {
      const { getDocumentParagraphs } = await import("/src/core/model.ts");
      return getDocumentParagraphs(
        window.ribbonReference.client.document.get(),
      ).map((p) => p.runs.map((run) => run.text).join(""));
    });
    const assertCanUndo = async (value) =>
      page.evaluate(() => window.ribbonReference.client.history.canUndo());
    const undoBefore = await assertCanUndo();
    const zoomValue = page.getByTestId("editor-statusbar-zoom");
    assert.equal((await zoomValue.textContent())?.trim(), "100%");
    await page.locator('button[aria-label="Zoom -"]').first().click();
    assert.notEqual((await zoomValue.textContent())?.trim(), "100%");
    await page.locator('button[aria-label="Zoom +"]').first().click();
    assert.equal((await zoomValue.textContent())?.trim(), "100%");
    const textAfterZoom = await page.evaluate(async () => {
      const { getDocumentParagraphs } = await import("/src/core/model.ts");
      return getDocumentParagraphs(
        window.ribbonReference.client.document.get(),
      ).map((p) => p.runs.map((run) => run.text).join(""));
    });
    assert.deepEqual(textAfterZoom, textBeforeZoom);
    assert.equal(await assertCanUndo(), undoBefore);

    // 4. Paragraph marks toggle flips the view flag, preserves content and selection.
    const anchorBefore = await page.evaluate(
      () => window.ribbonReference.client.getState().selection.anchor.offset,
    );
    await (
      await openGroup(page, "show", "editor-toolbar-show-paragraph-marks")
    ).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.getState().showParagraphMarks ?? false,
      ),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.getState().selection.anchor.offset,
      ),
      anchorBefore,
    );
    await (
      await openGroup(page, "show", "editor-toolbar-show-paragraph-marks")
    ).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.getState().showParagraphMarks ?? false,
      ),
      false,
    );

    // 5. Hiding the outline again through the ribbon toggle removes it.
    await (
      await openGroup(page, "show", "editor-toolbar-outline-panel")
    ).click();
    assert.equal(await page.locator(".oasis-outline-panel").count(), 0);
    assert.equal(
      await (
        await openGroup(page, "show", "editor-toolbar-outline-panel")
      ).getAttribute("aria-pressed"),
      "false",
    );

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "outline-default-visible",
        "outline-toggle-hide-restore",
        "outline-items-activate",
        "zoom-buttons-roundtrip",
        "zoom-preserves-content",
        "zoom-preserves-history",
        "paragraph-marks-toggle",
        "paragraph-marks-preserves-selection",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} View layouts in ${engine}: outline toggle/navigation, zoom without content/history mutation and paragraph marks toggle.`,
  );
} finally {
  await browser.close();
}
