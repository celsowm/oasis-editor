/**
 * Drop cap authoring commands (WordCraft's `insert.dropCap`, Word's
 * Insert > Text > Drop Cap).
 *
 * A drop cap is a large initial letter sunk into the first lines of the
 * paragraph, with body text wrapping around it. Word stores it as a `w:framePr`
 * with `@dropCap` on a standalone frame paragraph; the editor models it on the
 * wrapping paragraph's `dropCap` descriptor, and the layout/exclusion pipeline
 * carves the cap's gap out of the following lines. These commands set or clear
 * that descriptor so the ribbon can author a drop cap.
 */
import type {
  EditorDropCap,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import { getParagraphText, getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/** Drop cap options WordCraft's `insert.dropCap` accepts. */
export interface DropCapPayload {
  /** Cap letter(s); defaults to the paragraph's first character. */
  text?: string;
  /** Number of body lines the cap spans (default 3, clamped 1-10). */
  lines?: number;
  /** `w:framePr/@dropCap`: "drop" (in text) or "margin" (in the margin). */
  type?: "drop" | "margin";
  /** The cap letter's font family, when given. */
  font?: string;
}

/** Derive a drop cap descriptor from an explicit payload + the paragraph. */
function buildDropCap(
  paragraph: EditorParagraphNode,
  options: DropCapPayload,
): EditorDropCap {
  const text = options.text ?? getParagraphText(paragraph).slice(0, 1);
  const lines = Math.max(1, Math.min(10, Math.round(options.lines ?? 3)));
  const baseStyle = paragraph.runs[0]?.styles;
  const font = options.font;
  return {
    text,
    lines,
    type: options.type === "margin" ? "margin" : "drop",
    style:
      font !== undefined
        ? { ...(baseStyle ?? {}), fontFamily: font }
        : baseStyle,
  };
}

/** Whether any of the selected paragraphs carries a drop cap. */
export function hasDropCap(state: EditorState): boolean {
  const normalized = normalizeSelection(state);
  return getParagraphs(state)
    .slice(normalized.startIndex, normalized.endIndex + 1)
    .some((paragraph) => paragraph.dropCap !== undefined);
}

/**
 * Set a drop cap on every paragraph the selection touches (WordCraft
 * `insert.dropCap`), and clear it when `lines` is 0, `type` is "none", or the
 * payload explicitly requests removal. Applies the descriptor via the
 * paragraph write-back pipeline, preserving the selection.
 */
export function setDropCap(
  state: EditorState,
  options: Omit<DropCapPayload, "type"> & {
    type?: "drop" | "margin" | "none";
  },
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const startIndex = normalized.startIndex;
  const endIndex = normalized.endIndex;
  const remove =
    options.type === "none" ||
    options.lines === 0 ||
    (options.text !== undefined && options.text.length === 0);

  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (paragraphIndex < startIndex || paragraphIndex > endIndex) {
        return cloneParagraph(paragraph);
      }
      if (remove) {
        return { ...cloneParagraph(paragraph), dropCap: undefined };
      }
      return {
        ...cloneParagraph(paragraph),
        dropCap: buildDropCap(paragraph, {
          ...options,
          type: options.type === "margin" ? "margin" : "drop",
        }),
      };
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}
