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

    if (offsetInLine === 0) return 0;

    let totalWidth = 0;
    let currentGlobalOffset = 0;

    const runs = fragment.runs || [{ text: fragment.text, marks: fragment.marks || {} }];

    for (const run of runs) {
       const runStart = currentGlobalOffset;
       const runEnd = currentGlobalOffset + run.text.length;

       const measureStart = Math.max(lineStartOffset, runStart);
       const measureEnd = Math.min(lineStartOffset + offsetInLine, runEnd);

       if (measureStart < measureEnd) {
          const textToMeasure = run.text.substring(measureStart - runStart, measureEnd - runStart);

          let fontWeight = fragment.typography.fontWeight;
          if (run.marks?.bold || fragment.kind === "heading") fontWeight = 700;
          let fontStyle = run.marks?.italic ? "italic" : "normal";

          const measured = measurer.measureText({
             text: textToMeasure,
             fontFamily: run.marks?.fontFamily || fragment.typography.fontFamily,
             fontSize: run.marks?.fontSize || fragment.typography.fontSize,
             fontWeight,
             fontStyle
          });
          totalWidth += measured.width;
       }

       currentGlobalOffset += run.text.length;
       if (currentGlobalOffset >= lineStartOffset + offsetInLine) break;
    }

    return totalWidth;
  }
}