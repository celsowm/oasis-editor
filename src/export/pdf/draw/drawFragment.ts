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
import {
  isDoubleUnderlineStyle,
  isWavyUnderlineStyle,
  underlineStyleDashArray,
  underlineStyleLineWidthPx,
} from "../../../core/textStyleMappings.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { paintTextBox } from "./drawTextBoxShape.js";
import { registerPdfImageRun } from "../images.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import {
  DEFAULT_FONT_SIZE_PX,
  pxToPt,
  textStyleToFontSizePt,
} from "../units.js";
import {
  resolveFragmentBounds,
  resolveFragmentSlots,
  type FragmentSlot,
} from "./fragmentGeometry.js";
import { PX_PER_POINT } from "../../../layoutProjection/constants.js";

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
  const bounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
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

// Run shading (w:shd): a solid background fill behind the run's text, drawn
// underneath the (semi-transparent) highlighter handled above.
export function drawFragmentShading(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  if (!styles.shading) {
    return;
  }
  const bounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
  if (!bounds) {
    return;
  }
  writer.drawRect(pageIndex, {
    x: pxToPt(originX + bounds.left),
    y: pxToPt(originY + line.top + 2),
    width: pxToPt(Math.max(0, bounds.right - bounds.left)),
    height: pxToPt(Math.max(2, line.height - 4)),
    fill: styles.shading,
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
  kind: "underline" | "strike" | "doubleStrike",
): void {
  const bounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
  if (!bounds) {
    return;
  }
  const y =
    kind === "underline"
      ? originY + line.top + line.height - 2
      : kind === "doubleStrike"
        ? originY + line.top + line.height * 0.5
        : originY + line.top + line.height * 0.52;
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
    const offset = 1.3;
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(y - offset),
      x2: pxToPt(x2),
      y2: pxToPt(y - offset),
      stroke,
      lineWidth: pxToPt(1),
    });
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(y + offset),
      x2: pxToPt(x2),
      y2: pxToPt(y + offset),
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

function drawUnderlineWithStyle(
  writer: OasisPdfWriter,
  pageIndex: number,
  x1: number,
  x2: number,
  y: number,
  stroke: string,
  underlineStyle: EditorTextStyle["underlineStyle"],
): void {
  const lineWidthPx = underlineStyleLineWidthPx(underlineStyle);

  const drawAt = (yy: number, dash?: number[]) => {
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(yy),
      x2: pxToPt(x2),
      y2: pxToPt(yy),
      stroke,
      lineWidth: pxToPt(lineWidthPx),
      dashArray: dash,
    });
  };

  if (isDoubleUnderlineStyle(underlineStyle)) {
    drawAt(y - 1.5);
    drawAt(y + 1.5);
    return;
  }

  if (isWavyUnderlineStyle(underlineStyle)) {
    drawWavyUnderline(writer, pageIndex, x1, x2, y, stroke, lineWidthPx);
    return;
  }

  drawAt(y, underlineStyleDashArray(underlineStyle));
}

