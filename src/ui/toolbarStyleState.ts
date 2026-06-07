import type {
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorPosition,
  EditorState,
  EditorTextStyle,
} from "../core/model.js";
import {
  getParagraphText,
  getParagraphs,
  positionToParagraphOffset,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../core/model.js";
import { clampPosition, normalizeSelection } from "../core/selection.js";
import type { NormalizedEditorSelection } from "../core/selection.js";

export type BooleanStyleKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "doubleStrike"
  | "superscript"
  | "subscript"
  | "smallCaps"
  | "allCaps"
  | "hidden"
  | "noProof"
  | "contextualAlternates";

export type ValueStyleKey =
  | "fontFamily"
  | "fontSize"
  | "color"
  | "highlight"
  | "shading"
  | "language"
  | "link"
  | "underlineStyle"
  | "underlineColor"
  | "characterScale"
  | "characterSpacing"
  | "baselineShift"
  | "kerningThreshold"
  | "ligatures"
  | "numberSpacing"
  | "numberForm"
  | "stylisticSet";
export type ParagraphStyleKey =
  | "styleId"
  | "align"
  | "spacingBefore"
  | "spacingAfter"
  | "lineHeight"
  | "indentLeft"
  | "indentRight"
  | "indentFirstLine"
  | "indentHanging"
  | "shading"
  | "tabs"
  | "borderTop"
  | "borderRight"
  | "borderBottom"
  | "borderLeft"
  | "pageBreakBefore"
  | "keepWithNext";

export interface ToolbarStyleState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  underlineStyle: string;
  underlineColor: string;
  strike: boolean;
  doubleStrike: boolean;
  superscript: boolean;
  subscript: boolean;
  smallCaps: boolean;
  allCaps: boolean;
  hidden: boolean;
  noProof: boolean;
  characterScale: string;
  characterSpacing: string;
  baselineShift: string;
  kerningThreshold: string;
  ligatures: string;
  numberSpacing: string;
  numberForm: string;
  stylisticSet: string;
  contextualAlternates: boolean;
  fontFamily: string;
  fontSize: string;
  color: string;
  highlight: string;
  textShading: string;
  link: string;
  styleId: string;
  align: string;
  lineHeight: string;
  spacingBefore: string;
  spacingAfter: string;
  indentLeft: string;
  indentRight: string;
  indentFirstLine: string;
  indentHanging: string;
  shading: string;
  borderStyle: string;
  borderWidth: string;
  borderColor: string;
  borderSideTop: boolean;
  borderSideRight: boolean;
  borderSideBottom: boolean;
  borderSideLeft: boolean;
  listKind: string;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
}

function selectionOverlapsRun(
  runStart: number,
  runEnd: number,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  return Math.max(runStart, selectionStart) < Math.min(runEnd, selectionEnd);
}

function getSelectedRunStyles(
  state: EditorState,
  paragraphs: EditorParagraphNode[],
  normalized: NormalizedEditorSelection,
): EditorTextStyle[] {
  const { styles: docStyles } = state.document;
  if (normalized.isCollapsed) {
    const paragraph = paragraphs[normalized.startIndex];
    if (!paragraph) {
      return [];
    }
    const style = getCollapsedRunStyle(
      paragraph,
      clampPosition(state, state.selection.focus),
    );
    return [
      resolveEffectiveTextStyleForParagraph(
        style,
        paragraph.style?.styleId,
        docStyles,
      ),
    ];
  }

  const styles: EditorTextStyle[] = [];

  for (
    let paragraphIndex = normalized.startIndex;
    paragraphIndex <= normalized.endIndex;
    paragraphIndex += 1
  ) {
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) {
      continue;
    }

    const selectionStart =
      paragraphIndex === normalized.startIndex
        ? normalized.startParagraphOffset
        : 0;
    const selectionEnd =
      paragraphIndex === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphText(paragraph).length;

    let runStart = 0;
    for (const run of paragraph.runs) {
      const runEnd = runStart + run.text.length;
      if (
        selectionOverlapsRun(runStart, runEnd, selectionStart, selectionEnd)
      ) {
        styles.push(
          resolveEffectiveTextStyleForParagraph(
            run.styles,
            paragraph.style?.styleId,
            docStyles,
          ),
        );
      }
      runStart = runEnd;
    }
  }

  return styles;
}

