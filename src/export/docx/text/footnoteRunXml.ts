import type { EditorTextStyle, EditorTextRun } from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";
import { serializeRunProperties } from "./runPropertiesXml.js";

export function serializeFootnoteRefMarker(): string {
  return `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r>`;
}

export function serializeFootnoteReference(
  run: EditorTextRun,
  materializedRunStyle: EditorTextStyle | undefined,
  context: DocContext,
): string | null {
  const docxId = context.footnoteIdMap?.get(run.footnoteReference!.footnoteId);
  if (docxId === undefined) {
    return null;
  }

  const referenceStyle: EditorTextStyle = {
    ...(materializedRunStyle ?? {}),
    styleId: "FootnoteReference",
    superscript: true,
  };
  const customMarkAttr = run.footnoteReference!.customMark
    ? ' w:customMarkFollows="1"'
    : "";
  const customMarkText = run.footnoteReference!.customMark
    ? `<w:t xml:space="preserve">${escapeXml(run.footnoteReference!.customMark)}</w:t>`
    : "";
  return `<w:r>${serializeRunProperties(referenceStyle)}<w:footnoteReference${customMarkAttr} w:id="${docxId}"/>${customMarkText}</w:r>`;
}
