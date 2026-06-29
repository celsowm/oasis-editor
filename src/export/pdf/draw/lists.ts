import type {
  EditorDocument,
  EditorLayoutLine,
  EditorParagraphNode,
} from "@/core/model.js";
import {
  buildListLabels,
  resolveListLabel,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { pxToPt, textStyleToFontSizePt } from "@/export/pdf/units.js";
import { PX_PER_POINT } from "@/core/units.js";
import { TEXT_BASELINE_RATIO } from "@/core/layoutConstants.js";
import {
  getAlignedListLabelInset,
  getListLabelInset,
} from "@/ui/textMeasurement/indentation.js";

export function getListOrdinals(document: EditorDocument): Map<string, string> {
  return buildListLabels(document);
}

export function drawListPrefix(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, string>,
): void {
  if (line.index !== 0) {
    return;
  }
  const prefix = resolveListLabel(paragraph, listOrdinals);
  if (!prefix) {
    return;
  }
  const firstSlot = line.slots[0];
  if (!firstSlot) {
    return;
  }
  const styles = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    document.styles,
  );
  const fontFace = fontRegistry.resolveFontFace({
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  });
  // Label sits in the hanging area; the first-line text begins at the text
  // indent (advanced to the suffix tab stop), leaving the gap.
  const labelInset = getListLabelInset(paragraph, document.styles);
  const fontSizePt = textStyleToFontSizePt(styles);
  const estimatedLabelWidthPx =
    prefix.length * fontSizePt * 0.62 * PX_PER_POINT;
  const alignedInset = getAlignedListLabelInset(
    paragraph,
    document.styles,
    firstSlot.left,
    estimatedLabelWidthPx,
  );
  writer.drawText(pageIndex, {
    x: pxToPt(originX + Math.max(0, alignedInset || labelInset)),
    y: pxToPt(originY + line.top + line.height * TEXT_BASELINE_RATIO),
    text: prefix,
    fontSize: fontSizePt,
    color: styles.color ?? "#000000",
    bold: styles.bold,
    italic: styles.italic,
    fontResourceName: fontFace.writerResourceName,
  });
}