function getCollapsedRunStyle(
  paragraph: EditorParagraphNode,
  position: EditorPosition,
): EditorTextStyle | undefined {
  const paragraphOffset = positionToParagraphOffset(paragraph, position);
  let consumed = 0;

  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const endOffset = consumed + run.text.length;

    if (paragraphOffset < endOffset) {
      return run.styles ?? undefined;
    }

    if (paragraphOffset === endOffset) {
      if (run.styles) {
        return run.styles;
      }

      const nextRun = paragraph.runs[index + 1];
      return nextRun?.styles ?? undefined;
    }

    consumed = endOffset;
  }

  return paragraph.runs[paragraph.runs.length - 1]?.styles ?? undefined;
}

function areAllBooleanStylesEnabled(
  styles: EditorTextStyle[],
  key: BooleanStyleKey,
): boolean {
  return styles.length > 0 && styles.every((style) => Boolean(style[key]));
}

function resolveUniformStyleValue<K extends ValueStyleKey>(
  styles: EditorTextStyle[],
  key: K,
): string {
  if (styles.length === 0) {
    return "";
  }

  const first = styles[0]?.[key];
  if (first === undefined || first === null || first === "") {
    return "";
  }

  const serialized = String(first);
  return styles.every((style) => String(style[key] ?? "") === serialized)
    ? serialized
    : "";
}

function getSelectedParagraphStyles(
  state: EditorState,
  paragraphs: EditorParagraphNode[],
  normalized: NormalizedEditorSelection,
): EditorParagraphStyle[] {
  const { styles: docStyles } = state.document;
  return paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1)
    .map((paragraph) =>
      resolveEffectiveParagraphStyle(paragraph.style, docStyles),
    );
}

function resolveUniformParagraphStyleValue<K extends ParagraphStyleKey>(
  styles: EditorParagraphStyle[],
  key: K,
): string {
  if (styles.length === 0) {
    return "";
  }

  const first = styles[0]?.[key];
  if (first === undefined || first === null) {
    return "";
  }

  const serialized = String(first);
  return styles.every((style) => String(style[key] ?? "") === serialized)
    ? serialized
    : "";
}

function resolveUniformParagraphFlag(
  styles: EditorParagraphStyle[],
  key: "pageBreakBefore" | "keepWithNext",
): boolean {
  return styles.length > 0 && styles.every((style) => style[key] === true);
}

const BORDER_EDGE_KEYS = [
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
] as const;

type BorderEdgeKey = (typeof BORDER_EDGE_KEYS)[number];

interface ResolvedBoxBorder {
  /** Shared style/width/color of the present edges, or null when none/mixed. */
  shared: EditorParagraphStyle["borderTop"];
  /** Which edges carry a visible border across the whole selection. */
  sides: Record<BorderEdgeKey, boolean>;
}

function isVisibleBorder(border: EditorParagraphStyle["borderTop"]): boolean {
  return !!border && border.type !== "none" && border.width > 0;
}

/**
 * Surfaces paragraph borders for the dialog's "shared style + side toggles"
 * model: a side is on only when every selected paragraph has a visible border
 * there, and `shared` carries the common style/width/color of the present edges
 * (null when nothing is present or the present edges disagree).
 */
function resolveBoxBorder(styles: EditorParagraphStyle[]): ResolvedBoxBorder {
  const sides = {
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
  } as Record<BorderEdgeKey, boolean>;

  if (styles.length === 0) {
    return { shared: null, sides };
  }

  for (const key of BORDER_EDGE_KEYS) {
    sides[key] = styles.every((style) => isVisibleBorder(style[key]));
  }

  const present: EditorParagraphStyle["borderTop"][] = [];
  for (const style of styles) {
    for (const key of BORDER_EDGE_KEYS) {
      if (isVisibleBorder(style[key])) {
        present.push(style[key]);
      }
    }
  }
  if (present.length === 0) {
    return { shared: null, sides };
  }
  const reference = JSON.stringify(present[0]);
  const uniform = present.every(
    (border) => JSON.stringify(border) === reference,
  );
  return { shared: uniform ? (present[0] ?? null) : null, sides };
}

function resolveUniformListKind(
  paragraphs: ReturnType<typeof getParagraphs>,
): string {
  if (paragraphs.length === 0) {
    return "";
  }

  const firstKind = paragraphs[0]?.list?.kind;
  if (!firstKind) {
    return "";
  }

  return paragraphs.every((paragraph) => paragraph.list?.kind === firstKind)
    ? firstKind
    : "";
}

