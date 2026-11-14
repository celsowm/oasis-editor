/** Display-for-Review rendering mode for tracked revisions. */
export type ReviewDisplayMode = "all" | "final" | "original";

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
  /**
   * Display for Review: how tracked revisions render in the canvas.
   *   "all"      — show markup (default)
   *   "final"    — render as accepted (insertions kept, deletions dropped)
   *   "original" — render as rejected (insertions dropped, deletions restored)
   * Presentation only; the underlying revision marks are untouched.
   */
  reviewDisplayMode?: ReviewDisplayMode;
  /** Presentation toggle for painting tracked revisions (default on). */
  showRevisionMarkup?: boolean;
}

export type { EditorPosition, EditorSelection, EditorEditingZone };
