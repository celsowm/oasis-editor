/**
 * Editor state: the live, mutable view over a document. Composed of the
 * document itself, the current selection and presentation toggles.
 */
import type { EditorDocument } from "./types/document.js";
import type {
  EditorPosition,
  EditorSelection,
  EditorEditingZone,
} from "./types/selection.js";

export interface EditorState {
  document: EditorDocument;
  selection: EditorSelection;
  activeSectionIndex?: number;
  activeZone?: EditorEditingZone;
  /**
   * Identifies the footnote currently being edited when `activeZone === "footnote"`.
   * Ignored for other zones.
   */
  activeFootnoteId?: string;
  trackChangesEnabled?: boolean;
  showMargins?: boolean;
  showParagraphMarks?: boolean;
}

export type { EditorPosition, EditorSelection, EditorEditingZone };