export function getToolbarStyleState(state: EditorState): ToolbarStyleState {
  const paragraphs = getParagraphs(state);
  const normalized = normalizeSelection(state, paragraphs);
  const styles = getSelectedRunStyles(state, paragraphs, normalized);
  const paragraphStyles = getSelectedParagraphStyles(
    state,
    paragraphs,
    normalized,
  );
  const selectedParagraphs = paragraphs.slice(
    normalized.startIndex,
    normalized.endIndex + 1,
  );
  const boxBorder = resolveBoxBorder(paragraphStyles);

  return {
    bold: areAllBooleanStylesEnabled(styles, "bold"),
    italic: areAllBooleanStylesEnabled(styles, "italic"),
    underline: areAllBooleanStylesEnabled(styles, "underline"),
    underlineStyle: resolveUniformStyleValue(styles, "underlineStyle"),
    underlineColor: resolveUniformStyleValue(styles, "underlineColor"),
    strike: areAllBooleanStylesEnabled(styles, "strike"),
    doubleStrike: areAllBooleanStylesEnabled(styles, "doubleStrike"),
    superscript: areAllBooleanStylesEnabled(styles, "superscript"),
    subscript: areAllBooleanStylesEnabled(styles, "subscript"),
    smallCaps: areAllBooleanStylesEnabled(styles, "smallCaps"),
    allCaps: areAllBooleanStylesEnabled(styles, "allCaps"),
    hidden: areAllBooleanStylesEnabled(styles, "hidden"),
    noProof: areAllBooleanStylesEnabled(styles, "noProof"),
    characterScale: resolveUniformStyleValue(styles, "characterScale"),
    characterSpacing: resolveUniformStyleValue(styles, "characterSpacing"),
    baselineShift: resolveUniformStyleValue(styles, "baselineShift"),
    kerningThreshold: resolveUniformStyleValue(styles, "kerningThreshold"),
    ligatures: resolveUniformStyleValue(styles, "ligatures"),
    numberSpacing: resolveUniformStyleValue(styles, "numberSpacing"),
    numberForm: resolveUniformStyleValue(styles, "numberForm"),
    stylisticSet: resolveUniformStyleValue(styles, "stylisticSet"),
    contextualAlternates: areAllBooleanStylesEnabled(
      styles,
      "contextualAlternates",
    ),
    fontFamily: resolveUniformStyleValue(styles, "fontFamily"),
    fontSize: resolveUniformStyleValue(styles, "fontSize"),
    color: resolveUniformStyleValue(styles, "color"),
    highlight: resolveUniformStyleValue(styles, "highlight"),
    textShading: resolveUniformStyleValue(styles, "shading"),
    link: resolveUniformStyleValue(styles, "link"),
    styleId: resolveUniformParagraphStyleValue(paragraphStyles, "styleId"),
    align: resolveUniformParagraphStyleValue(paragraphStyles, "align"),
    lineHeight: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "lineHeight",
    ),
    spacingBefore: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "spacingBefore",
    ),
    spacingAfter: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "spacingAfter",
    ),
    indentLeft: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "indentLeft",
    ),
    indentRight: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "indentRight",
    ),
    indentFirstLine: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "indentFirstLine",
    ),
    indentHanging: resolveUniformParagraphStyleValue(
      paragraphStyles,
      "indentHanging",
    ),
    shading: resolveUniformParagraphStyleValue(paragraphStyles, "shading"),
    borderStyle: boxBorder.shared ? boxBorder.shared.type : "",
    borderWidth: boxBorder.shared ? String(boxBorder.shared.width) : "",
    borderColor: boxBorder.shared ? boxBorder.shared.color : "",
    borderSideTop: boxBorder.sides.borderTop,
    borderSideRight: boxBorder.sides.borderRight,
    borderSideBottom: boxBorder.sides.borderBottom,
    borderSideLeft: boxBorder.sides.borderLeft,
    listKind: resolveUniformListKind(selectedParagraphs),
    pageBreakBefore: resolveUniformParagraphFlag(
      paragraphStyles,
      "pageBreakBefore",
    ),
    keepWithNext: resolveUniformParagraphFlag(paragraphStyles, "keepWithNext"),
  };
}
