import type { EditorTextStyle, EditorTextRun } from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import {
  serializeNoteRefMarker,
  serializeNoteReference,
} from "./noteRunXml.js";

export function serializeFootnoteRefMarker(): string {
  return serializeNoteRefMarker("footnote");
}

export function serializeFootnoteReference(
  run: EditorTextRun,
  materializedRunStyle: EditorTextStyle | undefined,
  context: DocContext,
): string | null {
  const ref = run.footnoteReference;
  return serializeNoteReference(
    "footnote",
    ref ? { noteId: ref.footnoteId, customMark: ref.customMark } : undefined,
    materializedRunStyle,
    context,
  );
}
