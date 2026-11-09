#!/usr/bin/env node
/** Local Vite reference host, synthetic data only; output remains gitignored. */
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? "debug_artifacts/ribbon-reference",
);
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const launcher = { chromium, firefox, webkit }[engine];
if (!launcher) throw new Error(`Unknown browser ${engine}`);
const widths = (process.env.RIBBON_WIDTHS ?? "1440,1200,960,800,640")
  .split(",")
  .map(Number);
if (widths.some((width) => !Number.isFinite(width) || width < 1))
  throw new Error("Invalid widths");
const themes = (process.env.RIBBON_THEMES ?? "light,dark").split(",");
const locales = (process.env.RIBBON_LOCALES ?? "en,pt-BR").split(",");
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
await mkdir(output, { recursive: true });
const browser = await launcher.launch();
const records = [];
try {
  for (const theme of themes)
    for (const locale of locales)
      for (const width of widths) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          deviceScaleFactor: 1,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          `${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}&fixture=text`,
        );
        await page.waitForFunction(
          () => document.documentElement.dataset.referenceReady === "true",
        );
        await page.evaluate(() => document.fonts.ready);
        const toolbar = page.locator(".oasis-editor-toolbar");
        const tabs = await page
          .getByRole("tab")
          .evaluateAll((elements) => elements.map((el) => el.id));
        for (const tab of tabs) {
          await page.locator(`#${tab}`).click();
          // Allow ResizeObserver and animation-frame measurements to settle.
          await page.waitForTimeout(150);
          const measured = await toolbar.evaluate((el) => ({
            width: el.getBoundingClientRect().width,
            dpr: devicePixelRatio,
            fonts: document.fonts.status,
            groups: [...el.querySelectorAll("[data-ribbon-group]")].map(
              (group) => ({
                id: group.dataset.ribbonGroup,
                state: group.dataset.ribbonState,
                width: group.getBoundingClientRect().width,
                label: group.getAttribute("aria-label"),
              }),
            ),
            unresolvedIcons: el.querySelectorAll("i[data-lucide]").length,
          }));
          if (Math.abs(measured.width - width) > 1)
            throw new Error(
              `Host mismatch: requested ${width}, measured ${measured.width}`,
            );
          const name = `${theme}-${locale}-${width}-${tab.replace("oasis-editor-ribbon-tab-", "")}.png`;
          await toolbar.screenshot({ path: resolve(output, name) });
          records.push({
            sha,
            dirty,
            browser: engine,
            theme,
            locale,
            scenario: "text/caret",
            requestedWidth: width,
            ...measured,
            screenshot: name,
          });
        }
        if (errors.length) throw new Error(errors.join("\n"));
        await page.close();
      }
  await writeFile(
    resolve(output, "manifest.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(`Captured ${records.length} ribbons in ${output}`);
} finally {
  await browser.close();
}
