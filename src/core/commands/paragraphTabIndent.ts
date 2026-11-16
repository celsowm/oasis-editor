import {
  getParagraphs,
  resolveEffectiveParagraphStyle,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import { cloneParagraphWithListLevel } from "@/core/document/paragraphRunBuild.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { normalizeSelection } from "@/core/selection.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { PX_PER_POINT } from "@/core/units.js";
import { MAX_LIST_LEVEL } from "./paragraphListLevel.js";

export const DEFAULT_TAB_INTERVAL_PT = 36;

/**
 * Relative keyboard indentation for a whole/selected paragraph or list item.
 * Paragraph indents are CSS px; document tab interval is pt. Each paragraph
 * keeps its own effective starting indent, and list levels saturate at 0–8.
 * Automatic first-line indentation is a separate policy.
 */
export function stepTabParagraphIndent(state: EditorState, direction: -1 | 1): EditorState {
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return state;
  const range = normalizeSelection(state, paragraphs);
  const configured = state.document.settings?.defaultTabStop;
  const intervalPt = typeof configured === "number" && Number.isFinite(configured) && configured > 0
    ? configured : DEFAULT_TAB_INTERVAL_PT;
  const stepPx = intervalPt * PX_PER_POINT;
  let changed = false;
  const next = paragraphs.map((p, index): EditorParagraphNode => {
    if (index < range.startIndex || index > range.endIndex) return p;
    if (p.list) {
      const level = p.list.level ?? 0;
      const updated = Math.max(0, Math.min(MAX_LIST_LEVEL, level + direction));
      if (updated === level) return p;
      changed = true;
      return cloneParagraphWithListLevel(p, updated);
    }
    const effective = resolveEffectiveParagraphStyle(p.style, state.document.styles);
    const before = effective.indentLeft ?? 0;
    // Preserve inherited indentation when changing by an interval; a direct
    // zero must override inherited values rather than deleting the property.
    if (direction < 0 && before <= 0) return p;
    const after = direction < 0 ? Math.max(0, before - stepPx) : before + stepPx;
    if (after === before || !Number.isFinite(after)) return p;
    changed = true;
    return { ...p, style: { ...p.style, indentLeft: after } };
  });
  if (!changed) return state;
  return cloneStateWithParagraphs(state, next, preserveSelectionByParagraphOffsets(next, range));
}
