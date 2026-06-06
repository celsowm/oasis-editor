import type {
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../core/model.js";
import { createEditorLogger } from "../../utils/logger.js";
import { getAvailableWidth } from "./indentation.js";
import { shiftLine } from "./layoutLine.js";

const MAX_JUSTIFY_EXTRA_PER_SPACE_PX = 6;
const MAX_JUSTIFY_DIAGNOSTIC_LOGS = 80;
const textLayoutLogger = createEditorLogger("text-layout");
let justifyDiagnosticCount = 0;

function getLineContentWidth(
  line: EditorLayoutLine,
  charByOffset: Map<number, string>,
): number {
  const firstSlot = line.slots[0];
  if (!firstSlot) {
    return 0;
  }

  let endSlotIndex = line.slots.length - 1;
  while (endSlotIndex > 0) {
    const slot = line.slots[endSlotIndex];
    if (!slot) break;
    const charIndex = slot.offset - 1;
    const char = charByOffset.get(charIndex);
    if (char === " " || char === "\t" || char === "\n") {
      endSlotIndex--;
    } else {
      break;
    }
  }

  const lastContentSlot = line.slots[endSlotIndex];
  if (!lastContentSlot) return 0;

  const slotAfterLastContent = line.slots[endSlotIndex + 1];
  let width = Math.max(
    0,
    (slotAfterLastContent ?? lastContentSlot).left - firstSlot.left,
  );

  if (endSlotIndex > 0) {
    const charIndex = lastContentSlot.offset - 1;
    const char = charByOffset.get(charIndex);
    if (char && /^[.,;:?!'"\-)\]]$/.test(char)) {
      const prevSlot = line.slots[endSlotIndex - 1];
      if (prevSlot) {
        const charWidth = lastContentSlot.left - prevSlot.left;
        width -= charWidth * 0.5;
      }
    }
  }

  return width;
}

function justifyLineBySpaces(
  line: EditorLayoutLine,
  extraSpace: number,
  charByOffset: Map<number, string>,
): EditorLayoutLine {
  if (extraSpace <= 0 || line.endOffset <= line.startOffset) {
    return line;
  }

  let lastContentOffset = line.endOffset - 1;
  while (lastContentOffset >= line.startOffset) {
    const char = charByOffset.get(lastContentOffset);
    if (char && char !== " " && char !== "\t" && char !== "\n") {
      break;
    }
    lastContentOffset -= 1;
  }
  if (lastContentOffset < line.startOffset) {
    return line;
  }

  const spaceOffsets: number[] = [];
  for (
    let offset = line.startOffset;
    offset <= lastContentOffset;
    offset += 1
  ) {
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

function buildLineTextSample(
  line: EditorLayoutLine,
  charByOffset: Map<number, string>,
) {
  let text = "";
  for (let offset = line.startOffset; offset < line.endOffset; offset += 1) {
    text += charByOffset.get(offset) ?? "";
    if (text.length >= 140) {
      return `${text.slice(0, 137)}...`;
    }
  }
  return text;
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
    const availableWidth = getAvailableWidth(
      paragraph,
      styles,
      contentWidth,
      lineIndex === 0,
    );
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
    const isLastLine = lineIndex === lines.length - 1;
    const endsWithHardBreak = lineHardBreaks[lineIndex] === true;
    if (align === "justify" && !isLastLine && !endsWithHardBreak) {
      const spaceCount = Array.from(
        { length: Math.max(0, line.endOffset - line.startOffset) },
        (_, index) => charByOffset.get(line.startOffset + index),
      ).filter((char) => char === " ").length;
      const extraPerSpace = spaceCount > 0 ? extraSpace / spaceCount : null;
      if (justifyDiagnosticCount < MAX_JUSTIFY_DIAGNOSTIC_LOGS) {
        justifyDiagnosticCount += 1;
        textLayoutLogger.debug("justify:line", {
          paragraphId: paragraph.id,
          lineIndex,
          startOffset: line.startOffset,
          endOffset: line.endOffset,
          availableWidth,
          lineWidth,
          extraSpace,
          spaceCount,
          extraPerSpace,
          skipped:
            extraPerSpace !== null &&
            extraPerSpace > MAX_JUSTIFY_EXTRA_PER_SPACE_PX,
          sample: buildLineTextSample(line, charByOffset),
        });
      }
      if (
        extraPerSpace !== null &&
        extraPerSpace > MAX_JUSTIFY_EXTRA_PER_SPACE_PX
      ) {
        return line;
      }
      return justifyLineBySpaces(line, extraSpace, charByOffset);
    }
    return line;
  });
}
