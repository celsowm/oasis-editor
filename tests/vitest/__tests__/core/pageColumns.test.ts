import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  COLUMN_LAYOUT_PRESETS,
  DEFAULT_COLUMN_SPACE_PX,
  getActiveColumns,
  getColumnLayoutPreset,
  setSectionColumns,
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

describe("multi-column layout authoring", () => {
  it("sets a two-column equal-width layout with the default 0.5\" gap", () => {
    const { state } = fixture();
    const result = setSectionColumns(state, { count: 2 });
    expect(getActiveColumns(result)).toEqual({
      count: 2,
      space: DEFAULT_COLUMN_SPACE_PX,
    });
  });

  it("author a custom gap and separator", () => {
    const { state } = fixture();
    const result = setSectionColumns(state, {
      count: 3,
      space: 72,
      separator: true,
    });
    expect(getActiveColumns(result)).toMatchObject({
      count: 3,
      space: 72,
      separator: true,
    });
  });

  it("returns no columns before any are authored (single column)", () => {
    const { state } = fixture();
    expect(getActiveColumns(state)).toBeUndefined();
  });

  it("restores single-column layout when count drops to 1", () => {
    const { state } = fixture();
    const col = setSectionColumns(state, { count: 2 });
    const back = setSectionColumns(col, { count: 1 });
    expect(getActiveColumns(back)).toBeUndefined();
  });

  it("resolves the named presets (one/two/three/left/right)", () => {
    for (const preset of COLUMN_LAYOUT_PRESETS) {
      expect(getColumnLayoutPreset(preset.id)).toEqual(preset);
    }
    expect(getColumnLayoutPreset("bogus")).toBeUndefined();
  });

  it("declares an asymmetric preset as unequal (left/right)", () => {
    expect(getColumnLayoutPreset("left")).toMatchObject({
      asymmetric: true,
      count: 2,
    });
    expect(getColumnLayoutPreset("right")).toMatchObject({
      asymmetric: true,
      count: 2,
    });
  });

  it("round-trips a two-column layout through DOCX", async () => {
    const { state } = fixture();
    const authored = setSectionColumns(state, {
      count: 2,
      separator: true,
    });
    const buffer = await exportEditorDocumentToDocx(authored.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain('<w:cols w:num="2"');
    expect(documentXml).toContain('w:sep="1"');

    const imported = await importDocxToEditorDocument(buffer);
    expect(getSectionColumns(imported)).toMatchObject({
      count: 2,
      separator: true,
    });
  });

  it("round-trips back to single column (no w:cols) through DOCX", async () => {
    const { state } = fixture();
    const col = setSectionColumns(state, { count: 2 });
    const single = setSectionColumns(col, { count: 1 });
    const buffer = await exportEditorDocumentToDocx(single.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).not.toContain("w:cols");

    const imported = await importDocxToEditorDocument(buffer);
    expect(getSectionColumns(imported)).toBeUndefined();
  });
});

function getSectionColumns(state: {
  sections?: Array<{ pageSettings?: { columns?: unknown } }>;
}): unknown {
  return state.sections?.[0]?.pageSettings?.columns;
}
