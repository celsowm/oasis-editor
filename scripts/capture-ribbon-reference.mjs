#!/usr/bin/env node
/** Synthetic-only reference capture, including optional portalled menu paths. */
import { chromium, firefox, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import assert from "node:assert/strict";

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
const height = Number(process.env.RIBBON_HEIGHT ?? 900);
const dpr = Number(process.env.RIBBON_DPR ?? 1);
if (
  [...widths, height, dpr].some(
    (value) => !Number.isFinite(value) || value <= 0,
  )
)
  throw new Error("Invalid capture geometry");
const themes = (process.env.RIBBON_THEMES ?? "light,dark").split(",");
const locales = (process.env.RIBBON_LOCALES ?? "en,pt-BR").split(",");
const fixtures = (process.env.RIBBON_FIXTURES ?? "text").split(",");
const requestedTabs = process.env.RIBBON_TABS?.split(",");
const maxMenuDepth = Number(process.env.RIBBON_MENU_DEPTH ?? 4);
if (!Number.isInteger(maxMenuDepth) || maxMenuDepth < 1 || maxMenuDepth > 8)
  throw new Error("Invalid menu depth");
const includeMenus = process.env.RIBBON_MENUS === "1";
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
await mkdir(output, { recursive: true });
const browser = await launcher.launch();
const records = [];
const popupSelector =
  ".oasis-editor-portal-theme [role=menu], .oasis-editor-portal-theme [role=dialog], .oasis-editor-portal-theme [role=listbox]";
const popups = (page) => page.locator(popupSelector).filter({ visible: true });
const triggers = (locator) =>
  locator
    .locator("button[aria-haspopup]")
    .filter({ visible: true })
    .evaluateAll((elements) =>
      elements
        .filter((el) => !el.disabled)
        .map((el) => ({
          id: el.dataset.testid ?? null,
          label: el.getAttribute("aria-label") || el.textContent.trim(),
        })),
    );
const trigger = (page, item) =>
  (item.id
    ? page.getByTestId(item.id)
    : page.getByRole("button", { name: item.label, exact: true })
  ).filter({ visible: true });
const token = (item) =>
  (item.id ?? item.label)
    .normalize("NFKD")
    .replace(/[^a-z0-9-]+/gi, "-")
    .slice(0, 64);
async function closePopups(page) {
  for (
    let attempt = 0;
    attempt < 8 && (await popups(page).count());
    attempt++
  ) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(20);
  }
  assert.equal(
    await popups(page).count(),
    0,
    "Popup did not dismiss with Escape",
  );
}
async function openPath(page, path) {
  await closePopups(page);
  for (const item of path) {
    await trigger(page, item).click();
    await page.waitForTimeout(70);
  }
  assert.ok(
    (await popups(page).count()) > 0,
    `No popup for ${path.map(token).join("/")}`,
  );
}
try {
  for (const fixture of fixtures)
    for (const theme of themes)
      for (const locale of locales)
        for (const width of widths) {
          const page = await browser.newPage({
            viewport: { width, height },
            deviceScaleFactor: dpr,
          });
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await page.goto(
            `${base}/tests/browser/ribbon/?${new URLSearchParams({ theme, locale, fixture })}`,
          );
          await waitForRibbonReference(page);
          const baseline = await page.evaluate(() => ({
            version: window.ribbonReference.client.document.version(),
            selection: window.ribbonReference.client.selection.get(),
            ...window.ribbonReference.metadata,
          }));
          const toolbar = page.locator(".oasis-editor-toolbar");
          const availableTabs = await page
            .getByRole("tab")
            .evaluateAll((elements) =>
              elements.map((el) =>
                el.id.replace("oasis-editor-ribbon-tab-", ""),
              ),
            );
          for (const tab of requestedTabs ?? [])
            assert.ok(
              availableTabs.includes(tab),
              `${fixture} does not expose requested tab ${tab}`,
            );
          const tabs = requestedTabs ?? availableTabs;
          // Preserve document geometry but omit document pixels from menu evidence.
          await page.addStyleTag({
            content:
              ".oasis-editor-editor-shell, .oasis-editor-statusbar { visibility: hidden !important; }",
          });
          for (const tab of tabs) {
            await page.getByTestId(`editor-ribbon-tab-${tab}`).click();
            await page.waitForTimeout(150);
            const measured = await toolbar.evaluate((el) => ({
              width: el.getBoundingClientRect().width,
              dpr: devicePixelRatio,
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
            assert.ok(
              Math.abs(measured.width - width) <= 1,
              `Host mismatch: requested ${width}, measured ${measured.width}`,
            );
            const prefix = `${fixture === "text" ? "" : `${fixture}-`}${theme}-${locale}-${width}-${tab}`;
            const record = async (name, path = []) => {
              const frame = await toolbar.boundingBox();
              assert.ok(frame);
              let bottom = frame.y + frame.height;
              for (const box of await popups(page).evaluateAll((elements) =>
                elements.map((el) => {
                  const r = el.getBoundingClientRect();
                  return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
                }),
              )) {
                assert.ok(
                  box.x >= -1 &&
                    box.y >= -1 &&
                    box.right <= width + 1 &&
                    box.bottom <= height + 1,
                  `Popup outside viewport: ${JSON.stringify({ fixture, tab, path, box, width, height })}`,
                );
                bottom = Math.max(bottom, box.bottom);
              }
              const clip = {
                x: 0,
                y: frame.y,
                width,
                height: Math.ceil(bottom - frame.y),
              };
              const fontState = await page.evaluate(() =>
                window.ribbonReference.fingerprintFonts(),
              );
              await page.screenshot({ path: resolve(output, name), clip });
              const current = await page.evaluate(() => ({
                version: window.ribbonReference.client.document.version(),
                selection: window.ribbonReference.client.selection.get(),
              }));
              assert.deepEqual(
                current,
                { version: baseline.version, selection: baseline.selection },
                "Capture changed document or selection",
              );
              const runtimeIcons = await page
                .locator(".oasis-editor-toolbar, .oasis-editor-portal-theme")
                .evaluateAll((roots) => {
                  const visible = (el) =>
                    el.getBoundingClientRect().width > 0 &&
                    getComputedStyle(el).visibility !== "hidden";
                  const placeholders = roots
                    .flatMap((root) => [
                      ...root.querySelectorAll("i[data-lucide]"),
                    ])
                    .filter(visible)
                    .map((el) => el.getAttribute("data-lucide"));
                  const svgs = roots
                    .flatMap((root) => [...root.querySelectorAll("svg")])
                    .filter(visible);
                  const empty = svgs
                    .filter((svg) => {
                      const box = svg.getBBox();
                      return box.width <= 0 && box.height <= 0;
                    })
                    .map(
                      (svg) =>
                        svg
                          .closest("[data-testid]")
                          ?.getAttribute("data-testid") ?? "unnamed SVG",
                    );
                  return {
                    rendered: svgs.length,
                    unresolved: placeholders,
                    empty,
                  };
                });
              assert.deepEqual(
                runtimeIcons.unresolved,
                [],
                "Unresolved popup icon",
              );
              assert.deepEqual(runtimeIcons.empty, [], "Empty popup icon");
              records.push({
                runtimeIcons,
                sha,
                dirty,
                browser: engine,
                theme,
                locale,
                fixture,
                scenario: `${fixture}/${fixture === "image" ? "object" : fixture === "review" ? "range" : "caret"}`,
                requestedWidth: width,
                viewportHeight: height,
                ...measured,
                documentSha256: baseline.documentSha256,
                definitionSha256: baseline.definitionSha256,
                fontSha256: fontState.fontSha256,
                fonts: fontState.fonts,
                selection: baseline.selection,
                popupPath: path,
                screenshot: name,
                clip,
              });
            };
            await record(`${prefix}.png`);
            if (includeMenus) {
              const queue = (await triggers(toolbar)).map((root) => [root]);
              const visited = new Set();
              while (queue.length) {
                const path = queue.shift();
                const key = JSON.stringify(path);
                if (visited.has(key)) continue;
                visited.add(key);
                assert.ok(
                  visited.size <= 250,
                  "Menu exploration exceeded 250 paths in one tab",
                );
                await openPath(page, path);
                const hash = createHash("sha256")
                  .update(key)
                  .digest("hex")
                  .slice(0, 8);
                const name = `${prefix}--${path.map(token).join("--").slice(0, 130)}-${hash}.png`;
                await record(name, path);
                const children = (await triggers(popups(page).last())).filter(
                  (item) =>
                    !path.some(
                      (ancestor) =>
                        ancestor.id === item.id &&
                        ancestor.label === item.label,
                    ),
                );
                assert.ok(
                  !children.length || path.length < maxMenuDepth,
                  `Menu depth exceeded for ${key}`,
                );
                for (const child of children) queue.push([...path, child]);
                await closePopups(page);
              }
            }
          }
          assert.deepEqual(errors, []);
          await page.close();
        }
  await writeFile(
    resolve(output, "manifest.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(`Captured ${records.length} Ribbon scenes in ${output}`);
} finally {
  await browser.close();
}