function drawWavyUnderline(
  writer: OasisPdfWriter,
  pageIndex: number,
  x1: number,
  x2: number,
  y: number,
  stroke: string,
  lineWidthPx: number,
): void {
  const wavelength = 4;
  const amplitude = 1.5;
  let prevX = x1;
  let prevY = y;
  for (let x = x1; x <= x2; x += 1) {
    const dy = Math.sin(((x - x1) / wavelength) * Math.PI) * amplitude;
    const curY = y + dy;
    writer.drawLine(pageIndex, {
      x1: pxToPt(prevX),
      y1: pxToPt(prevY),
      x2: pxToPt(x),
      y2: pxToPt(curY),
      stroke,
      lineWidth: pxToPt(lineWidthPx),
    });
    prevX = x;
    prevY = curY;
  }
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

function groupSlotChunksByOffsetGaps(chars: FragmentSlot[]): FragmentSlot[][] {
  const chunks: FragmentSlot[][] = [];
  let currentChunk: FragmentSlot[] = [];
  for (const char of chars) {
    const previous = currentChunk[currentChunk.length - 1];
    if (previous && char.offset > previous.offset + 1) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
    currentChunk.push(char);
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

function resolveTabLeader(
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  tabLeft: number,
  document: EditorDocument,
): "dot" | "hyphen" | "underscore" | "heavy" | "middleDot" | undefined {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    document.styles,
  );
  const tabs = paragraphStyle.tabs ?? [];
  if (tabs.length === 0) {
    return undefined;
  }
  const lineStart = line.slots[0]?.left ?? 0;
  const relativeLeft = tabLeft - lineStart;
  const stop = tabs
    .filter((tab) => tab.type !== "clear")
    .map((tab) => ({ ...tab, positionPx: tab.position * PX_PER_POINT }))
    .filter((tab) => tab.positionPx > relativeLeft + 0.01)
    .sort((a, b) => a.positionPx - b.positionPx)[0];
  return stop?.leader && stop.leader !== "none" ? stop.leader : undefined;
}

function drawTabLeaders(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  document: EditorDocument,
  originX: number,
  baselineY: number,
  color: string,
): void {
  const slotByOffset = new Map(
    line.slots.map((slot) => [slot.offset, slot] as const),
  );
  for (const char of fragment.chars) {
    if (char.char !== "\t") {
      continue;
    }
    const slot = slotByOffset.get(char.paragraphOffset);
    const nextSlot = slotByOffset.get(char.paragraphOffset + 1);
    if (!slot || !nextSlot) {
      continue;
    }
    const leader = resolveTabLeader(paragraph, line, slot.left, document);
    if (!leader) {
      continue;
    }
    const y = leader === "underscore" ? baselineY + 2 : baselineY;
    writer.drawLine(pageIndex, {
      x1: pxToPt(originX + slot.left),
      y1: pxToPt(y),
      x2: pxToPt(originX + nextSlot.left),
      y2: pxToPt(y),
      stroke: color,
      lineWidth: pxToPt(leader === "heavy" ? 1.5 : 1),
      dashArray:
        leader === "dot" || leader === "middleDot"
          ? [1, 3]
          : leader === "hyphen"
            ? [5, 3]
            : undefined,
    });
  }
}

// Paints an inline (non-floating) shape / text box at its anchor slot. Floating
// boxes are positioned separately via drawFloatingTextBoxesForParagraph.
async function drawInlineTextBoxFragment(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
): Promise<void> {
  const textBox = fragment.textBox;
  if (!textBox || textBox.floating) {
    return;
  }
  const slot =
    line.slots.find((candidate) => candidate.offset === fragment.startOffset) ??
    line.slots.find((candidate) => candidate.offset >= fragment.startOffset);
  if (!slot) {
    return;
  }

  await paintTextBox(
    writer,
    textBox,
    { document, fontRegistry, pageIndex },
    originX + slot.left,
    originY + line.top + line.height - textBox.height,
    textBox.width,
    textBox.height,
  );
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
      line.slots.find(
        (candidate) => candidate.offset === fragment.startOffset,
      ) ??
      line.slots.find((candidate) => candidate.offset >= fragment.startOffset);
    if (!slot) {
      return;
    }
    const resourceName = await registerPdfImageRun(
      writer,
      document,
      fragment.image,
    );
    if (!resourceName) {
      return;
    }
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
    await drawInlineTextBoxFragment(
      writer,
      pageIndex,
      line,
      fragment,
      document,
      originX,
      originY,
      fontRegistry,
    );
    return;
  }

  const styles = resolveEffectiveTextStyleForParagraph(
    fragment.styles,
    paragraph.style?.styleId,
    document.styles,
  );
  if (styles.hidden) {
    return;
  }
  const fontFace = fontRegistry.resolveFontFace({
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  });
  const fontSizePt = styles.smallCaps
    ? textStyleToFontSizePt(styles) * 0.8
    : textStyleToFontSizePt(styles);
  const baselineShiftPx = (styles.baselineShift ?? 0) * PX_PER_POINT;
  const baselineY = originY + line.top + line.height * 0.8 - baselineShiftPx;
  const chars = resolveFragmentSlots(line, fragment);
  const text = chars
    .map((char) => (styles.allCaps ? char.char.toUpperCase() : char.char))
    .join("");
  const firstChar = chars[0];
  if (!firstChar || text.length === 0) {
    return;
  }

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

  // When the paragraph is justified, the layout shifts the `left` of each
  // character that follows a space so the line fills the available width.
  // Drawing the whole fragment as a single PDF text run would ignore those
  // per-word shifts (the PDF would use the font's natural space width), so we
  // emit one text command per whitespace-separated chunk in that case.
  const paragraphAlign =
    resolveEffectiveParagraphStyle(paragraph.style, document.styles).align ??
    "left";
  if (paragraphAlign === "justify") {
    const chunks = groupSlotChunksByWhitespace(chars);
    for (const chunk of chunks) {
      const chunkText = chunk
        .map((c) => (styles.allCaps ? c.char.toUpperCase() : c.char))
        .join("");
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
        characterSpacing: styles.characterSpacing ?? 0,
        horizontalScale: styles.characterScale ?? 100,
      });
    }
  } else {
    const chunks = groupSlotChunksByOffsetGaps(chars);
    for (const chunk of chunks) {
      const chunkText = chunk
        .map((c) => (styles.allCaps ? c.char.toUpperCase() : c.char))
        .join("");
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
        characterSpacing: styles.characterSpacing ?? 0,
        horizontalScale: styles.characterScale ?? 100,
      });
    }
  }
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
}
