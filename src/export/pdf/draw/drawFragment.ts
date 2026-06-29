import type {
  EditorDocument,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorParagraphNode,
  EditorTextStyle,
  EditorPageSettings,
  EditorCaretSlot,
} from "@/core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { resolveOpenTypeFeatureTags } from "@/core/textStyleMappings.js";
import { TEXT_BASELINE_RATIO } from "@/core/layoutConstants.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { paintTextBox } from "./drawTextBoxShape.js";
import type { BlockDrawers } from "./blockDrawers.js";
import { registerPdfImageRun } from "@/export/pdf/images.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import {
  DEFAULT_FONT_SIZE_PX,
  pxToPt,
  textStyleToFontSizePt,
} from "@/export/pdf/units.js";
import {
  resolveFragmentBounds,
  resolveFragmentSlots,
} from "./fragmentGeometry.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import {
  getImageFloatingGeometry,
  resolveFloatingObjectRect,
} from "@/layoutProjection/floatingObjects.js";
import {
  resolveDecorationLineY,
  DOUBLE_STRIKE_OFFSET_PX,
} from "@/core/decorationGeometry.js";

// Fragment-level sub-modules — each owns one rendering concern.
import {
  drawFragmentHighlight,
  drawFragmentShading,
  drawFragmentBorder,
} from "./fragment/pdfRunBackground.js";
import { resolveGradientShadingName } from "./fragment/pdfGradient.js";
import { drawUnderlineWithStyle } from "./fragment/pdfTextDecoration.js";
import {
  drawFragmentEmphasis,
  drawTabLeaders,
} from "./fragment/pdfEmphasisAndTabLeaders.js";
import {
  emitTextChunk,
  groupSlotChunksByWhitespace,
  groupSlotChunksByOffsetGaps,
  type TextChunkCtx,
} from "./fragment/pdfTextChunks.js";

export { drawFragmentHighlight, drawFragmentShading, drawFragmentBorder };
export { drawFragmentEmphasis };

export async function drawFloatingImagesForParagraph(options: {
  writer: OasisPdfWriter;
  pageIndex: number;
  lines: EditorLayoutLine[];
  document: EditorDocument;
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  layer: "behind" | "front";
}): Promise<void> {
  for (const line of options.lines) {
    const slots = new Map(
      line.slots.map((slot): [number, EditorCaretSlot] => [slot.offset, slot]),
    );
    for (const fragment of line.fragments) {
      const image = fragment.image;
      if (!image?.floating) continue;
      const isBehind = Boolean(image.floating.behindDoc);
      if ((options.layer === "behind") !== isBehind) continue;
      const slot = slots.get(fragment.startOffset);
      const rect = resolveFloatingObjectRect({
        object: getImageFloatingGeometry(image),
        pageSettings: options.pageSettings,
        contentLeft: options.contentLeft,
        contentTop: options.contentTop,
        contentWidth: options.contentWidth,
        paragraphTop: options.paragraphTop,
        lineTop: options.paragraphTop + line.top,
        anchorLeft: options.contentLeft + (slot?.left ?? 0),
      });
      const resourceName = await registerPdfImageRun(
        options.writer,
        options.document,
        image,
      );
      if (!resourceName) continue;
      options.writer.drawImage(options.pageIndex, {
        resourceName,
        x: pxToPt(rect.x),
        y: pxToPt(rect.y),
        width: pxToPt(rect.width),
        height: pxToPt(rect.height),
        rotation: image.rotation,
      });
    }
  }
}

