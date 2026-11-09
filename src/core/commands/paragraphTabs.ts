/**
 * Paragraph tab-stop editing command.
 *
 * Mirrors WordCraft's `para.tabs` (Word's Paragraph → Tabs dialog): one command
 * replaces the direct tab-stop list, adds or updates individual stops, clears
 * stops at given positions, clears every direct stop, and changes the document
 * default tab interval, all in a single undoable step. Clearing a stop the
 * paragraph's named style declares records a `clear`-type stop over it, so the
 * paragraph keeps inheriting the rest of the style's stops while no longer
 * honoring that one.
 *
 * The core applies to every paragraph the selection touches and preserves the
 * selection by paragraph offset. It is a no-op (returns the same state) when
 * nothing can change.
 */
import type {
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorState,
  EditorTabStop,
} from "@/core/model.js";
import { getParagraphs, resolveNamedParagraphStyle } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/** The most tab stops a paragraph keeps (WordCraft's `MAX_TABS`). */
export const MAX_TAB_STOPS = 64;
/** Positions are points within ±1584 (WordCraft's tab position limit). */
export const MAX_TAB_POSITION = 1584;
/** Distance (pt) below which two stop positions count as the same. */
export const TAB_POS_EPS = 1e-6;

export interface ParagraphTabStopsChange {
  /**
   * Replace the entire direct tab-stop list with these stops (`null` clears
   * every direct stop). Omit to leave the current direct list unchanged.
   */
  tabs?: EditorTabStop[] | null;
  /** Add or update these tab stops (a stop already at its position is replaced). */
  set?: EditorTabStop[];
  /** Remove the direct stops at these positions (pt); a `clear` stop is recorded where the named style declares one. */
  clear?: number[];
  /** Remove every direct stop (recording `clear` stops over style-declared positions). */
  clearAll?: boolean;
  /** Set the document default tab interval (pt); `null` restores it. */
  default?: number | null;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < TAB_POS_EPS;
}

function makeTabStop(position: number, source: EditorTabStop): EditorTabStop {
  return {
    position,
    type: source.type,
    ...(source.leader !== undefined ? { leader: source.leader } : {}),
  };
}

/**
 * Edit the selected paragraphs' tab stops and the document default tab
 * interval, mirroring WordCraft's `para.tabs`. Returns the same state when
 * nothing changes.
 */
export function editParagraphTabStops(
  state: EditorState,
  change: ParagraphTabStopsChange,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const styles = state.document.styles;

  const setStops = change.set ?? [];
  const clearPositions = change.clear ?? [];
  const clearAll = Boolean(change.clearAll);
  const hasReplace = change.tabs !== undefined;
  const paragraphWork =
    hasReplace || setStops.length > 0 || clearPositions.length > 0 || clearAll;

  let paragraphChanged = false;
  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return paragraph;
      }
      if (!paragraphWork) {
        return paragraph;
      }

      // The stops the paragraph inherits from its named style chain.
      const inherited =
        resolveNamedParagraphStyle(paragraph.style?.styleId, styles).tabs ?? [];

      // The direct stops we start from: the replacement list when given,
      // otherwise the paragraph's current direct stops.
      const start =
        change.tabs !== undefined
          ? (change.tabs ?? []).map((t) => ({ ...t }))
          : (paragraph.style?.tabs ?? []).map((t) => ({ ...t }));

      const clearAt = (list: EditorTabStop[], pos: number): EditorTabStop[] => {
        const kept = list.filter((t) => !near(t.position, pos));
        if (inherited.some((t) => near(t.position, pos))) {
          kept.push({ position: pos, type: "clear" });
        }
        return kept;
      };

      let list = [...start];
      if (clearAll) {
        list = [];
        for (const t of inherited) {
          list = clearAt(list, t.position);
        }
      }
      for (const pos of clearPositions) {
        list = clearAt(list, pos);
      }
      for (const t of setStops) {
        list = list.filter((x) => !near(x.position, t.position));
        list.push(makeTabStop(t.position, t));
      }
      list.sort((a, b) => a.position - b.position);
      list = list.slice(0, MAX_TAB_STOPS);

      const next = cloneParagraph(paragraph);
      const nextStyle: EditorParagraphStyle = {
        ...(paragraph.style ?? {}),
        tabs: list.length > 0 ? list : null,
      };
      next.style = nextStyle;
      paragraphChanged = true;
      return next;
    },
  );

  // Default tab interval is a document-level setting, applied once regardless
  // of the selection.
  let changed = paragraphChanged;
  const hasDefault = change.default !== undefined && change.default !== null;
  const currentDefault = state.document.settings?.defaultTabStop;
  const nextDefault =
    hasDefault && change.default !== undefined && change.default !== null
      ? Math.min(MAX_TAB_POSITION, Math.max(1, change.default))
      : undefined;
  if (hasDefault || change.default === null) {
    const settingChanged =
      change.default === null
        ? currentDefault !== undefined
        : change.default !== undefined && currentDefault !== nextDefault;
    if (settingChanged) {
      changed = true;
    }
  }

  if (!changed) {
    return state;
  }

  let next = cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );

  if (hasDefault || change.default === null) {
    const settings = { ...(state.document.settings ?? {}) };
    if (change.default === null) {
      delete settings.defaultTabStop;
    } else if (change.default !== undefined) {
      settings.defaultTabStop = nextDefault;
    }
    next = {
      ...next,
      document: { ...next.document, settings },
    };
  }

  return next;
}
