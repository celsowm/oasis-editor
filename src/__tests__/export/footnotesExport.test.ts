import { describe, it, expect, beforeEach } from "vitest";
import JSZip from "jszip";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  resetEditorIds,
} from "../../core/editorState.js";
import { insertFootnote, goToFootnoteReference } from "../../core/commands/footnotes.js";
import { collectFootnoteReferences } from "../../core/footnotes.js";
import { paragraphOffsetToPosition, getDocumentParagraphs } from "../../core/model.js";

beforeEach(() => {
  resetEditorIds();
});

async function exportAndOpen(buffer: ArrayBuffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

async function readPart(zip: JSZip, path: string): Promise<string | null> {
  return (await zip.file(path)?.async("string")) ?? null;
}

function buildDocWithTwoFootnotes() {
  const paragraph = createEditorParagraph("ABCDE");
  const doc = createEditorDocument([paragraph]);
  const state = createEditorStateFromDocument(doc);

  // Insert at offset 1 -> "1" between A and B.
  const s1 = insertFootnote({
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 1),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  });

  // Switch back to main, then insert at end → "2".
  const firstFootnoteId = collectFootnoteReferences(s1.document)[0].run.footnoteReference!.footnoteId;
  const back = goToFootnoteReference(s1, firstFootnoteId);
  const mainParagraph = getDocumentParagraphs(back.document)[0];
  const totalLen = mainParagraph.runs.reduce((sum, r) => sum + r.text.length, 0);

  const s2 = insertFootnote({
    ...back,
    selection: {
      anchor: paragraphOffsetToPosition(mainParagraph, totalLen),
      focus: paragraphOffsetToPosition(mainParagraph, totalLen),
    },
  });

  return s2.document;
}

describe("DOCX export: footnotes", () => {
  it("emits word/footnotes.xml with separators and one entry per referenced footnote", async () => {
    const doc = buildDocWithTwoFootnotes();
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    const footnotesXml = await readPart(zip, "word/footnotes.xml");
    expect(footnotesXml).not.toBeNull();
    expect(footnotesXml!).toContain('w:type="separator"');
    expect(footnotesXml!).toContain('w:type="continuationSeparator"');
    // Two real footnotes with ids 1 and 2.
    expect(footnotesXml!).toMatch(/<w:footnote w:id="1">/);
    expect(footnotesXml!).toMatch(/<w:footnote w:id="2">/);
    // Body marker (`<w:footnoteRef/>`) reinjected by the serializer.
    expect(footnotesXml!.match(/<w:footnoteRef\s*\/>/g)?.length).toBe(2);
  });

  it("registers the footnotes Content-Type override and document relationship", async () => {
    const doc = buildDocWithTwoFootnotes();
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    const contentTypes = await readPart(zip, "[Content_Types].xml");
    expect(contentTypes).toContain("/word/footnotes.xml");
    expect(contentTypes).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
    );

    const rels = await readPart(zip, "word/_rels/document.xml.rels");
    expect(rels).not.toBeNull();
    expect(rels!).toContain("Target=\"footnotes.xml\"");
    expect(rels!).toContain("/footnotes");
  });

  it("emits <w:footnoteReference> in document.xml that points to the right ids", async () => {
    const doc = buildDocWithTwoFootnotes();
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    const documentXml = await readPart(zip, "word/document.xml");
    expect(documentXml).not.toBeNull();
    const idMatches = [...documentXml!.matchAll(/<w:footnoteReference[^>]*w:id="(\d+)"/g)].map(
      (m) => m[1],
    );
    expect(idMatches).toEqual(["1", "2"]);
  });

  it("does not emit a footnotes part when the document has no footnotes", async () => {
    const doc = createEditorDocument([createEditorParagraph("plain")]);
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    expect(await readPart(zip, "word/footnotes.xml")).toBeNull();
    const contentTypes = await readPart(zip, "[Content_Types].xml");
    expect(contentTypes).not.toContain("/word/footnotes.xml");
  });

  it("round-trips footnote count and ordering through export → import", async () => {
    const doc = buildDocWithTwoFootnotes();
    const buffer = await exportEditorDocumentToDocx(doc);

    const reimported = await importDocxToEditorDocument(buffer);
    const refs = collectFootnoteReferences(reimported);
    expect(refs.map((r) => r.run.text)).toEqual(["1", "2"]);
    expect(Object.keys(reimported.footnotes!.items)).toHaveLength(2);
  });
});
