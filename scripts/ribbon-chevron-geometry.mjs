import assert from "node:assert/strict";

/** Check rendered affordances, including portal menus and native select wrappers. */
export async function verifyRibbonChevrons(page) {
  const values = await page
    .locator(".oasis-editor-dropdown-chevron:visible")
    .evaluateAll((elements) =>
      elements.map((glyph) => {
        const rect = glyph.getBoundingClientRect();
        const select = glyph.closest(".oasis-editor-tool-select-control");
        const button = glyph.closest("button");
        const split = glyph.closest(".oasis-editor-color-split-ribbon-large");
        const inRibbon = glyph.closest(".oasis-editor-toolbar-view-ribbon");
        const stacked =
          inRibbon &&
          (split ||
            button?.matches(
              ".oasis-editor-tool-button-ribbon-large.oasis-editor-tool-button-dropdown,.oasis-editor-toolbar-item-ribbon-large .oasis-editor-tool-button-dropdown,.oasis-editor-table-borders-trigger",
            ));
        const owner = select ?? (stacked ? (split ?? button) : button);
        const bounds = owner?.getBoundingClientRect();
        return {
          id:
            button?.dataset.testid ??
            select?.querySelector("select")?.dataset.testid ??
            button?.getAttribute("aria-label"),
          width: rect.width,
          height: rect.height,
          hidden: glyph.getAttribute("aria-hidden"),
          stacked: Boolean(stacked),
          offset: bounds
            ? stacked
              ? bounds.bottom - (rect.top + rect.height / 2)
              : rect.top + rect.height / 2 - (bounds.top + bounds.height / 2)
            : null,
        };
      }),
    );
  for (const value of values) {
    assert.ok(
      Math.abs(value.width - 12) <= 0.1 && Math.abs(value.height - 12) <= 0.1,
      `Distorted chevron: ${JSON.stringify(value)}`,
    );
    assert.equal(
      value.hidden,
      "true",
      "Decorative chevron must not duplicate its control's name",
    );
    if (value.offset !== null)
      assert.ok(
        Math.abs(value.offset - (value.stacked ? 8 : 0)) <= 0.75,
        `Misaligned chevron: ${JSON.stringify(value)}`,
      );
  }
  return { chevrons: values, fontGlyphs: await verifyFontGlyphAlignment(page) };
}

async function verifyFontGlyphAlignment(page) {
  const values = await page.evaluate(() => {
    const buttons = ["bold", "italic", "underline"].map((id) =>
      [
        ...document.querySelectorAll(`[data-testid="editor-toolbar-${id}"]`),
      ].find((el) => el.getBoundingClientRect().width > 0),
    );
    if (buttons.some((button) => !button)) return [];
    return buttons.map((button, index) => {
      const glyph = button.querySelector(
        "svg,.oasis-editor-underline-split-glyph",
      );
      const id = ["bold", "italic", "underline"][index];
      if (!glyph) return { id, missing: true };
      const rect = glyph.getBoundingClientRect();
      if (glyph instanceof SVGElement) {
        const ink = glyph.getBBox(),
          scale = rect.height / glyph.viewBox.baseVal.height;
        const stroke =
          Number.parseFloat(getComputedStyle(glyph).strokeWidth) / 2;
        return {
          id,
          top: rect.top + (ink.y - stroke) * scale,
          bottom: rect.top + (ink.y + ink.height + stroke) * scale,
        };
      }
      const css = getComputedStyle(glyph);
      const canvas = document.createElement("canvas").getContext("2d");
      canvas.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const ink = canvas.measureText(glyph.textContent.trim());
      const baseline =
        rect.top +
        rect.height / 2 +
        (ink.fontBoundingBoxAscent - ink.fontBoundingBoxDescent) / 2;
      const line = button
        .querySelector(".oasis-editor-underline-split-indicator")
        .getBoundingClientRect();
      return {
        id,
        top: Math.min(baseline - ink.actualBoundingBoxAscent, line.top),
        bottom: Math.max(baseline + ink.actualBoundingBoxDescent, line.bottom),
      };
    });
  });
  if (values.length)
    for (const glyph of values) {
      assert.ok(!glyph.missing, `Missing Font affordance: ${glyph.id}`);
      assert.ok(
        Math.abs(glyph.top - values[0].top) <= 1 &&
          Math.abs(glyph.bottom - values[0].bottom) <= 1,
        `B/I/U ink alignment differs: ${JSON.stringify(values)}`,
      );
    }
  return values;
}
