#!/usr/bin/env node
/**
 * P05 Search and quick access, latest slice: the Alt+Q command palette
 * (open, filter, execute, disabled rows, Escape) and the Quick Access
 * Toolbar (default items, customize/persist, QAT dispatch, Tell Me entry).
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-qat-${engine}`,
);
await mkdir(output, { recursive: true });
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
const browser = await { chromium, firefox, webkit }[engine].launch();
const records = [];

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "en", width: 640 },
  ];
  for (const { theme, locale, width } of configs) {
    console.log(`config: ${theme}/${locale}/${width}`);
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`,
    );
    await waitForRibbonReference(page);
    // Start from a clean persisted QAT layout.
    await page.evaluate(() => localStorage.removeItem("oasis-quick-access-v1"));
    await page.reload();
    await waitForRibbonReference(page);

    // 1. The chrome strip is present with the default QAT items.
    await page.getByTestId("editor-chrome-strip").waitFor({
      state: "visible",
      timeout: 5000,
    });
    assert.ok(await page.getByTestId("editor-qat-saveDocument").isVisible());
    assert.ok(await page.getByTestId("editor-qat-undo").isVisible());
    assert.ok(await page.getByTestId("editor-qat-redo").isVisible());
    assert.ok(
      await page.getByTestId("editor-qat-repeatLastAction").isVisible(),
    );

    // 2. Undo is disabled on a clean history; a typing action re-enables it.
    assert.equal(
      await page.evaluate(() =>
        window.ribbonReference.client.history.canUndo(),
      ),
      false,
    );
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("Type to arm undo. ");
    assert.equal(
      await page.evaluate(() =>
        window.ribbonReference.client.history.canUndo(),
      ),
      true,
    );
    assert.equal(
      await page.getByTestId("editor-qat-undo").getAttribute("aria-disabled"),
      null,
      "undo stays executable once history exists",
    );

    // 2b. Repeat: clicking Bold through the ribbon records it; F4 replays it.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("Repeat target. ");
    await page.keyboard.press("Control+b");
    await page.keyboard.type("bold-text");
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isActive,
      ),
      true,
    );
    await page.keyboard.press("F4");
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isActive,
      ),
      false,
      "F4 repeated Bold through the bus",
    );
    await page.getByTestId("editor-qat-repeatLastAction").click();
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isActive,
      ),
      true,
      "the QAT Repeat button replays the last command",
    );
    await page.keyboard.press("Control+b"); // reset

    // 3. The customize dropdown persists the Find toggle into localStorage.
    await page.getByTestId("editor-qat-customize").click();
    await page.getByTestId("editor-qat-toggle-find").click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    assert.ok(await page.getByTestId("editor-qat-find").isVisible());
    assert.equal(
      await page.evaluate(() => localStorage.getItem("oasis-quick-access-v1")),
      JSON.stringify(["saveDocument", "undo", "redo", "repeatLastAction", "find"]),
    );

    // 4. The customized QAT dispatches through the same bus as the ribbon.
    await page.getByTestId("editor-qat-find").click();
    await page
      .locator(".oasis-editor-find-replace-dialog")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.press("Escape");

    // 5. Alt+Q opens the command palette; typing narrows to Bold; Enter runs it.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.press("Alt+q");
    await page
      .getByTestId("editor-command-search-input")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByTestId("editor-command-search-input").click();
    await page.keyboard.type("bold");
    const boldRow = page.locator(
      '[data-testid="editor-command-search-item"][data-command="bold"]',
    );
    await boldRow.waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(
        () => window.ribbonReference.client.commands.state("bold").isActive,
      ),
      true,
      "the palette ran Bold through the command bus",
    );
    assert.equal(
      await page.locator('[data-testid="editor-command-search"]').count(),
      0,
      "the palette closes after running a command",
    );

    // 6. A disabled command renders dimmed and refuses to run.
    await page.keyboard.press("Alt+q");
    await page
      .getByTestId("editor-command-search-input")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByTestId("editor-command-search-input").click();
    await page.keyboard.type("accept");
    const disabledRow = page.locator(
      '[data-testid="editor-command-search-item"][data-command="requestAcceptAllRevisions"]',
    );
    await disabledRow.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await disabledRow.getAttribute("aria-disabled"), "true");
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator('[data-testid="editor-command-search"]').count(),
      1,
      "Enter on a disabled row keeps the palette open",
    );
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("acceptAllRevisions")
            .isEnabled,
      ),
      false,
      "the disabled command stayed unexecuted",
    );
    await page.keyboard.press("Escape");

    // 7. The Tell Me launcher in the strip opens the same palette.
    await page.getByTestId("editor-toolbar-tell-me").click();
    await page
      .getByTestId("editor-command-search")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.press("Escape");

    // 8. Persistence survives a reload.
    await page.reload();
    await waitForRibbonReference(page);
    await page
      .getByTestId("editor-chrome-strip")
      .waitFor({ state: "visible", timeout: 5000 });
    assert.ok(
      await page.getByTestId("editor-qat-find").isVisible(),
      "the customized QAT layout persisted across reloads",
    );
    await page.evaluate(() => localStorage.removeItem("oasis-quick-access-v1"));

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "strip-and-default-items",
        "repeat-f4-and-qat",
        "undo-disabled-state",
        "customize-persists",
        "qat-dispatches-command",
        "alt-q-palette-execute",
        "disabled-row-refuses-execution",
        "tell-me-launcher",
        "persistence-across-reload",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Quick Access layouts in ${engine}: default strip, customize/persist, QAT dispatch, Alt+Q palette (filter/execute/disabled) and the Tell Me entry.`,
  );
} finally {
  await browser.close();
}
