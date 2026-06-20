import type { EditorTextStyle, EditorTextRun } from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import {
  serializeNoteRefMarker,
  serializeNoteReference,
} from "./noteRunXml.js";

export function serializeEndnoteRefMarker(): string {
  return serializeNoteRefMarker("endnote");
}

export function serializeEndnoteReference(
  run: EditorTextRun,
  materializedRunStyle: EditorTextStyle | undefined,
  context: DocContext,
): string | null {
  const ref = run.endnoteReference;
  return serializeNoteReference(
    "endnote",
    ref ? { noteId: ref.endnoteId, customMark: ref.customMark } : undefined,
    materializedRunStyle,
    context,
  );
}
