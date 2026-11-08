import type { EditorClipboardParagraphSpec } from "./clipboard.js";
import type { EditorState, EditorTextStyle } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { getStyleAtOffset } from "@/core/document/paragraphRuns.js";
import { cloneParagraphStyle, cloneStyle } from "@/core/textStyle/textStyleMutations.js";

/**
 * Merge Formatting uses destination character and paragraph styling but
 * preserves explicitly specified source emphasis and hyperlinks.
 * Source fonts, sizes, colours, revisions and paragraph metrics do not transfer.
 */
const EMPHASIS_KEYS = [
  "bold", "italic", "underline", "underlineStyle", "underlineColor",
  "strike", "doubleStrike", "smallCaps", "allCaps", "superscript", "subscript",
  "link",
] as const satisfies ReadonlyArray<keyof EditorTextStyle>;

function mergeRunStyle(
  destination: EditorTextStyle | undefined,
  source: EditorTextStyle | undefined,
): EditorTextStyle | undefined {
  const merged: EditorTextStyle = cloneStyle(destination) ?? {};
  // Never inherit a destination hyperlink onto newly inserted plain text.
  delete merged.link;
  for (const key of EMPHASIS_KEYS) {
    if (source?.[key] !== undefined) {
      Object.assign(merged, { [key]: source[key] });
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function mergeClipboardFormatting(
  state: EditorState,
  paragraphs: EditorClipboardParagraphSpec[],
): EditorClipboardParagraphSpec[] {
  if (paragraphs.length === 0) return [];
  const selection = normalizeSelection(state);
  const at = getParagraphs(state)[selection.startIndex];
  if (!at) return paragraphs;
  const destinationStyle = getStyleAtOffset(at, selection.startParagraphOffset);
  return paragraphs.map((paragraph) => ({
    runs: paragraph.runs.map((run) => ({
      ...run,
      styles: mergeRunStyle(destinationStyle, run.styles),
    })),
    style: cloneParagraphStyle(at.style),
    list: at.list ? { ...at.list } : undefined,
  }));
}
