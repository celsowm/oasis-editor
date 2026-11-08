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
import type { HeaderFooterStoryKind } from "./headerFooterStories.js";

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
  /**
   * Which header/footer story is being edited when `activeZone` is `"header"`
   * or `"footer"`. Defaults to `"default"` for those zones.
   */
  activeHeaderFooterStory?: HeaderFooterStoryKind;
  trackChangesEnabled?: boolean;
  showMargins?: boolean;
  showParagraphMarks?: boolean;
}

export type { EditorPosition, EditorSelection, EditorEditingZone };
