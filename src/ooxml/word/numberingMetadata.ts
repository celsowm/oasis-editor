import type { EditorParagraphListStyle } from "@/core/model.js";

export interface EditorListOoxmlNumberingMetadata {
  /** Original `w:num/@w:numId` for an imported list instance. */
  sourceNumId?: number;
  /** Original `w:abstractNum/@w:abstractNumId` referenced by that instance. */
  sourceAbstractNumId?: number;
  /** Original ST_NumberFormat token, including formats Oasis cannot render. */
  format?: string;
  /** Modelled format/kind at import time, used to detect an explicit edit. */
  importedFormat?: EditorParagraphListStyle["format"];
  importedKind: EditorParagraphListStyle["kind"];
  /** `w:lvlRestart/@w:val`. Zero means never restart. */
  restartAfterLevel?: number;
  /** `w:pStyle/@w:val` associated with this numbering level. */
  paragraphStyleId?: string;
}

type EditorListWithOoxmlMetadata = EditorParagraphListStyle & {
  ooxmlNumbering?: EditorListOoxmlNumberingMetadata;
};

export function setEditorListOoxmlNumberingMetadata(
  list: EditorParagraphListStyle,
  metadata: Omit<
    EditorListOoxmlNumberingMetadata,
    "importedFormat" | "importedKind"
  >,
): void {
  (list as EditorListWithOoxmlMetadata).ooxmlNumbering = {
    ...metadata,
    importedFormat: list.format,
    importedKind: list.kind,
  };
}

export function getEditorListOoxmlNumberingMetadata(
  list: EditorParagraphListStyle,
): EditorListOoxmlNumberingMetadata | undefined {
  return (list as EditorListWithOoxmlMetadata).ooxmlNumbering;
}

/**
 * Uses the source format only while the editor-visible kind/format still match
 * their imported state. An explicit list-format edit therefore wins.
 */
export function getEffectiveEditorListOoxmlFormat(
  list: EditorParagraphListStyle,
): string | undefined {
  const metadata = getEditorListOoxmlNumberingMetadata(list);
  if (
    !metadata?.format ||
    metadata.importedKind !== list.kind ||
    metadata.importedFormat !== list.format
  ) {
    return undefined;
  }
  return metadata.format;
}
