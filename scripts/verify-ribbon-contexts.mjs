#!/usr/bin/env node
/* global process, document, window, console, URLSearchParams, Image, getComputedStyle */
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSuite } from "./lib/ribbon-suite.mjs";
import { cases } from "./lib/contexts-fixtures.mjs";
import { verifySectionUnits } from "./lib/contexts-units.mjs";
import { verifyContextRemoval } from "./lib/contexts-removal.mjs";
import { captureResponsiveRibbon } from "./lib/contexts-responsive.mjs";
import { verifyContextTransitions } from "./lib/contexts-transitions.mjs";

const { base, engine, output, sha, dirty, browser } =
  await createSuite("contexts");
const records = [],
  hashes = new Map();
const unitEvidence = [];
try {
  for (const [fixture, tabs] of Object.entries(cases))
    for (const theme of ["light", "dark"])
      for (const locale of ["en", "pt-BR"]) {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 1,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          `${base}/tests/browser/ribbon/?${new URLSearchParams({ fixture, theme, locale })}`,
        );
        await waitForRibbonReference(page);
        const baseline = await page.evaluate(() => {
          const { client, metadata } = window.ribbonReference;
          return {
            ...metadata,
            version: client.document.version(),
            selection: client.selection.get(),
            dirty: client.document.isDirty(),
            nodes: client.query
              .snapshot()
              .nodes.filter((node) => node.type === "paragraph")
              .map((node) => ({ id: node.id, list: node.node.list })),
            imageContext: client.commands.state("imageContext").isActive,
            tableContext: client.commands.state("tableContext").isActive,
            style: client.commands.state("setStyleId").value,
            revisions: client.commands.state("acceptRevisions").isEnabled,
            orientation: client.commands.state("toggleOrientation").isActive,
            comments: client.document.get().comments?.order.length ?? 0,
          };
        });
        assert.match(baseline.documentSha256, /^[a-f0-9]{64}$/);
        assert.match(baseline.fontSha256, /^[a-f0-9]{64}$/);
        assert.equal(baseline.dirty, false);
        if (hashes.has(fixture))
          assert.equal(
            baseline.documentSha256,
            hashes.get(fixture),
            "Synthetic content changed between sessions/themes/locales",
          );
        hashes.set(fixture, baseline.documentSha256);
        assert.equal(baseline.imageContext, fixture === "image");
        assert.equal(baseline.tableContext, fixture === "table");
        if (fixture === "styles") assert.equal(baseline.style, "Caption");
        if (fixture === "review") {
          assert.equal(baseline.revisions, true);
          assert.equal(baseline.comments, 2);
        }
        if (fixture === "sections")
          assert.equal(
            baseline.orientation,
            true,
            "Landscape fixture selected wrong section",
          );
        if (fixture === "lists")
          assert.ok(
            baseline.nodes.find(
              (node) => node.id === baseline.selection.anchor.paragraphId,
            )?.list,
            "List fixture selected a plain paragraph",
          );
        if (fixture === "image")
          await page.evaluate(async () => {
            const run = window.ribbonReference.client.query
              .snapshot()
              .nodes.find(
                (node) => node.type === "run" && node.node.kind === "image",
              ).node;
            const image = new Image();
            image.src = run.image.src;
            await image.decode();
            if (!image.naturalWidth)
              throw new Error("Synthetic bitmap did not decode");
          });
        await captureResponsiveRibbon(page, {
          fixture,
          tabs,
          theme,
          locale,
          output,
          sha,
          dirty,
          engine,
          records,
          baseline,
        });
        assert.deepEqual(
          await page.evaluate(() => ({
            version: window.ribbonReference.client.document.version(),
            selection: window.ribbonReference.client.selection.get(),
          })),
          { version: baseline.version, selection: baseline.selection },
          "Context navigation changed content or selection",
        );
        if (fixture === "sections") {
          await verifySectionUnits(page, {
            fixture,
            theme,
            locale,
            output,
            sha,
            dirty,
            engine,
            unitEvidence,
          });
        }
        // Context removal must close contextual surfaces without leaving empty groups.
        if (["image", "table"].includes(fixture)) {
          await verifyContextRemoval(page, {
            fixture,
            theme,
            locale,
            output,
            sha,
            dirty,
            engine,
            baseline,
            unitEvidence,
          });
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
  const { transitionEvidence } = await verifyContextTransitions({
    browser,
    base,
    engine,
    sha,
    dirty,
    output,
  });
  const expectedLayouts = Object.values(cases).reduce(
    (total, tabs) => total + tabs.length * 2 * 2 * 5,
    0,
  );
  assert.equal(
    records.length,
    expectedLayouts,
    "Context capture matrix is incomplete",
  );
  assert.equal(
    unitEvidence.length,
    2 * 2 * 2,
    "Unit capture matrix is incomplete",
  );
  assert.equal(
    transitionEvidence.length,
    2,
    "Context transition evidence is incomplete",
  );
  for (const record of records) {
    assert.ok(record.scenario, `Missing scenario for ${record.screenshot}`);
    assert.ok(record.screenshot, "Missing screenshot filename");
    assert.equal(record.sha, sha, `Wrong source SHA for ${record.screenshot}`);
    assert.equal(
      record.dirty,
      dirty,
      `Inconsistent dirty state for ${record.screenshot}`,
    );
    assert.equal(
      record.browser,
      engine,
      `Wrong browser for ${record.screenshot}`,
    );
    assert.equal(
      record.requestedWidth,
      record.width,
      `Wrong measured width for ${record.screenshot}`,
    );
    assert.equal(record.dpr, 1, `Wrong DPR for ${record.screenshot}`);
  }
  for (const record of unitEvidence) {
    assert.ok(
      record.scenario,
      `Missing unit scenario for ${record.screenshot}`,
    );
    assert.equal(record.sha, sha, `Wrong source SHA for ${record.screenshot}`);
    assert.equal(
      record.dirty,
      dirty,
      `Inconsistent dirty state for ${record.screenshot}`,
    );
    assert.equal(
      record.browser,
      engine,
      `Wrong browser for ${record.screenshot}`,
    );
    assert.equal(
      record.requestedWidth,
      record.width,
      `Wrong measured width for ${record.screenshot}`,
    );
    assert.equal(record.dpr, 1, `Wrong DPR for ${record.screenshot}`);
  }
  for (const record of transitionEvidence) {
    assert.ok(
      record.scenario,
      `Missing transition scenario for ${record.screenshot}`,
    );
    assert.equal(record.sha, sha, `Wrong source SHA for ${record.screenshot}`);
    assert.equal(
      record.dirty,
      dirty,
      `Inconsistent dirty state for ${record.screenshot}`,
    );
    assert.equal(
      record.browser,
      engine,
      `Wrong browser for ${record.screenshot}`,
    );
    assert.equal(
      record.requestedWidth,
      record.width,
      `Wrong measured width for ${record.screenshot}`,
    );
    assert.equal(record.dpr, 1, `Wrong DPR for ${record.screenshot}`);
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(
      {
        browser: engine,
        hashes: Object.fromEntries(hashes),
        records,
        unitEvidence,
        transitionEvidence,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Verified ${records.length} contextual layouts and ${unitEvidence.length} unit screenshots in ${engine}; seven deterministic fixtures, selection/context removal, popup transitions and actual widths.`,
  );
} finally {
  await browser.close();
}
