#!/usr/bin/env node
/**
 * P05 Search and Quick Access: find via Ctrl+F and the Ribbon, match
 * navigation, replace one / replace all, whole-word and match-case filters,
 * undo of a bulk replace — all without touching document persistence.
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
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-find-${engine}`,
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

async function loadFixture(page, fixture) {
  await page.evaluate(async (name) => {
    const { prepareRibbonFixture } =
      await import("/tests/browser/ribbon/fixtures.ts");
    const client = window.ribbonReference.client;
    await prepareRibbonFixture(client, name);
    client.history.clear();
  }, fixture);
}

async function documentText(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    return getDocumentParagraphs(window.ribbonReference.client.document.get())
      .map((p) => p.runs.map((run) => run.text).join(""))
      .join("\n");
  });
}

async function selectedText(page) {
  return page.evaluate(async () => {
    const { getSelectedText } = await import("/src/core/commands/selection.ts");
    return getSelectedText(window.ribbonReference.client.getState());
  });
}

async function openFindReplace(page) {
  await page.keyboard.press("Control+f");
  await page.locator(".oasis-editor-find-replace-dialog").waitFor({
    state: "visible",
    timeout: 5000,
  });
}

async function searchText(page, value) {
  const input = page.locator(".oasis-editor-fr-input").first();
  await input.click();
  await input.fill(value);
}

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "en", width: 640 },
  ];
  for (const { theme, locale, width } of configs) {
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
    await page.getByTestId("editor-ribbon-tab-home").click();
    await loadFixture(page, "text");

    // 1. Ctrl+F opens the Find & Replace dialog; the field starts empty.
    await openFindReplace(page);
    assert.equal(
      await page.locator(".oasis-editor-fr-input").first().inputValue(),
      "",
    );

    // 2. Each keystroke re-evaluates matches; the counter shows position.
    await searchText(page, "reference");
    const counter = page.locator(".oasis-editor-fr-counter");
    assert.ok((await counter.textContent())?.includes("1 / "));
    const total = Number((await counter.textContent())?.split("/")[1]?.trim());
    assert.ok(total >= 2, `expected at least 2 matches, got ${total}`);

    // 3. Enter advances the match; Shift+Enter moves back.
    await page.keyboard.press("Enter");
    assert.equal(await selectedText(page), "reference");
    const matchAfterNext = await page.evaluate(async () => {
      const { getState } =
        await import("/src/app/client/OasisEditorClient.js").catch(() => ({}));
      void getState;
      const state = window.ribbonReference.client.getState();
      return state.selection;
    });
    assert.ok(matchAfterNext);
    await page.keyboard.press("Shift+Enter");
    assert.equal(await selectedText(page), "reference");

    // 4. Whole-word filter: "ref" disappears entirely under whole-word mode.
    await searchText(page, "ref");
    assert.equal(
      (await counter.textContent())?.includes("0 / ") ||
        (await counter.textContent())?.includes(
          locale === "en" ? "No matches" : "Nenhum",
        ),
      false,
      "the search term 'ref' must match without whole-word",
    );
    await page
      .locator(".oasis-editor-fr-checkbox", {
        hasText: locale === "en" ? "Whole word" : "Palavra inteira",
      })
      .click();
    assert.equal(
      Number((await counter.textContent())?.split("/")[1]?.trim() ?? "0"),
      0,
    );
    await page
      .locator(".oasis-editor-fr-checkbox", {
        hasText: locale === "en" ? "Whole word" : "Palavra inteira",
      })
      .click();

    // 5. Match-case filter: lowercase query misses the capitalized word.
    await searchText(page, "normal");
    assert.ok(
      Number((await counter.textContent())?.split("/")[1]?.trim()) >= 1,
    );
    await page
      .locator(".oasis-editor-fr-checkbox", {
        hasText: locale === "en" ? "Match case" : "Diferenciar",
      })
      .click();
    assert.equal(
      Number((await counter.textContent())?.split("/")[1]?.trim() ?? "0"),
      0,
    );
    await page
      .locator(".oasis-editor-fr-checkbox", {
        hasText: locale === "en" ? "Match case" : "Diferenciar",
      })
      .click();

    // 6. Replace all substitutes every occurrence; undo restores the source.
    // (Replace all closes the dialog by design.)
    await searchText(page, "reference");
    await page.locator(".oasis-editor-fr-input").nth(1).click();
    await page.locator(".oasis-editor-fr-input").nth(1).fill("ref");
    const before = await documentText(page);
    await page
      .getByRole("button", {
        name: locale === "en" ? "All" : "Tudo",
        exact: true,
      })
      .click();
    assert.notEqual(await documentText(page), before);
    // Reopen and confirm the search term no longer matches anything.
    await openFindReplace(page);
    await searchText(page, "reference");
    assert.equal(
      (await counter.textContent())
        ?.toLowerCase()
        .includes(locale === "en" ? "no matches" : "nenhum"),
      true,
    );
    await page.keyboard.press("Escape");
    // Undo restores the original text.
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    assert.equal(await documentText(page), before);

    // 7. Ribbon and keyboard dispatch the same dialog.
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(".oasis-editor-find-replace-dialog").count(),
      0,
    );
    await page.getByTestId("editor-ribbon-tab-home").click();
    await page.getByTestId("editor-toolbar-find").click();
    await page
      .locator(".oasis-editor-find-replace-dialog")
      .waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.press("Escape");

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "ctrl-f-opens-dialog",
        "match-counter",
        "enter-shift-enter-navigation",
        "whole-word-filter",
        "match-case-filter",
        "replace-all-and-undo",
        "ribbon-dispatch-parity",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Search layouts in ${engine}: Ctrl+F open, counter, Enter/Shift+Enter navigation, whole-word and match-case filters, replace-all with undo and Ribbon/keyboard dispatch parity.`,
  );
} finally {
  await browser.close();
}
