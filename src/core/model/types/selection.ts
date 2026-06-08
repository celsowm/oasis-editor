/**
 * Selection and editing-zone types. Kept separate from document data so
 * editor-state modules can depend on them without pulling the whole document.
 */

export interface EditorPosition {
  paragraphId: string;
  runId: string;
  offset: number;
}

export interface EditorSelection {
  anchor: EditorPosition;
  focus: EditorPosition;
}

export type EditorEditingZone = "main" | "header" | "footer" | "footnote";
