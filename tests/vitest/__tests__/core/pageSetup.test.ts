import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getActivePaperSize,
  getPaperSizePreset,
  setSectionPaperSize,
  setSectionPaperSizePreset,
} from "@/core/commands/pageSetup.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

function fixture() {
  const paragraph = createEditorParagraph("Body");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return { state };
}

describe("paper-size authoring", () => {
  it("sets the active section's paper dimensions (points → px storage)", () => {
    const { state } = fixture();
    const result = setSectionPaperSize(state, {
      widthPt: 612,
      heightPt: 792,
    });
    // Letter 8.5"×11" at 96 DPI → 816×1056 px, the editor's unit.
    expect(result.document.sections![0]!.pageSettings).toMatchObject({
      width: 816,
      height: 1056,
    });
  });

  it("preserves margins and other page settings when resizing", () => {
    const { state } = fixture();
    const original = state.document.sections![0]!.pageSettings;
    const result = setSectionPaperSize(state, { widthPt: 612, heightPt: 792 });
    expect(result.document.sections![0]!.pageSettings.margins).toEqual(
      original.margins,
    );
    expect(result.document.sections![0]!.pageSettings.orientation).toEqual(
      original.orientation,
    );
  });

  it("applies a named preset by id", () => {
    const { state } = fixture();
    const result = setSectionPaperSizePreset(state, "a4");
    const preset = getPaperSizePreset("a4")!;
    expect(result.document.sections![0]!.pageSettings).toMatchObject({
      width: (preset.widthPt / 72) * 96,
      height: (preset.heightPt / 72) * 96,
    });
  });

  it("ignores an unknown preset id", () => {
    const { state } = fixture();
    expect(setSectionPaperSizePreset(state, "bogus")).toBe(state);
  });

  it("exposes the active paper size in points", () => {
    const { state } = fixture();
    const size = getActivePaperSize(state);
    const settings = state.document.sections![0]!.pageSettings;
    expect(size).toEqual({
      widthPt: (settings.width / 96) * 72,
      heightPt: (settings.height / 96) * 72,
    });
  });

  it("round-trips a custom paper size through DOCX", async () => {
    const { state } = fixture();
    // Letter 8.5"×11" → 816×1056 px → w:w=12240 w:h=15840 twips.
    const resized = setSectionPaperSize(state, { widthPt: 612, heightPt: 792 });
    const buffer = await exportEditorDocumentToDocx(resized.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("<w:pgSz ");
    expect(documentXml).toContain('w:w="12240"');
    expect(documentXml).toContain('w:h="15840"');

    const imported = await importDocxToEditorDocument(buffer);
    const settings = imported.sections![0]!.pageSettings;
    expect(settings.width).toBeCloseTo(816, 0);
    expect(settings.height).toBeCloseTo(1056, 0);
  });
});
