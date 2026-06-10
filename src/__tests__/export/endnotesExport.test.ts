import { describe, it, expect, beforeEach } from "vitest";
import JSZip from "jszip";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  resetEditorIds,
} from "../../core/editorState.js";
import {
  collectEndnoteReferences,
  renumberEndnotes,
} from "../../core/endnotes.js";
import type {
  EditorDocument,
  EditorParagraphNode,
  EditorTextRun,
} from "../../core/model.js";

beforeEach(() => {
  resetEditorIds();
});

async function exportAndOpen(buffer: ArrayBuffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

async function readPart(zip: JSZip, path: string): Promise<string | null> {
  return (await zip.file(path)?.async("string")) ?? null;
}

function refRun(endnoteId: string): EditorTextRun {
  return {
    id: `run:${endnoteId}`,
    text: "?",
    styles: { superscript: true },
    endnoteReference: { endnoteId },
  };
}

/** Build a document whose single paragraph references two endnotes. */
function buildDocWithTwoEndnotes(): EditorDocument {
  const paragraph: EditorParagraphNode = {
    id: "paragraph:body",
    type: "paragraph",
    runs: [
      { id: "run:a", text: "A" },
      refRun("endnote:a"),
      { id: "run:b", text: "B" },
      refRun("endnote:b"),
    ],
  };
  const doc = createEditorDocument([paragraph]);
  doc.endnotes = {
    items: {
      "endnote:a": {
        id: "endnote:a",
        blocks: [
          createEditorParagraphFromRuns([
            { text: "Styled ", styles: { bold: true } },
            { text: "endnote", styles: { italic: true } },
          ]),
        ],
      },
      "endnote:b": {
        id: "endnote:b",
        blocks: [createEditorParagraph("Plain second note")],
      },
    },
  };
  // Materialize inline markers ("1", "2") in reading order.
  return renumberEndnotes(doc);
}

describe("DOCX export: endnotes", () => {
  it("emits word/endnotes.xml with separators and one entry per referenced endnote", async () => {
    const doc = buildDocWithTwoEndnotes();
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    const endnotesXml = await readPart(zip, "word/endnotes.xml");
    expect(endnotesXml).not.toBeNull();
    expect(endnotesXml!).toContain('w:type="separator"');
    expect(endnotesXml!).toContain('w:type="continuationSeparator"');
    expect(endnotesXml!).toMatch(/<w:endnote w:id="1">/);
    expect(endnotesXml!).toMatch(/<w:endnote w:id="2">/);
    expect(endnotesXml!.match(/<w:endnoteRef\s*\/>/g)?.length).toBe(2);
  });

  it("registers the endnotes Content-Type override and document relationship", async () => {
    const doc = buildDocWithTwoEndnotes();
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    const contentTypes = await readPart(zip, "[Content_Types].xml");
    expect(contentTypes).toContain("/word/endnotes.xml");
    expect(contentTypes).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
    );

    const rels = await readPart(zip, "word/_rels/document.xml.rels");
    expect(rels).not.toBeNull();
    expect(rels!).toContain('Target="endnotes.xml"');
    expect(rels!).toContain("/endnotes");
  });

  it("emits <w:endnoteReference> in document.xml that points to the right ids", async () => {
    const doc = buildDocWithTwoEndnotes();
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    const documentXml = await readPart(zip, "word/document.xml");
    expect(documentXml).not.toBeNull();
    const idMatches = [
      ...documentXml!.matchAll(/<w:endnoteReference[^>]*w:id="(\d+)"/g),
    ].map((m) => m[1]);
    expect(idMatches).toEqual(["1", "2"]);
  });

  it("does not emit an endnotes part when the document has no endnotes", async () => {
    const doc = createEditorDocument([createEditorParagraph("plain")]);
    const buffer = await exportEditorDocumentToDocx(doc);
    const zip = await exportAndOpen(buffer);

    expect(await readPart(zip, "word/endnotes.xml")).toBeNull();
    const contentTypes = await readPart(zip, "[Content_Types].xml");
    expect(contentTypes).not.toContain("/word/endnotes.xml");
  });

  it("round-trips endnote count, ordering, body text and styles through export → import", async () => {
    const doc = buildDocWithTwoEndnotes();
    const reimported = await importDocxToEditorDocument(
      await exportEditorDocumentToDocx(doc),
    );

    const refs = collectEndnoteReferences(reimported);
    expect(refs.map((r) => r.run.text)).toEqual(["1", "2"]);
    expect(Object.keys(reimported.endnotes!.items)).toHaveLength(2);

    const firstId = refs[0].run.endnoteReference!.endnoteId;
    const firstParagraph = reimported.endnotes!.items[firstId]
      .blocks[0] as EditorParagraphNode;
    const text = firstParagraph.runs.map((r) => r.text).join("");
    expect(text).toContain("Styled endnote");
    expect(
      firstParagraph.runs.some(
        (run) => run.text.includes("Styled") && run.styles?.bold,
      ),
    ).toBe(true);
    expect(
      firstParagraph.runs.some(
        (run) => run.text.includes("endnote") && run.styles?.italic,
      ),
    ).toBe(true);
  });
});
