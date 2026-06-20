import type { EditorTextStyle } from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";
import { serializeRunProperties } from "./runPropertiesXml.js";

type NoteKind = "footnote" | "endnote";

const REFERENCE_STYLE: Record<NoteKind, string> = {
  footnote: "FootnoteReference",
  endnote: "EndnoteReference",
};

/** The auto-numbered reference marker emitted inside a note body. */
export function serializeNoteRefMarker(kind: NoteKind): string {
  return `<w:r><w:rPr><w:rStyle w:val="${REFERENCE_STYLE[kind]}"/><w:vertAlign w:val="superscript"/></w:rPr><w:${kind}Ref/></w:r>`;
}

/**
 * Serializes a footnote/endnote reference run. Footnotes and endnotes share the
 * exact same OOXML shape, so a single parameterized serializer handles both —
 * `kind` selects the id map, reference style and `w:footnoteReference` /
 * `w:endnoteReference` element (N1 dedup).
 */
export function serializeNoteReference(
  kind: NoteKind,
  reference: { noteId: string; customMark?: string } | undefined,
  materializedRunStyle: EditorTextStyle | undefined,
  context: DocContext,
): string | null {
  if (!reference) {
    return null;
  }
  const idMap =
    kind === "footnote" ? context.footnoteIdMap : context.endnoteIdMap;
  const docxId = idMap?.get(reference.noteId);
  if (docxId === undefined) {
    return null;
  }

  const referenceStyle: EditorTextStyle = {
    ...(materializedRunStyle ?? {}),
    styleId: REFERENCE_STYLE[kind],
    superscript: true,
  };
  const customMarkAttr = reference.customMark
    ? ' w:customMarkFollows="1"'
    : "";
  const customMarkText = reference.customMark
    ? `<w:t xml:space="preserve">${escapeXml(reference.customMark)}</w:t>`
    : "";
  return `<w:r>${serializeRunProperties(referenceStyle)}<w:${kind}Reference${customMarkAttr} w:id="${docxId}"/>${customMarkText}</w:r>`;
}
