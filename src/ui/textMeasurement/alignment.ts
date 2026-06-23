import type {
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { getAvailableWidth } from "./indentation.js";
import { shiftLine } from "./layoutLine.js";

/**
 * Offset of the last non-whitespace character on the line, or `null` when the
 * line has no visible content (only spaces/tabs/newlines).
 */
function lastContentOffset(
  line: EditorLayoutLine,
  charByOffset: Map<number, string>,
): number | null {
  for (
    let offset = line.endOffset - 1;
    offset >= line.startOffset;
    offset -= 1
  ) {
    const char = charByOffset.get(offset);
    if (char && char !== " " && char !== "\t" && char !== "\n") {
      return offset;
    }
  }
  return null;
}

/**
 * Rendered width of the line's visible content: from the first slot up to the
 * trailing edge of the last non-whitespace character. Trailing whitespace is
 * excluded so alignment fills to the real content edge.
 */
function getLineContentWidth(
  line: EditorLayoutLine,
  charByOffset: Map<number, string>,
): number {
  const firstSlot = line.slots[0];
  if (!firstSlot) {
    return 0;
  }
  const contentOffset = lastContentOffset(line, charByOffset);
  if (contentOffset === null) {
    return 0;
  }
  // Slot positions are keyed by offset; the slot after the last content char
  // marks that character's trailing edge.
  const trailingSlot =
    line.slots.find((slot) => slot.offset === contentOffset + 1) ??
    line.slots.find((slot) => slot.offset === contentOffset);
  if (!trailingSlot) {
    return 0;
  }
  // An automatic hyphen is drawn past the last char's trailing edge; count it so
  // right/center/justify alignment reserves room and the hyphen stays in-margin.
  const hyphenWidth = line.trailingHyphen ? (line.trailingHyphenWidth ?? 0) : 0;
  return Math.max(0, trailingSlot.left - firstSlot.left + hyphenWidth);
}

/**
 * Word-like justification: expand the inter-word spaces of an already-broken
 * line so its content fills `extraSpace`. Each slot positioned after the i-th
 * justifiable space is shifted right by `i * gap`.
 */
function justifyLineBySpaces(
  line: EditorLayoutLine,
  extraSpace: number,
  charByOffset: Map<number, string>,
): EditorLayoutLine {
  const contentOffset = lastContentOffset(line, charByOffset);
  if (extraSpace <= 0 || contentOffset === null) {
    return line;
  }

  // Justifiable spaces sit strictly before the last visible character; spaces
  // trailing the content are not expanded.
  const spaceOffsets: number[] = [];
  for (let offset = line.startOffset; offset < contentOffset; offset += 1) {
    if (charByOffset.get(offset) === " ") {
      spaceOffsets.push(offset);
    }
  }
  if (spaceOffsets.length === 0) {
    return line;
  }

  const gap = extraSpace / spaceOffsets.length;
  let spaceIndex = 0;
  let shift = 0;
  return {
    ...line,
    slots: line.slots.map((slot) => {
      while (
        spaceIndex < spaceOffsets.length &&
        slot.offset > spaceOffsets[spaceIndex]!
      ) {
        shift += gap;
        spaceIndex += 1;
      }
      return {
        ...slot,
        left: slot.left + shift,
      };
    }),
  };
}

export function applyParagraphAlignment(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth: number,
  lines: EditorLayoutLine[],
  lineHardBreaks: boolean[],
  charByOffset: Map<number, string>,
): EditorLayoutLine[] {
  if (lines.length === 0) {
    return lines;
  }
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const align = paragraphStyle.align ?? "left";
  if (align === "left") {
    return lines;
  }

  return lines.map((line, lineIndex) => {
    const availableWidth =
      line.availableWidth ??
      getAvailableWidth(paragraph, styles, contentWidth, lineIndex === 0);
    const lineWidth = getLineContentWidth(line, charByOffset);
    const extraSpace = Math.max(0, availableWidth - lineWidth);
    if (extraSpace <= 0) {
      return line;
    }
    if (align === "center") {
      return shiftLine(line, extraSpace / 2);
    }
    if (align === "right") {
      return shiftLine(line, extraSpace);
    }
    // Justify: the last line and lines terminated by a hard break keep their
    // natural (left) spacing, matching Word's `w:jc="both"` behavior.
    const isLastLine = lineIndex === lines.length - 1;
    const endsWithHardBreak = lineHardBreaks[lineIndex] === true;
    if (align === "justify" && !isLastLine && !endsWithHardBreak) {
      return justifyLineBySpaces(line, extraSpace, charByOffset);
    }
    return line;
  });
}
