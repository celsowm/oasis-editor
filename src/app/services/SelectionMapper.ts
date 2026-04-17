// @ts-nocheck








export class SelectionMapper {








  constructor(layout, measurer) {
    this.layout = layout;
    this.measurer = measurer;
  }

  getCaretRect(position) {
    if (!position) return null;

    const blockFragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!blockFragments) return null;

    // Find the fragment that contains the offset
    const fragment =
      blockFragments.find(
        (f) =>
          position.offset >= f.startOffset && position.offset <= f.endOffset,
      ) || blockFragments[blockFragments.length - 1];

    if (!fragment) return null;

    const relativeOffset = position.offset - fragment.startOffset;
    const textBefore = fragment.text.substring(0, relativeOffset);

    let xOffset = 0;
    if (this.measurer && textBefore.length > 0) {
      const measured = this.measurer.measureText({
        text: textBefore,
        fontFamily: fragment.typography.fontFamily,
        fontSize: fragment.typography.fontSize,
        fontWeight: fragment.typography.fontWeight,
      });
      xOffset = measured.width;
    }

    // Calcular altura da linha baseada no fontSize (aproximadamente 1.2x o tamanho da fonte)
    const lineHeight = fragment.typography.fontSize * 1.2;

    return {
      x: fragment.rect.x + xOffset,
      y: fragment.rect.y,
      height: lineHeight,
      pageId: fragment.pageId,
    };
  }

  getSelectionRects(range) {
    // Basic implementation: just one rect for now
    const startRect = this.getCaretRect(range.start);
    const endRect = this.getCaretRect(range.end);

    if (!startRect || !endRect) return [];

    if (startRect.pageId === endRect.pageId) {
      return [
        {
          x: startRect.x,
          y: startRect.y,
          width: Math.abs(endRect.x - startRect.x),
          height: startRect.height,
          pageId: startRect.pageId,
        },
      ];
    }

    return [];
  }
}
