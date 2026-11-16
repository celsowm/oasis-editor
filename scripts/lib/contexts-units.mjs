/**
 * Contrast, alignment and accessible-name checks for the Layout metric fields.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

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

/** Sections fixture: Layout tab metric units, document decimal separator,
 * commit-on-Enter semantics and read-only gating. Pushes evidence rows into
 * `ctx.unitEvidence`. */
export async function verifySectionUnits(page, ctx) {
  const { fixture, theme, locale, output, sha, dirty, engine, unitEvidence } =
    ctx;
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
  assert.equal(unitGeometry.width, 1440, "Unit capture host width mismatch");
  assert.equal(unitGeometry.dpr, 1, "Unit capture DPR mismatch");
  await page.getByTestId("editor-toolbar-section-dropdown").click();
  const setup = page.locator(".oasis-editor-section-panel:visible");
  const options = await setup.evaluate(menu => [...menu.querySelectorAll(".oasis-editor-section-action")].map(row => {
    const bounds = row.getBoundingClientRect();
    const icon = row.querySelector("svg").getBoundingClientRect();
    const label = row.querySelector(".oasis-editor-tool-button-label");
    return { x: icon.x, right: bounds.right, height: bounds.height, y: bounds.y, bottom: bounds.bottom,
      text: label.textContent.trim(), labelX: label.getBoundingClientRect().x,
      labelRight: label.getBoundingClientRect().right, pressed: row.getAttribute("aria-pressed") };
  }));
  assert.equal(options.length, 4);
  for (const [index, option] of options.entries()) {
    assert.ok(option.text && option.height >= 34);
    assert.ok(Math.abs(option.x-options[0].x)<=1 && Math.abs(option.labelX-options[0].labelX)<=1, "Page setup menu columns are misaligned");
    assert.ok(option.labelRight<=option.right+1, "Page setup option clipped");
    if(index) assert.ok(option.y>=options[index-1].bottom-1, "Page setup options overlap");
  }
  assert.equal(options.filter(option => option.pressed === "true").length, 1, "Exactly one orientation must be selected");
  await setup.screenshot({ path: resolve(output, `${theme}-${locale}-page-setup-menu.png`) });
  await page.keyboard.press("Escape");
  await page.getByTestId("editor-toolbar-metrics-dropdown").click();
  const paragraphMenu = page.locator(".oasis-editor-command-menu:visible");
  const rows = await paragraphMenu.evaluate(menu => {
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, height:r.height };
    };
    return [...menu.querySelectorAll(".oasis-editor-command-menu-section > .oasis-editor-tool-button, .oasis-editor-command-menu-field")].map(row => ({
      rect:rect(row),
      icon:rect(row.querySelector("svg")),
      label:row.querySelector(".oasis-editor-tool-button-label, .oasis-editor-ui-field-label")?.textContent?.trim(),
      text:rect(row.querySelector(".oasis-editor-tool-button-label, .oasis-editor-ui-field-label")),
    }));
  });
  assert.equal(rows.length, 4);
  for (const [index,row] of rows.entries()) {
    assert.ok(row.label, "Each paragraph menu action needs a visible label");
    assert.ok(row.rect.height >= 34, "Paragraph menu action is too short");
    assert.ok(Math.abs(row.icon.x - rows[0].icon.x) <= 1, "Paragraph icons must align");
    assert.ok(Math.abs(row.text.x - rows[0].text.x) <= 1, "Paragraph labels must align");
    assert.ok(row.text.right <= row.rect.right + 1, "Paragraph menu text is clipped");
    if (index) assert.ok(row.rect.y >= rows[index-1].rect.bottom - 1, "Paragraph menu rows overlap");
  }
  await assertUnit(page, "editor-toolbar-spacing-after", "pt");
  await assertUnit(page, "editor-toolbar-indent-left", "cm");
  await assertUnit(page, "editor-toolbar-indent-first-line", "cm");
  await assertUnit(page, "editor-toolbar-indent-hanging", "cm");
  const metricsScreenshot = `${theme}-${locale}-layout-paragraph-metrics-units.png`;
  await page
    .locator(".oasis-editor-portal-theme .oasis-editor-toolbar-panel:visible")
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
    () => window.ribbonReference.client.commands.state("setSpacingAfter").value,
  );
  const spacingField = page.getByTestId("editor-toolbar-spacing-after");
  await spacingField.fill("12");
  assert.equal(
    await page.evaluate(
      () =>
        window.ribbonReference.client.commands.state("setSpacingAfter").value,
    ),
    initialSpacing,
    "Typing a metric must not commit it",
  );
  await spacingField.press("Enter");
  await page.waitForFunction(
    () =>
      Number(
        window.ribbonReference.client.commands.state("setSpacingAfter").value,
      ) === 16,
  );
  assert.equal(
    await page.evaluate(() => window.__unitPanel?.isConnected),
    true,
    "Metrics panel remounted when a metric committed",
  );
  await page.evaluate(() => window.ribbonReference.client.history.undo());
  await page.waitForFunction(
    (value) =>
      window.ribbonReference.client.commands.state("setSpacingAfter").value ===
      value,
    initialSpacing,
  );

  await page.keyboard.press("Escape");
  await page.getByTestId("editor-toolbar-metrics-dropdown").click();
  const initialIndent = await page.evaluate(
    () => window.ribbonReference.client.commands.state("setIndentLeft").value,
  );
  const indentField = page.getByTestId("editor-toolbar-indent-left");
  // 1.27 cm is exactly 48 px, so the committed display round-trips.
  await indentField.fill(`1${decimalSeparator}27`);
  await indentField.press("Enter");
  await page.waitForFunction(
    () =>
      Number(
        window.ribbonReference.client.commands.state("setIndentLeft").value,
      ) === 48,
  );
  assert.equal(
    await indentField.inputValue(),
    `1${decimalSeparator}27`,
    "Committed metric should display the localized decimal form",
  );
  await page.evaluate(() => window.ribbonReference.client.history.undo());
  await page.waitForFunction(
    (value) =>
      window.ribbonReference.client.commands.state("setIndentLeft").value ===
      value,
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
    await page.evaluate(() => window.ribbonReference.client.selection.get()),
    unitSelection,
    "Unit conversion edit and undo should retain the selection",
  );

  // Read-only documents keep the panel visible but grey every control
  // out, like Word, so a disabled command can never be executed.
  await page.evaluate(() => window.ribbonReference.client.ui.setReadOnly(true));
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
    await page.getByTestId("editor-toolbar-margin-left").getAttribute("type"),
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
    .locator(".oasis-editor-portal-theme .oasis-editor-margins-panel:visible")
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

export { assertUnit };
