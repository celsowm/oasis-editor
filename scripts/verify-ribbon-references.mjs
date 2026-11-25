#!/usr/bin/env node
/**
 * P02 References: footnote insertion (reference, note body, undo/redo, DOCX
 * round-trip) and TOC insertion/update (field export and reimport) driven
 * through the References tab.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
import {
  createSuite,
  openGroup,
  loadFixture,
  placeCaretInParagraph,
  openRibbonPage,
} from "./lib/ribbon-suite.mjs";

const { base, engine, output, sha, dirty, records, browser } =
  await createSuite("references");
async function snapshot(page) {
  return page.evaluate(async () => {
    const { getDocumentParagraphs } = await import("/src/core/model.ts");
    const client = window.ribbonReference.client;
    const state = client.getState();
    const paragraphs = getDocumentParagraphs(state.document);
    return {
      activeZone: state.activeZone ?? "main",
      footnotes: Object.values(state.document.footnotes?.items ?? {}).map(
        (note) => ({
          id: note.id,
          text: note.blocks
            .flatMap((block) => (block.type === "paragraph" ? block.runs : []))
            .map((run) => run.text)
            .join(""),
        }),
      ),
      paragraphs: paragraphs.map((p) => p.runs.map((run) => run.text).join("")),
      footnoteRefs: getDocumentParagraphs(state.document)
        .flatMap((p) => p.runs)
        .filter((run) => run.kind === "footnoteReference")
        .map((run) => run.footnoteReference.footnoteId),
    };
  });
}

try {
  const configs = [
    { theme: "light", locale: "en", width: 1440 },
    { theme: "dark", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "pt-BR", width: 1440 },
    { theme: "light", locale: "en", width: 640 },
  ];
  for (const { theme, locale, width } of configs) {
    const { page, errors } = await openRibbonPage(browser, base, {
      theme,
      locale,
      width,
    });
    await waitForRibbonReference(page);
    await page.getByTestId("editor-ribbon-tab-references").click();

    // 1. Update TOC is disabled until a TOC exists; insert enables it.
    await loadFixture(page, "text");
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("updateTableOfContents")
            .isEnabled,
      ),
      false,
    );
    await placeCaretInParagraph(page, 0, 0);
    await (
      await openGroup(page, "tableOfContents", "editor-toolbar-insert-toc")
    ).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("updateTableOfContents")
            .isEnabled,
      ),
      true,
    );
    const tocState = await page.evaluate(async () => {
      const { hasTableOfContents } =
        await import("/src/core/commands/tableOfContents.js");
      const client = window.ribbonReference.client;
      const state = client.getState();
      return {
        has: hasTableOfContents(state),
        links: state.document.sections[0].blocks.flatMap(b=>b.type==="paragraph"?b.runs.flatMap(r=>r.styles?.link?.startsWith("#_TocOasis")?[r.styles.link]:[]):[]),
        targets: Object.values(state.document.bookmarks?.items??{}).map(b=>"#"+b.name),
        texts: state.document.sections[0].blocks
          .filter((block) => block.type === "paragraph")
          .flatMap((p) => p.runs.map((run) => run.text))
          .join(" "),
      };
    });
    assert.equal(tocState.has, true);
    assert.ok(tocState.texts.includes("Ribbon reference"));
    assert.ok(tocState.texts.includes("Heading two"));
    assert.ok(tocState.links.length>=2,"TOC should have internal links");
    assert.ok(tocState.links.every(link=>tocState.targets.includes(link)));

    // 2. Update TOC is a safe no-op when the field already exists.
    await (
      await openGroup(page, "tableOfContents", "editor-toolbar-update-toc")
    ).click();
    assert.equal(
      await page.evaluate(
        () =>
          window.ribbonReference.client.commands.state("updateTableOfContents")
            .isEnabled,
      ),
      true,
    );

    // 3. The TOC round-trips as a TOC field through DOCX.
    const tocDocx = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return new Uint8Array(await result.value.blob.arrayBuffer()).length;
    });
    assert.ok(tocDocx > 0);
    const tocBytes = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return [...new Uint8Array(await result.value.blob.arrayBuffer())];
    });
    const tocFilename = `${theme}-${locale}-${width}-toc.docx`;
    await writeFile(resolve(output, tocFilename), new Uint8Array(tocBytes));
    const documentXml = execFileSync("unzip", [
      "-p",
      resolve(output, tocFilename),
      "word/document.xml",
    ]).toString("utf8");
    assert.ok(
      documentXml.includes("TOC"),
      "document.xml should contain a TOC field",
    );
    assert.ok(
      documentXml.includes("Ribbon reference"),
      "document.xml should contain the TOC entries",
    );

    assert.ok(documentXml.includes('w:anchor="_TocOasis'));
    assert.ok(documentXml.includes('w:name="_TocOasis'));
    // 4. Footnote: inserting from the ribbon moves the caret into the note body.
    await loadFixture(page, "text");
    await placeCaretInParagraph(page, 1, 7);
    await (
      await openGroup(page, "footnotes", "editor-toolbar-footnote")
    ).click();
    let snap = await snapshot(page);
    assert.equal(snap.activeZone, "footnote");
    assert.equal(snap.footnotes.length, 1);
    assert.equal(snap.footnoteRefs.length, 1);
    assert.equal(snap.footnoteRefs[0], snap.footnotes[0].id);

    // 5. The whole insertion is a single undoable transaction.
    assert.equal(
      await page.evaluate(() =>
        window.ribbonReference.client.history.canUndo(),
      ),
      true,
    );
    await page.evaluate(() => window.ribbonReference.client.history.undo());
    snap = await snapshot(page);
    assert.equal(snap.footnotes.length, 0);
    assert.equal(snap.footnoteRefs.length, 0);
    await page.evaluate(() => window.ribbonReference.client.history.redo());
    snap = await snapshot(page);
    assert.equal(snap.footnotes.length, 1);
    assert.equal(snap.activeZone, "footnote");

    // 6. Typed text lands in the note body and survives a DOCX round-trip.
    await page.getByTestId("editor-input").focus();
    await page.keyboard.type("First note body.");
    snap = await snapshot(page);
    assert.equal(snap.footnotes[0].text, "First note body.");

    const fnBytes = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      return [...new Uint8Array(await result.value.blob.arrayBuffer())];
    });
    const fnFilename = `${theme}-${locale}-${width}-footnote.docx`;
    await writeFile(resolve(output, fnFilename), new Uint8Array(fnBytes));
    const fnDocumentXml = execFileSync("unzip", [
      "-p",
      resolve(output, fnFilename),
      "word/document.xml",
    ]).toString("utf8");
    const footnotesXml = execFileSync("unzip", [
      "-p",
      resolve(output, fnFilename),
      "word/footnotes.xml",
    ]).toString("utf8");
    assert.ok(fnDocumentXml.includes("footnoteReference"));
    assert.ok(footnotesXml.includes("First note body."));

    const reimported = await page.evaluate(async () => {
      const client = window.ribbonReference.client;
      const result = await client.io.export({ format: "docx" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      const loaded = await client.io.import({
        format: "docx",
        data: result.value.blob,
      });
      if (!loaded.ok) throw new Error(JSON.stringify(loaded.error));
      const state = client.getState();
      return {
        count: Object.values(state.document.footnotes?.items ?? {}).length,
        text: Object.values(state.document.footnotes?.items ?? {})
          .flatMap((note) =>
            note.blocks.flatMap((block) =>
              block.type === "paragraph" ? block.runs : [],
            ),
          )
          .map((run) => run.text)
          .join(""),
      };
    });
    assert.equal(reimported.count, 1);
    assert.ok(reimported.text.includes("First note body."));

    assert.deepEqual(errors, []);
    records.push({
      sha,
      dirty,
      engine,
      theme,
      locale,
      width,
      checks: [
        "update-toc-disabled-without-toc",
        "insert-toc-and-entries",
        "update-toc",
        "toc-docx-roundtrip",
        "footnote-zone-caret-and-registry",
        "footnote-single-transaction-undo-redo",
        "footnote-body-typing",
        "footnote-docx-roundtrip",
      ],
    });
    await page.close();
  }
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    `Verified ${records.length} References layouts in ${engine}: TOC insertion/update/round-trip and footnote insertion, typing, undo and DOCX round-trip.`,
  );
} finally {
  await browser.close();
}
