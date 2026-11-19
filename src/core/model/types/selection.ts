/**
 * Selection and editing-zone types. Kept separate from document data so
 * editor-state modules can depend on them without pulling the whole document.
 */

export interface EditorPosition {
  paragraphId: string;
  runId: string;
  offset: number;
  /** Explicit side of coincident invisible markers for plain-text insertion.
   * Absent means the existing ambiguous-boundary protection applies. */
  fieldBoundaryAffinity?: "before-markers" | "after-markers";
}

export interface EditorSelection {
  anchor: EditorPosition;
  focus: EditorPosition;
}

export type EditorEditingZone = "main" | "header" | "footer" | "footnote";
