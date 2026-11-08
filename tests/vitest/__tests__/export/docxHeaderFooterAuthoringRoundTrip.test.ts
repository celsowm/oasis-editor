import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  editHeaderFooter,
  exitHeaderFooter,
  insertPageNumber,
} from "@/core/commands/headerFooter.js";
import { insertTextAtSelection } from "@/core/commands/text.js";
import {
  insertPageNumberField,
  placePageNumber,
  setSectionPageNumbering,
} from "@/core/commands/pageNumber.js";
import { getRunField, type EditorParagraphNode } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

/**
 * End-to-end header/footer authoring round-trip: drive the command layer into a
 * header zone, type + insert a PAGE field, export, and re-import. This locks in
 * the Phase 2.1 story: the authoring commands produce editable header stories
 * that survive DOCX serialization and come back intact.
 */
describe("header/footer authoring DOCX round-trip", () => {
  it("exports and re-imports a header authored through the command layer", async () => {
    const body = createEditorParagraph("Body text");
    const state = createEditorStateFromDocument(
      createEditorDocument([body]),
    );

    // Author a header with typed text and a page-number field.
    let editing = editHeaderFooter(state, "header");
    expect(editing.activeZone).toBe("header");
    editing = insertTextAtSelection(editing, "Report");
    editing = insertPageNumber(editing);
    const authored = exitHeaderFooter(editing);
    expect(authored.activeZone).toBe("main");

    // The authored header contains a typed run and a PAGE field run.
    const authoredParagraph = (authored.document.sections![0]!.header![0]! as {
      runs: Array<{ kind: string; text?: string }>;
    });
    const authoredRuns = authoredParagraph.runs.map((r) => `${r.kind}:${r.text}`);
    expect(authoredRuns).toContain("text:Report");
    expect(authoredRuns.some((r) => r.startsWith("field:"))).toBe(true);

    // Start from a source-less document — this covers the "new header part"
    // export path, not just source-package preservation.
    const buffer = await exportEditorDocumentToDocx(authored.document);
    const zip = await JSZip.loadAsync(buffer);

    // A real header1.xml part was created and carries the content + field.
    const headerPath = Object.keys(zip.files).find((path) =>
      /^word\/header\d+\.xml$/.test(path),
    );
    expect(headerPath).toBeDefined();
    const headerXml = await zip.file(headerPath!)?.async("string");
    expect(headerXml).toContain(">Report<");
    expect(headerXml).toContain('instr=" PAGE "');

    // Re-import: header story and page-number field are reconstructed.
    const imported = await importDocxToEditorDocument(buffer);
    const headerParagraphs = imported.sections?.[0]?.header ?? [];
    expect(headerParagraphs.length).toBeGreaterThan(0);
    const firstParagraph = headerParagraphs[0];
    if (!firstParagraph || firstParagraph.type !== "paragraph") {
      throw new Error("Expected a header paragraph.");
    }
    const runText = firstParagraph.runs.map((run) => run.text).join("");
    expect(runText).toContain("Report");
    expect(
      firstParagraph.runs.some((run) => getRunField(run)?.type === "PAGE"),
    ).toBe(true);
  });

  it("round-trips a formatted PAGE field (\\* ROMAN) through DOCX", async () => {
    const body = createEditorParagraph("Body");
    const state = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    const authored = insertPageNumberField(state, "page", "ROMAN");

    const buffer = await exportEditorDocumentToDocx(authored.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain('instr=" PAGE \\* ROMAN "');

    const imported = await importDocxToEditorDocument(buffer);
    const paragraph = imported.sections?.[0]?.blocks[0];
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected a paragraph.");
    }
    const fieldRun = paragraph.runs.find(
      (run) => getRunField(run)?.type === "PAGE",
    );
    expect(fieldRun).toBeDefined();
    // The \* ROMAN switch is recovered on import.
    expect(
      getRunField(fieldRun!),
    ).toMatchObject({ type: "PAGE", format: "ROMAN" });
  });

  it("round-trips a placed footer page number with alignment and format", async () => {
    const body = createEditorParagraph("Body");
    const state = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    // Place a right-aligned, \* ROMAN "Page X of Y" footer.
    const placed = placePageNumber(state, "bottom", {
      kind: "xOfY",
      align: "right",
      format: "ROMAN",
    });
    const story = (placed.document.sections![0]!.footer ?? [])[0] as
      | EditorParagraphNode
      | undefined;
    expect(story).toBeDefined();
    expect(story!.style).toMatchObject({ styleId: "footer", align: "right" });

    const buffer = await exportEditorDocumentToDocx(placed.document);
    const zip = await JSZip.loadAsync(buffer);
    const footerPath = Object.keys(zip.files).find((path) =>
      /^word\/footer\d+\.xml$/.test(path),
    );
    expect(footerPath).toBeDefined();
    const footerXml = await zip.file(footerPath!)?.async("string");
    expect(footerXml).toContain('w:val="right"');
    expect(footerXml).toContain('instr=" PAGE \\* ROMAN "');
    expect(footerXml).toContain('instr=" NUMPAGES \\* ROMAN "');

    // Re-import reconstructs the footer story with field runs and alignment.
    const imported = await importDocxToEditorDocument(buffer);
    const footerParagraphs =
      (imported.sections?.[0]?.footer as EditorParagraphNode[] | undefined) ??
      [];
    expect(footerParagraphs).toHaveLength(1);
    expect(footerParagraphs[0]!.style?.align).toBe("right");
    const fieldFormats = footerParagraphs[0]!.runs
      .filter((run) => getRunField(run)?.type)
      .map((run) => getRunField(run)?.format);
    expect(fieldFormats).toContain("ROMAN");
  });

  it("round-trips per-section page numbering (start + format)", async () => {
    const body = createEditorParagraph("Body");
    const state = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    const seeded = setSectionPageNumbering(state, {
      start: 7,
      format: "upperRoman",
    });
    expect(seeded.document.sections![0]!.pageNumbering).toEqual({
      start: 7,
      format: "upperRoman",
    });

    const buffer = await exportEditorDocumentToDocx(seeded.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain('<w:pgNumType ');
    expect(documentXml).toContain('w:start="7"');
    expect(documentXml).toContain('w:fmt="upperRoman"');

    // Re-import reconstructs the page-numbering settings.
    const imported = await importDocxToEditorDocument(buffer);
    expect(imported.sections?.[0]?.pageNumbering).toMatchObject({
      start: 7,
      format: "upperRoman",
    });
  });
});
