import {
  getParagraphs,
  resolveEffectiveParagraphStyle,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import { cloneParagraphWithListLevel } from "@/core/document/paragraphRunBuild.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { normalizeSelection } from "@/core/selection.js";
import { PX_PER_POINT } from "@/core/units.js";
import { MAX_LIST_LEVEL } from "./paragraphListLevel.js";

export const DEFAULT_TAB_INTERVAL_PT = 36;

export function tabIntervalPx(state: EditorState): number {
  const configured = state.document.settings?.defaultTabStop;
  const interval = typeof configured === "number" && Number.isFinite(configured) && configured > 0
    ? configured : DEFAULT_TAB_INTERVAL_PT;
  return interval * PX_PER_POINT;
}

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
  const stepPx = tabIntervalPx(state);
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
  // Paragraph text/run identities are unchanged, so preserve selection direction.
  return cloneStateWithParagraphs(state, next, state.selection);
}

/** AutoFormat at a nonempty paragraph's first line, or its inverse. */
export function stepFirstLineIndent(state: EditorState, direction: -1 | 1): EditorState {
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return state;
  const range = normalizeSelection(state, paragraphs);
  if (!range.isCollapsed || range.startParagraphOffset !== 0) return state;
  const p = paragraphs[range.startIndex];
  if (!p || p.list) return state;
  const style = resolveEffectiveParagraphStyle(p.style, state.document.styles);
  const old = style.indentFirstLine ?? 0;
  const hanging = style.indentHanging ?? 0;
  if (direction > 0 && (old !== 0 || hanging !== 0)) return stepTabParagraphIndent(state, 1);
  if (direction < 0 && old <= 0) return state;
  const nextValue = direction > 0 ? tabIntervalPx(state) : Math.max(0, old - tabIntervalPx(state));
  const next = paragraphs.map((paragraph, index): EditorParagraphNode =>
    index === range.startIndex
      ? { ...paragraph, style: { ...paragraph.style, indentFirstLine: nextValue, indentHanging: 0 } }
      : paragraph,
  );
  return cloneStateWithParagraphs(state, next, state.selection);
}


/**
 * Ordinary Backspace at a collapsed paragraph start reverses indentation
 * before deleting a paragraph boundary. Reverse the body indent first, then
 * the first-line indent, matching the order established by consecutive Tabs.
 * List-item boundaries are handled by the existing list-specific policy.
 */
export function resolveParagraphBoundaryOutdent(
  state: EditorState,
): "paragraph" | "firstLine" | null {
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return null;
  const range = normalizeSelection(state, paragraphs);
  if (!range.isCollapsed || range.startParagraphOffset !== 0) return null;
  const paragraph = paragraphs[range.startIndex];
  if (!paragraph || paragraph.list) return null;
  const effective = resolveEffectiveParagraphStyle(paragraph.style, state.document.styles);
  if ((effective.indentLeft ?? 0) > 0) return "paragraph";
  if ((effective.indentFirstLine ?? 0) > 0 && (effective.indentHanging ?? 0) <= 0) return "firstLine";
  return null;
}

export function outdentParagraphAtBoundary(state: EditorState): EditorState {
  const action = resolveParagraphBoundaryOutdent(state);
  if (action === "paragraph") return stepTabParagraphIndent(state, -1);
  if (action === "firstLine") return stepFirstLineIndent(state, -1);
  return state;
}
