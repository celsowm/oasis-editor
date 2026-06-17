import type { EditorTextStyle, EditorTextRun } from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";
import { serializeRunProperties } from "./runPropertiesXml.js";

export function serializeEndnoteRefMarker(): string {
  return `<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/><w:vertAlign w:val="superscript"/></w:rPr><w:endnoteRef/></w:r>`;
}

export function serializeEndnoteReference(
  run: EditorTextRun,
  materializedRunStyle: EditorTextStyle | undefined,
  context: DocContext,
): string | null {
  const docxId = context.endnoteIdMap?.get(run.endnoteReference!.endnoteId);
  if (docxId === undefined) {
    return null;
  }

  const referenceStyle: EditorTextStyle = {
    ...(materializedRunStyle ?? {}),
    styleId: "EndnoteReference",
    superscript: true,
  };
  const customMarkAttr = run.endnoteReference!.customMark
    ? ' w:customMarkFollows="1"'
    : "";
  const customMarkText = run.endnoteReference!.customMark
    ? `<w:t xml:space="preserve">${escapeXml(run.endnoteReference!.customMark)}</w:t>`
    : "";
  return `<w:r>${serializeRunProperties(referenceStyle)}<w:endnoteReference${customMarkAttr} w:id="${docxId}"/>${customMarkText}</w:r>`;
}
