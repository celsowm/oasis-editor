/**
 * Context removal must close contextual surfaces without leaving empty groups.
 * Image fixtures additionally prove Picture Format size fields: localized
 * decimal separators, commit-on-Enter semantics and read-only gating.
 */
import assert from "node:assert/strict";
import { assertUnit } from "./contexts-units.mjs";

export async function verifyContextRemoval(page, ctx) {
  const {
    fixture,
    theme,
    locale,
    output,
    sha,
    dirty,
    engine,
    baseline,
    unitEvidence,
  } = ctx;
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
        assert.equal(shape.inputMode, "decimal", `${shape.id} inputMode`);
      assert.ok(
        shape.value.includes(imageSeparator),
        `${shape.id} should display the document decimal separator: ${shape.value}`,
      );
    }

    // A size draft must not commit per keystroke: the command refocuses
    // the document, which used to drop the Picture Format contextual tab
    // and made multi-digit sizes impossible to type.
    const imageWidthField = page.getByTestId("editor-toolbar-image-width");
    const initialWidth = await page.evaluate(
      () => window.ribbonReference.client.commands.state("imageWidthCm").value,
    );
    await imageWidthField.fill(`2${imageSeparator}5`);
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("imageWidthCm").value,
      ),
      initialWidth,
      "Typing an image size must not commit it",
    );
    await imageWidthField.press("Enter");
    await page.waitForFunction(
      () =>
        window.ribbonReference.client.commands.state("imageWidthCm").value > 2,
    );
    assert.equal(
      await page
        .getByTestId("editor-ribbon-tab-imageFormat")
        .getAttribute("aria-selected"),
      "true",
      "Committing an image size should keep the Picture Format tab",
    );
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    await page.waitForFunction(
      (value) =>
        window.ribbonReference.client.commands.state("imageWidthCm").value ===
        value,
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
        window.ribbonReference.client.commands.execute("imageWidthCm", "3");
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
    await page.evaluate(() => window.ribbonReference.client.document.version()),
    baseline.version,
  );
  await page.getByTestId("editor-ribbon-tab-insert").click();
  assert.equal(
    await page.locator('[data-ribbon-group="accessibility"]').count(),
    0,
  );
}
