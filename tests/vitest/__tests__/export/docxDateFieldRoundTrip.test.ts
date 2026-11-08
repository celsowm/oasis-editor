import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getRunField,
  type EditorParagraphNode,
} from "@/core/model.js";
import { insertDateField, isDateFieldRun } from "@/core/commands/fieldDate.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

describe("DATE field DOCX round-trip", () => {
  it("exports a DATE field with its \\@ picture and re-imports it intact", async () => {
    const body = createEditorParagraph("Body");
    const state = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    const authored = insertDateField(state, {
      dateFormat: "yyyy-MM-dd",
      value: new Date(2026, 10, 8, 0, 0, 0),
    });
    const authoredRun = (
      authored.document.sections![0]!.blocks[0] as EditorParagraphNode
    ).runs.find(isDateFieldRun)!;
    expect(authoredRun.text).toBe("2026-11-08");
    expect(getRunField(authoredRun)).toEqual({
      type: "DATE",
      dateFormat: "yyyy-MM-dd",
    });

    const buffer = await exportEditorDocumentToDocx(authored.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain('w:instr=" DATE \\@ &quot;yyyy-MM-dd&quot; "');
    expect(documentXml).toContain("2026-11-08");

    // Re-import reconstructs the DATE field with picture + cached result.
    const imported = await importDocxToEditorDocument(buffer);
    const importedRun = (
      imported.sections![0]!.blocks[0] as EditorParagraphNode
    ).runs.find(isDateFieldRun);
    expect(importedRun).toBeDefined();
    expect(importedRun!.text).toBe("2026-11-08");
    expect(getRunField(importedRun!)).toEqual({
      type: "DATE",
      dateFormat: "yyyy-MM-dd",
    });
  });

  it("round-trips a default DATE field without an explicit picture", async () => {
    const body = createEditorParagraph("Body");
    const state = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    const authored = insertDateField(state, {
      value: new Date(2026, 10, 8, 0, 0, 0),
    });
    const buffer = await exportEditorDocumentToDocx(authored.document);
    const imported = await importDocxToEditorDocument(buffer);
    const importedRun = (
      imported.sections![0]!.blocks[0] as EditorParagraphNode
    ).runs.find(isDateFieldRun);
    // The default picture round-trips, so a default picture is recovered.
    expect(getRunField(importedRun!)).toEqual({
      type: "DATE",
      dateFormat: "M/d/yyyy",
    });
  });
});
