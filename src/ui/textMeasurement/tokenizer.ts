import type {
  EditorLayoutFragment,
  EditorNamedStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import {
  getRunImage,
  getRunTextBox,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { DEFAULT_FONT_SIZE } from "./constants.js";
import { measureCharacterWidth } from "./characterWidth.js";
import type { MeasuredChar, MeasuredToken } from "./types.js";

export function buildParagraphFragments(
  paragraph: EditorParagraphNode,
): EditorLayoutFragment[] {
  let paragraphOffset = 0;
  return paragraph.runs.map((run) => {
    const chars = Array.from(run.text).map((char, index) => ({
      char,
      paragraphOffset: paragraphOffset + index,
      runOffset: index,
    }));
    const runImage = getRunImage(run);
    const runTextBox = getRunTextBox(run);
    const fragment: EditorLayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      image: runImage ? { ...runImage } : undefined,
      textBox: runTextBox ? { ...runTextBox } : undefined,
      revision: run.revision ? { ...run.revision } : undefined,
      chars,
    };
    paragraphOffset += run.text.length;
    return fragment;
  });
}

export function buildMeasuredChars(
  paragraph: EditorParagraphNode,
  fragments: EditorLayoutFragment[],
  styles: Record<string, EditorNamedStyle> | undefined,
): MeasuredChar[] {
  const measured: MeasuredChar[] = [];
  const runsById = new Map(paragraph.runs.map((run) => [run.id, run] as const));
  const fallbackFontSize = Math.max(
    DEFAULT_FONT_SIZE,
    ...paragraph.runs.map(
      (run) =>
        resolveEffectiveTextStyleForParagraph(
          run.styles,
          paragraph.style?.styleId,
          styles,
        ).fontSize ?? DEFAULT_FONT_SIZE,
    ),
  );

  for (const fragment of fragments) {
    const run = runsById.get(fragment.runId);
    const effectiveStyles = resolveEffectiveTextStyleForParagraph(
      run?.styles,
      paragraph.style?.styleId,
      styles,
    );

    for (const char of fragment.chars) {
      let width: number;
      let objectHeight: number | undefined;

      if (char.char === "\uFFFC" && fragment.image) {
        width = fragment.image.floating ? 0 : fragment.image.width;
        objectHeight = fragment.image.floating
          ? undefined
          : fragment.image.height;
      } else if (char.char === "\uFFFC" && fragment.textBox) {
        width = fragment.textBox.floating ? 0 : fragment.textBox.width;
        objectHeight = fragment.textBox.floating
          ? undefined
          : fragment.textBox.height;
      } else {
        width = measureCharacterWidth(
          char.char,
          effectiveStyles,
          fallbackFontSize,
        );
      }

      measured.push({
        char: char.char,
        offset: char.paragraphOffset,
        width,
        ...(objectHeight !== undefined ? { objectHeight } : {}),
        ...(objectHeight === undefined ? { style: effectiveStyles } : {}),
      });
    }
  }

  return measured;
}

export function tokenizeMeasuredChars(chars: MeasuredChar[]): MeasuredToken[] {
  const tokens: MeasuredToken[] = [];
  let current: MeasuredChar[] = [];
  let currentKind: MeasuredToken["kind"] | null = null;

  const flush = () => {
    if (current.length === 0 || !currentKind) {
      return;
    }

    tokens.push({
      kind: currentKind,
      chars: current,
      width: current.reduce((sum, char) => sum + char.width, 0),
    });
    current = [];
    currentKind = null;
  };

  for (const char of chars) {
    if (char.char === "\n") {
      flush();
      tokens.push({ kind: "newline", chars: [char], width: 0 });
      continue;
    }

    const nextKind: MeasuredToken["kind"] = /\s/.test(char.char)
      ? "whitespace"
      : "text";
    if (currentKind && currentKind !== nextKind) {
      flush();
    }
    currentKind = nextKind;
    current.push(char);
  }

  flush();
  return tokens;
}
