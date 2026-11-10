#!/usr/bin/env node
/** Deterministic Clipboard API adapters; real UI, model/history and native-event path. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox, webkit, expect } from "@playwright/test";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-clipboard-${engine}`,
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
async function visibleControl(page, id, group = "clipboard") {
  const control = page.locator(`[data-testid="editor-toolbar-${id}"]:visible`);
  if (!(await control.isVisible())) {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByTestId(`editor-ribbon-group-${group}`).click();
  }
  return control;
}
async function selectPaste(page, mode) {
  if (mode === "rich") return (await visibleControl(page, "paste")).click();
  await (await visibleControl(page, "paste-dropdown")).click();
  await page
    .locator(
      `[data-testid="editor-toolbar-paste-${mode === "text" ? "plain" : "merge"}"]:visible`,
    )
    .click();
}
async function seed(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs, paragraphOffsetToPosition } =
      await import("/src/core/model.ts");
    const c = window.ribbonReference.client;
    await c.import.html(
      '<p style="text-align:center"><span style="font-family:Arial;font-size:18px;color:#003399">before destination after</span></p><p>Untouched.</p>',
    );
    const p = getDocumentParagraphs(c.document.get())[0];
    c.selection.set({
      anchor: paragraphOffsetToPosition(p, 7),
      focus: paragraphOffsetToPosition(p, 18),
    });
    c.history.clear();
    c.document.markClean();
    return {
      text: c.query.getText(),
      selection: c.selection.get(),
      version: c.document.version(),
    };
  });
}
async function inspect(page) {
  return page.evaluate(() => {
    const c = window.ribbonReference.client;
    const paragraphs = c.query
      .snapshot()
      .nodes.filter((n) => n.type === "paragraph")
      .map((n) => n.node);
    return {
      text: c.query.getText(),
      selection: c.selection.get(),
      version: c.document.version(),
      canUndo: c.history.canUndo(),
      paragraphs,
    };
  });
}
async function nativePaste(page) {
  const handled = await page.getByTestId("editor-input").evaluate((input) => {
    const data = new DataTransfer();
    data.setData("text/plain", "source");
    data.setData(
      "text/html",
      '<p style="text-align:right"><strong style="font-family:Georgia;font-size:30px;color:#ff0000">source</strong></p>',
    );
    // Firefox does not expose supplied DataTransfer contents on an untrusted ClipboardEvent.
    // This is explicitly a synthetic event-path check, with no OS clipboard access.
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    input.dispatchEvent(event);
    return {
      handled: event.defaultPrevented,
      data: event.clipboardData?.getData("text/plain"),
    };
  });
  assert.equal(handled.data, "source");
  assert.equal(
    handled.handled,
    true,
    "Native event was not handled by the editor",
  );
}

function pasted(value, mode) {
  assert.equal(value.text, "before source after\nUntouched.");
  const p = value.paragraphs[0];
  const run = p.runs.find((r) => r.text.includes("source"));
  assert.ok(run, "Missing paste result");
  if (mode === "rich") {
    assert.equal(run.styles.bold, true);
    assert.equal(run.styles.fontFamily, "Georgia");
    assert.equal(run.styles.fontSize, 30);
  } else if (mode === "merge") {
    assert.equal(run.styles.bold, true);
    assert.equal(run.styles.fontFamily, "Arial");
    assert.equal(run.styles.fontSize, 18);
    assert.equal(run.styles.color, "rgb(0, 51, 153)");
    assert.equal(p.style.align, "center");
  } else assert.notEqual(run.styles?.bold, true);
  assert.equal(value.canUndo, true);
}
try {
  for (const theme of ["light", "dark"])
    for (const locale of ["en", "pt-BR"])
      for (const width of [1440, 640]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          deviceScaleFactor: 1,
        });
        await context.addInitScript(() => {
          window.clipboardScenario = "denied";
          window.clipboardWrites = [];
          const denied = () => {
            throw new DOMException("Simulated refusal", "NotAllowedError");
          };
          Object.defineProperty(document, "execCommand", {
            configurable: true,
            value: () => false,
          });
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              read: async () => {
                if (window.clipboardScenario === "denied") return denied();
                if (window.clipboardScenario === "empty") return [];
                return [
                  {
                    types: ["text/plain", "text/html"],
                    getType: async (type) =>
                      new Blob(
                        [
                          type === "text/html"
                            ? '<p style="text-align:right"><strong style="font-family:Georgia;font-size:30px;color:#ff0000">source</strong></p>'
                            : "source",
                        ],
                        { type },
                      ),
                  },
                ];
              },
              readText: async () => {
                if (window.clipboardScenario === "denied") return denied();
                return window.clipboardScenario === "empty" ? "" : "source";
              },
              write: async (items) => {
                if (window.clipboardScenario === "denied") return denied();
                window.clipboardWrites.push(
                  ...(await Promise.all(
                    items.map(async (item) => ({
                      text: await (await item.getType("text/plain")).text(),
                      html: await (await item.getType("text/html")).text(),
                    })),
                  )),
                );
              },
              writeText: async (text) => {
                if (window.clipboardScenario === "denied") return denied();
                window.clipboardWrites.push({ text });
              },
            },
          });
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          `${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`,
        );
        await waitForRibbonReference(page);
        for (const mode of ["rich", "text", "merge"]) {
          const before = await seed(page);
          await page.evaluate(() => (window.clipboardScenario = "denied"));
          await selectPaste(page, mode);
          const feedback = page.getByTestId("editor-clipboard-feedback");
          await feedback.waitFor();
          await expect(
            page.locator(".oasis-editor-ribbon-collapsed-menu"),
          ).toHaveCount(0);
          await expect(
            page.locator(
              '[data-testid="editor-toolbar-paste-dropdown"][aria-expanded="true"]',
            ),
          ).toHaveCount(0);
          const failed = await inspect(page);
          assert.equal(failed.text, before.text);
          assert.equal(failed.version, before.version);
          assert.deepEqual(failed.selection, before.selection);
          assert.equal(failed.canUndo, false);
          await expect(page.getByTestId("editor-input")).toBeFocused();
          const rect = await feedback.boundingBox();
          assert.ok(
            rect.x >= 0 &&
              rect.y >= 0 &&
              rect.x + rect.width <= width + 1 &&
              rect.y + rect.height <= 900,
            "Feedback escaped the viewport",
          );
          await feedback.screenshot({
            path: resolve(
              output,
              `${theme}-${locale}-${width}-${mode}-denied.png`,
            ),
          });
          await page.keyboard.press("Escape");
          await page.keyboard.press("Escape");
          await nativePaste(page);
          const recovered = await inspect(page);
          assert.deepEqual(errors, [], "Native paste handler raised an error");
          pasted(recovered, mode);
          await expect(feedback).toHaveCount(0);
          await (await visibleControl(page, "undo", "history")).click();
          assert.equal((await inspect(page)).text, before.text);
          assert.equal((await inspect(page)).canUndo, false);
          await seed(page);
          await page.evaluate(() => (window.clipboardScenario = "success"));
          await selectPaste(page, mode);
          await page.waitForFunction(() =>
            window.ribbonReference.client.query.getText().includes("source"),
          );
          pasted(await inspect(page), mode);
          await (await visibleControl(page, "undo", "history")).click();
          assert.equal((await inspect(page)).text, before.text);
          assert.equal((await inspect(page)).canUndo, false);
          records.push({
            sha,
            dirty,
            engine,
            theme,
            locale,
            width,
            mode,
            clipboard: "deterministic adapter",
            nativeEvent: "synthetic; OS permissions/gesture unverified",
            checks: [
              "denied-no-mutation-or-history",
              "original-target",
              "visible-localized-feedback",
              "focus-for-keyboard",
              "native-mode-recovery",
              "API-mode-result",
              "one-step-undo",
            ],
          });
        }
        const before = await seed(page);
        await page.evaluate(() => (window.clipboardScenario = "denied"));
        await (await visibleControl(page, "cut")).click();
        await page.getByTestId("editor-clipboard-feedback").waitFor();
        assert.equal((await inspect(page)).text, before.text);
        assert.equal((await inspect(page)).canUndo, false);
        await page.getByTestId("editor-clipboard-feedback-close").click();
        await page.evaluate(() => (window.clipboardScenario = "success"));
        await (await visibleControl(page, "copy")).click();
        await page.waitForFunction(() => window.clipboardWrites.length > 0);
        assert.equal((await inspect(page)).version, before.version);
        assert.equal(
          await page.evaluate(() => window.clipboardWrites.at(-1).text),
          "destination",
        );
        await (await visibleControl(page, "cut")).click();
        await page.waitForFunction(
          () =>
            !window.ribbonReference.client.query
              .getText()
              .includes("destination"),
        );
        await (await visibleControl(page, "undo", "history")).click();
        assert.equal((await inspect(page)).text, before.text);
        assert.equal((await inspect(page)).canUndo, false);
        assert.deepEqual(errors, []);
        await context.close();
      }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} Clipboard adapter/recovery workflows in ${engine}, plus safe Cut/Copy, original targets and one-step undo. Native OS permission/gesture behavior remains unverified.`,
  );
} finally {
  await browser.close();
}
