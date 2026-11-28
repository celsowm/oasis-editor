import type {
  EditorDocument,
  EditorLayoutLine,
  EditorParagraphNode,
} from "@/core/model.js";
import {
  buildListLabels,
  resolveListLabel,
  resolveEffectiveTextStyleForParagraph,
  resolveParagraphList,
} from "@/core/model.js";
import { registerPdfImageRun } from "@/export/pdf/images.js";
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

export async function drawListPrefix(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, string>,
): Promise<void> {
  if (line.index !== 0) {
    return;
  }
  const prefix = resolveListLabel(paragraph, listOrdinals);
  const firstSlot = line.slots[0];
  if (!firstSlot) {
    return;
  }
  const effectiveList = resolveParagraphList(paragraph, document.styles);
  const picture =
    effectiveList?.kind === "bullet" ? effectiveList.bulletPicture : undefined;
  if (picture) {
    const width = picture.widthPx ?? 16;
    const height = picture.heightPx ?? width;
    const resourceName = await registerPdfImageRun(writer, document, {
      src: picture.src,
      width,
      height,
      ...(picture.altText ? { alt: picture.altText } : {}),
    });
    if (resourceName) {
      writer.drawImage(pageIndex, {
        resourceName,
        x: pxToPt(
          originX + Math.max(0, getListLabelInset(paragraph, document.styles)),
        ),
        y: pxToPt(
          originY + line.top + line.height * TEXT_BASELINE_RATIO - height,
        ),
        width: pxToPt(width),
        height: pxToPt(height),
      });
      return;
    }
  }
  if (!prefix) {
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
