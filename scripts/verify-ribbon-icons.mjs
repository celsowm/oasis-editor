#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const review = JSON.parse(
  await readFile(
    new URL("./ribbon-parity/icon-review.json", import.meta.url),
    "utf8",
  ),
);
const engine = process.env.RIBBON_BROWSER ?? "chromium";
const base = process.env.RIBBON_BASE_URL ?? "http://localhost:5173";
const output = resolve(
  process.env.RIBBON_OUTPUT ?? `debug_artifacts/ribbon-icons-${engine}`,
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/tests/browser/ribbon/icons.html`);
  await page.getByTestId("icon-review-sheet").waitFor();
  for (const candidate of review.candidates)
    for (const theme of ["light", "dark"])
      for (const surface of review.surfaces) {
        await page
          .getByLabel("Action", { exact: true })
          .selectOption(candidate.id);
        await page.getByLabel("Theme", { exact: true }).selectOption(theme);
        await page.getByLabel("Surface", { exact: true }).selectOption(surface);
        await page.waitForTimeout(30);
        assert.equal(
          await page.locator("i[data-lucide]").count(),
          0,
          "Unresolved review icon",
        );
        assert.equal(
          await page.locator(`[data-icon-name="${candidate.after}"]`).count(),
          9,
          "Review did not update to candidate",
        );
        assert.equal(
          await page.locator(".icon-review-sample svg").count(),
          18,
          "Stale SVG nodes accumulated during name changes",
        );
        const metrics = await page
          .locator(`[data-icon-name="${candidate.after}"]`)
          .evaluateAll((buttons) =>
            buttons.map((button) => {
              const svg = button.querySelector("svg");
              if (!svg) throw new Error("Missing SVG");
              const box = svg.getBBox();
              const rect = svg.getBoundingClientRect();
              let paint = button;
              while (
                paint.parentElement &&
                getComputedStyle(paint).backgroundColor === "rgba(0, 0, 0, 0)"
              )
                paint = paint.parentElement;
              return {
                background: getComputedStyle(paint).backgroundColor,
                foreground: getComputedStyle(button).color,
                accent: getComputedStyle(button)
                  .getPropertyValue("--oasis-accent")
                  .trim(),
                size: Number(button.dataset.iconSize),
                state: button.dataset.iconState,
                width: rect.width,
                height: rect.height,
                ink: {
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                },
                hidden: svg.getAttribute("aria-hidden"),
                accessibleName: button.getAttribute("aria-label"),
                fontDependent: Boolean(svg.querySelector("text")),
              };
            }),
          );
        for (const icon of metrics) {
          assert.equal(icon.width, icon.size);
          assert.equal(icon.height, icon.size);
          assert.ok(icon.ink.width > 0 && icon.ink.height > 0, "Empty SVG");
          assert.ok(
            icon.ink.x >= 0 &&
              icon.ink.y >= 0 &&
              icon.ink.x + icon.ink.width <= 24 &&
              icon.ink.y + icon.ink.height <= 24,
            "SVG ink outside viewBox",
          );
          assert.equal(icon.hidden, "true");
          assert.ok(icon.accessibleName);
          assert.equal(icon.fontDependent, false, "New glyph must use paths");
        }
        const screenshot = `${candidate.id}-${theme}-${surface}.png`;
        await page
          .locator("main")
          .screenshot({ path: resolve(output, screenshot) });
        records.push({
          sha,
          dirty,
          browser: engine,
          candidate: candidate.id,
          theme,
          surface,
          screenshot,
          metrics,
        });
      }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify({ records }, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} SVG review scenes in ${engine}; actual 16/20/24px, three states, both themes.`,
  );
} finally {
  await browser.close();
}
