// @ts-nocheck



export class PositionCalculator {
  constructor(layout) {
    this.layout = layout;
  }

  calculateYPosition(position) {
    const fragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!fragments) return null;

    const fragment = fragments.find(
      (f) =>
        position.offset >= f.startOffset && position.offset <= f.endOffset,
    );

    if (!fragment || !fragment.lines) {
      return fragment?.rect.y ?? null;
    }

    const relativeOffset = position.offset - fragment.startOffset;

    for (let i = 0; i < fragment.lines.length; i++) {
      const line = fragment.lines[i];
      if (relativeOffset >= line.offsetStart && relativeOffset <= line.offsetEnd) {
        return line.y;
      }
    }

    return fragment.lines[fragment.lines.length - 1].y;
  }

  calculateXOffset(position, fragment, measurer) {
    if (!fragment || !measurer) return 0;

    const relativeOffset = position.offset - fragment.startOffset;
    
    // Find the line that contains the offset
    let targetLine = fragment.lines ? fragment.lines[0] : null;
    if (fragment.lines) {
      for (const line of fragment.lines) {
        if (relativeOffset >= line.offsetStart && relativeOffset <= line.offsetEnd) {
          targetLine = line;
          break;
        }
      }
      if (!targetLine) {
        targetLine = fragment.lines[fragment.lines.length - 1];
      }
    }

    const lineStartOffset = targetLine ? targetLine.offsetStart : 0;
    const offsetInLine = Math.max(0, relativeOffset - lineStartOffset);
    const textBeforeInLine = fragment.text.substring(lineStartOffset, lineStartOffset + offsetInLine);

    if (!textBeforeInLine) return 0;

    const measured = measurer.measureText({
      text: textBeforeInLine,
      fontFamily: fragment.typography.fontFamily,
      fontSize: fragment.typography.fontSize,
      fontWeight: fragment.typography.fontWeight,
    });

    return measured.width;
  }
}