export function drawFragmentDecoration(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
  kind: "underline" | "strike" | "doubleStrike",
): void {
  const bounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
  if (!bounds) return;

  const y = originY + resolveDecorationLineY(kind, line.top, line.height);
  const x1 = originX + bounds.left;
  const x2 = originX + bounds.right;
  const stroke =
    kind === "underline"
      ? (styles.underlineColor ?? styles.color ?? "#000000")
      : (styles.color ?? "#000000");

  if (kind === "strike") {
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(y),
      x2: pxToPt(x2),
      y2: pxToPt(y),
      stroke,
      lineWidth: pxToPt(1),
    });
    return;
  }
  if (kind === "doubleStrike") {
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(y - DOUBLE_STRIKE_OFFSET_PX),
      x2: pxToPt(x2),
      y2: pxToPt(y - DOUBLE_STRIKE_OFFSET_PX),
      stroke,
      lineWidth: pxToPt(1),
    });
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(y + DOUBLE_STRIKE_OFFSET_PX),
      x2: pxToPt(x2),
      y2: pxToPt(y + DOUBLE_STRIKE_OFFSET_PX),
      stroke,
      lineWidth: pxToPt(1),
    });
    return;
  }

  drawUnderlineWithStyle(
    writer,
    pageIndex,
    x1,
    x2,
    y,
    stroke,
    styles.underlineStyle,
  );
}

function drawLinkAnnotation(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: EditorTextStyle,
): void {
  if (!styles.link) return;
  const linkBounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
  if (!linkBounds || linkBounds.right <= linkBounds.left) return;
  const isInternal = styles.link.startsWith("#");
  writer.addLinkAnnotation(pageIndex, {
    x: pxToPt(originX + linkBounds.left),
    y: pxToPt(originY + line.top),
    width: pxToPt(linkBounds.right - linkBounds.left),
    height: pxToPt(line.height),
    ...(isInternal ? { destName: styles.link.slice(1) } : { uri: styles.link }),
  });
}

