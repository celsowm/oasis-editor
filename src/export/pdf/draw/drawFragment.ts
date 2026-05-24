import type {
  EditorDocument,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorParagraphNode,
  EditorTextStyle,
} from "../../../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../../core/model.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { registerPdfImageRun } from "../images.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import { DEFAULT_FONT_SIZE_PX, pxToPt, textStyleToFontSizePt } from "../units.js";
import { resolveFragmentBounds, resolveFragmentSlots, type FragmentSlot } from "./fragmentGeometry.js";

export function drawFragmentHighlight(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  if (!styles.highlight) {
    return;
  }
  const bounds = resolveFragmentBounds(line, fragment, styles.fontSize ?? DEFAULT_FONT_SIZE_PX);
  if (!bounds) {
    return;
  }
  writer.drawRect(pageIndex, {
    x: pxToPt(originX + bounds.left),
    y: pxToPt(originY + line.top + 2),
    width: pxToPt(Math.max(0, bounds.right - bounds.left)),
    height: pxToPt(Math.max(2, line.height - 4)),
    fill: styles.highlight,
  });
}

export function drawFragmentDecoration(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
  kind: "underline" | "strike",
): void {
  const bounds = resolveFragmentBounds(line, fragment, styles.fontSize ?? DEFAULT_FONT_SIZE_PX);
  if (!bounds) {
    return;
  }
  const y = kind === "underline"
    ? originY + line.top + line.height - 2
    : originY + line.top + line.height * 0.52;
  writer.drawLine(pageIndex, {
    x1: pxToPt(originX + bounds.left),
    y1: pxToPt(y),
    x2: pxToPt(originX + bounds.right),
    y2: pxToPt(y),
    stroke: styles.color ?? "#000000",
    lineWidth: pxToPt(1),
  });
}

function groupSlotChunksByWhitespace(chars: FragmentSlot[]): FragmentSlot[][] {
  const chunks: FragmentSlot[][] = [];
  let currentChunk: FragmentSlot[] = [];
  for (const char of chars) {
    if (char.char === " ") {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
      continue;
    }
    currentChunk.push(char);
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

export async function drawFragmentText(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
): Promise<void> {
  if (fragment.image) {
    const slot =
      line.slots.find((candidate) => candidate.offset === fragment.startOffset) ??
      line.slots.find((candidate) => candidate.offset >= fragment.startOffset);
    if (!slot) {
      return;
    }
    const resourceName = await registerPdfImageRun(writer, document, fragment.image);
    if (!resourceName) {
      return;
    }
    writer.drawImage(pageIndex, {
      resourceName,
      x: pxToPt(originX + slot.left),
      y: pxToPt(originY + line.top + line.height - fragment.image.height),
      width: pxToPt(fragment.image.width),
      height: pxToPt(fragment.image.height),
    });
    return;
  }

  const styles = resolveEffectiveTextStyleForParagraph(
    fragment.styles,
    paragraph.style?.styleId,
    document.styles,
  );
  const fontFace = fontRegistry.resolveFontFace({
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  });
  const fontSizePt = textStyleToFontSizePt(styles);
  const baselineY = originY + line.top + line.height * 0.8;
  const chars = resolveFragmentSlots(line, fragment);
  const text = chars.map((char) => char.char).join("");
  const firstChar = chars[0];
  if (!firstChar || text.length === 0) {
    return;
  }

  drawFragmentHighlight(writer, pageIndex, line, fragment, originX, originY, styles);

  // When the paragraph is justified, the layout shifts the `left` of each
  // character that follows a space so the line fills the available width.
  // Drawing the whole fragment as a single PDF text run would ignore those
  // per-word shifts (the PDF would use the font's natural space width), so we
  // emit one text command per whitespace-separated chunk in that case.
  const paragraphAlign = resolveEffectiveParagraphStyle(paragraph.style, document.styles).align ?? "left";
  if (paragraphAlign === "justify") {
    const chunks = groupSlotChunksByWhitespace(chars);
    for (const chunk of chunks) {
      const chunkText = chunk.map((c) => c.char).join("");
      if (chunkText.length === 0) continue;
      writer.drawText(pageIndex, {
        x: pxToPt(originX + chunk[0]!.left),
        y: pxToPt(baselineY),
        text: chunkText,
        fontSize: fontSizePt,
        color: styles.color ?? "#000000",
        bold: styles.bold,
        italic: styles.italic,
        fontResourceName: fontFace.writerResourceName,
      });
    }
  } else {
    writer.drawText(pageIndex, {
      x: pxToPt(originX + firstChar.left),
      y: pxToPt(baselineY),
      text,
      fontSize: fontSizePt,
      color: styles.color ?? "#000000",
      bold: styles.bold,
      italic: styles.italic,
      fontResourceName: fontFace.writerResourceName,
    });
  }
  if (styles.underline) {
    drawFragmentDecoration(writer, pageIndex, line, fragment, originX, originY, styles, "underline");
  }
  if (styles.strike) {
    drawFragmentDecoration(writer, pageIndex, line, fragment, originX, originY, styles, "strike");
  }
}