function emitFragmentGlyphs(
  chunkCtx: TextChunkCtx,
  chars: ReturnType<typeof resolveFragmentSlots>,
  originX: number,
  styles: EditorTextStyle,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  paragraphAlign: string,
): void {
  const chunks =
    paragraphAlign === "justify"
      ? groupSlotChunksByWhitespace(chars)
      : groupSlotChunksByOffsetGaps(chars);
  for (const chunk of chunks) {
    const chunkText = chunk
      .map((c): string => (styles.allCaps ? c.char.toUpperCase() : c.char))
      .join("");
    if (chunkText.length === 0) continue;
    emitTextChunk(chunkCtx, originX + chunk[0]!.left, chunkText);
  }
  // Trailing hyphen on last fragment of an auto-hyphenated line.
  if (line.trailingHyphen && fragment.endOffset >= line.endOffset) {
    const endSlot =
      line.slots.find((slot): boolean => slot.offset === line.endOffset) ??
      line.slots[line.slots.length - 1];
    if (endSlot) emitTextChunk(chunkCtx, originX + endSlot.left, "-");
  }
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
  drawers: BlockDrawers,
): Promise<void> {
  if (fragment.image) {
    if (fragment.image.floating) return;
    const slot =
      line.slots.find((c): boolean => c.offset === fragment.startOffset) ??
      line.slots.find((c): boolean => c.offset >= fragment.startOffset);
    if (!slot) return;
    const resourceName = await registerPdfImageRun(
      writer,
      document,
      fragment.image,
    );
    if (!resourceName) return;
    writer.drawImage(pageIndex, {
      resourceName,
      x: pxToPt(originX + slot.left),
      y: pxToPt(originY + line.top + line.height - fragment.image.height),
      width: pxToPt(fragment.image.width),
      height: pxToPt(fragment.image.height),
      rotation: fragment.image.rotation,
    });
    return;
  }

  if (fragment.textBox) {
    if (fragment.textBox.floating) return;
    const slot =
      line.slots.find((c): boolean => c.offset === fragment.startOffset) ??
      line.slots.find((c): boolean => c.offset >= fragment.startOffset);
    if (!slot) return;
    await paintTextBox(
      writer,
      fragment.textBox,
      { document, fontRegistry, pageIndex },
      originX + slot.left,
      originY + line.top + line.height - fragment.textBox.height,
      fragment.textBox.width,
      fragment.textBox.height,
      drawers,
    );
    return;
  }

  const styles = resolveEffectiveTextStyleForParagraph(
    fragment.styles,
    paragraph.style?.styleId,
    document.styles,
  );
  if (styles.hidden) return;

  const fontFace = fontRegistry.resolveFontFace({
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  });
  const fontSizePt = styles.smallCaps
    ? textStyleToFontSizePt(styles) * 0.8
    : textStyleToFontSizePt(styles);
  const baselineShiftPx = (styles.baselineShift ?? 0) * PX_PER_POINT;
  const baselineY =
    originY + line.top + line.height * TEXT_BASELINE_RATIO - baselineShiftPx;
  const chars = resolveFragmentSlots(line, fragment);
  const text = chars
    .map((char): string =>
      styles.allCaps ? char.char.toUpperCase() : char.char,
    )
    .join("");
  const firstChar = chars[0];
  if (!firstChar || text.length === 0) return;

  drawLinkAnnotation(
    writer,
    pageIndex,
    line,
    fragment,
    originX,
    originY,
    styles,
  );

  drawFragmentShading(
    writer,
    pageIndex,
    line,
    fragment,
    originX,
    originY,
    styles,
  );
  drawFragmentHighlight(
    writer,
    pageIndex,
    line,
    fragment,
    originX,
    originY,
    styles,
  );
  drawFragmentBorder(
    writer,
    pageIndex,
    line,
    fragment,
    originX,
    originY,
    styles,
  );
  drawTabLeaders(
    writer,
    pageIndex,
    paragraph,
    line,
    fragment,
    document,
    originX,
    baselineY,
    styles.color ?? "#000000",
  );

  const paragraphAlign =
    resolveEffectiveParagraphStyle(paragraph.style, document.styles).align ??
    "left";
  const fontFeatures = resolveOpenTypeFeatureTags(
    styles,
    textStyleToFontSizePt(styles),
  );
  const baseTextOptions = {
    fontSize: fontSizePt,
    bold: styles.bold,
    italic: styles.italic,
    fontResourceName: fontFace.writerResourceName,
    characterSpacing: styles.characterSpacing ?? 0,
    horizontalScale: styles.characterScale ?? 100,
    fontFeatures,
  };
  const mainColor =
    styles.textFill?.type === "solid"
      ? styles.textFill.color
      : styles.textFill?.type === "gradient" && styles.textFill.stops[0]
        ? styles.textFill.stops[0].color
        : (styles.color ?? "#000000");
  const gradientShadingName = resolveGradientShadingName(
    writer,
    pageIndex,
    line,
    fragment,
    originX,
    originY,
    styles,
  );
  const chunkCtx: TextChunkCtx = {
    writer,
    pageIndex,
    baselineY,
    fontSizePt,
    mainColor,
    gradientShadingName,
    styles,
    baseTextOptions,
  };

  emitFragmentGlyphs(
    chunkCtx,
    chars,
    originX,
    styles,
    line,
    fragment,
    paragraphAlign,
  );

  if (styles.underline) {
    drawFragmentDecoration(
      writer,
      pageIndex,
      line,
      fragment,
      originX,
      originY,
      styles,
      "underline",
    );
  }
  if (styles.strike) {
    drawFragmentDecoration(
      writer,
      pageIndex,
      line,
      fragment,
      originX,
      originY,
      styles,
      "strike",
    );
  }
  if (styles.doubleStrike) {
    drawFragmentDecoration(
      writer,
      pageIndex,
      line,
      fragment,
      originX,
      originY,
      styles,
      "doubleStrike",
    );
  }
  if (styles.emphasisMark) {
    drawFragmentEmphasis(
      writer,
      pageIndex,
      line,
      fragment,
      originX,
      originY,
      styles,
    );
  }
}
