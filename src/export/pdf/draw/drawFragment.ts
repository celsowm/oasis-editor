import type {
  EditorDocument,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorParagraphNode,
  EditorTextStyle,
  EditorPageSettings,
} from "@/core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import {
  isDoubleUnderlineStyle,
  isWavyUnderlineStyle,
  resolveOpenTypeFeatureTags,
  underlineStyleDashArray,
  underlineStyleLineWidthPx,
} from "@/core/textStyleMappings.js";
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
  type FragmentSlot,
} from "./fragmentGeometry.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import {
  getImageFloatingGeometry,
  resolveFloatingObjectRect,
} from "@/layoutProjection/floatingObjects.js";

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
    const slots = new Map(line.slots.map((slot) => [slot.offset, slot]));
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

// Blends a hex color (#RRGGBB) toward white by (1 - alpha) to simulate
// reduced-opacity text on a white background in PDF (which has no text alpha).
function blendColorWithWhite(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const r = Math.round(255 + (Number.parseInt(hex.slice(1, 3), 16) - 255) * a);
  const g = Math.round(255 + (Number.parseInt(hex.slice(3, 5), 16) - 255) * a);
  const b = Math.round(255 + (Number.parseInt(hex.slice(5, 7), 16) - 255) * a);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

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

// Run border (w:bdr): a rectangle stroked around the run's text.
export function drawFragmentBorder(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  const border = styles.textBorder;
  if (!border || border.type === "none" || border.width <= 0) {
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
    y: pxToPt(originY + line.top + 1),
    width: pxToPt(Math.max(0, bounds.right - bounds.left)),
    height: pxToPt(Math.max(2, line.height - 2)),
    stroke: border.color,
    lineWidth: pxToPt(Math.max(0.5, border.width * PX_PER_POINT)),
  });
}

const PDF_EMPHASIS_GLYPH: Record<string, string> = {
  dot: "•",
  comma: "‚",
  circle: "○",
  underDot: "•",
};

// Run emphasis mark (w:em): a small glyph centered above each glyph (below for
// underDot).
export function drawFragmentEmphasis(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  const mark = styles.emphasisMark;
  if (!mark || mark === "none") {
    return;
  }
  const glyph = PDF_EMPHASIS_GLYPH[mark];
  if (!glyph) {
    return;
  }
  const slots = resolveFragmentSlots(line, fragment);
  const below = mark === "underDot";
  const size = Math.max(4, line.height * 0.35);
  const y = below
    ? originY + line.top + line.height + size
    : originY + line.top + size;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]!;
    if (slot.char === " " || slot.char === "\t" || slot.char === "\n") {
      continue;
    }
    const next = slots[i + 1];
    const centerX = next
      ? (slot.left + next.left) / 2
      : slot.left + line.height * 0.25;
    writer.drawText(pageIndex, {
      x: pxToPt(originX + centerX - size * 0.25),
      y: pxToPt(y),
      text: glyph,
      fontSize: pxToPt(size),
      color: styles.color ?? "#000000",
    });
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
  drawers: BlockDrawers,
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
    drawers,
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
  drawers: BlockDrawers,
): Promise<void> {
  if (fragment.image) {
    if (fragment.image.floating) {
      return;
    }
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
      drawers,
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

  // When the paragraph is justified, the layout shifts the `left` of each
  // character that follows a space so the line fills the available width.
  // Drawing the whole fragment as a single PDF text run would ignore those
  // per-word shifts (the PDF would use the font's natural space width), so we
  // emit one text command per whitespace-separated chunk in that case.
  const paragraphAlign =
    resolveEffectiveParagraphStyle(paragraph.style, document.styles).align ??
    "left";
  // OpenType GSUB features this run enables (ligatures, figure style, stylistic
  // sets, contextual alternates); the embedded-font shaper applies them per chunk.
  const fontFeatures = resolveOpenTypeFeatureTags(styles);
  const baseTextOptions = {
    fontSize: fontSizePt,
    bold: styles.bold,
    italic: styles.italic,
    fontResourceName: fontFace.writerResourceName,
    characterSpacing: styles.characterSpacing ?? 0,
    horizontalScale: styles.characterScale ?? 100,
    fontFeatures,
  };
  // textFill supersedes color; gradients flatten to first stop (PDF shading deferred).
  const mainColor =
    styles.textFill?.type === "solid"
      ? styles.textFill.color
      : styles.textFill?.type === "gradient" && styles.textFill.stops[0]
        ? styles.textFill.stops[0].color
        : (styles.color ?? "#000000");
  const offsetPt = pxToPt(1);
  // Draws one text chunk applying the glyph-level run effects: emboss/imprint
  // lay a light relief copy offset behind, shadow lays a gray copy offset, and
  // outline strokes hollow glyphs via the writer's text render mode.
  // textOutline (w14) supersedes the legacy boolean outline with real stroke params.
  const emitChunk = (leftPx: number, text: string): void => {
    if (styles.emboss || styles.imprint) {
      const dir = styles.imprint ? 1 : -1;
      writer.drawText(pageIndex, {
        ...baseTextOptions,
        x: pxToPt(leftPx) + offsetPt * dir,
        y: pxToPt(baselineY) + offsetPt * dir,
        text,
        color: "#BFBFBF",
      });
    }
    if (styles.glow) {
      // PDF has no blur; approximate with 8 offset copies at half-radius in cardinal
      // and diagonal directions. Alpha is baked by blending toward white (#FFFFFF).
      const gl = styles.glow;
      const r = pxToPt(gl.radiusPt * PX_PER_POINT) * 0.5;
      const glowColor = blendColorWithWhite(gl.color, (gl.alpha ?? 0.5) * 0.4);
      const dirs: [number, number][] = [
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
        [r * 0.7, r * 0.7],
        [-r * 0.7, r * 0.7],
        [r * 0.7, -r * 0.7],
        [-r * 0.7, -r * 0.7],
      ];
      for (const [dx, dy] of dirs) {
        writer.drawText(pageIndex, {
          ...baseTextOptions,
          x: pxToPt(leftPx) + dx,
          y: pxToPt(baselineY) + dy,
          text,
          color: glowColor,
        });
      }
    }
    if (styles.textShadow) {
      const ts = styles.textShadow;
      const dirRad = (ts.dirDeg * Math.PI) / 180;
      const shadowOffsetPt = pxToPt(ts.distPt * PX_PER_POINT);
      writer.drawText(pageIndex, {
        ...baseTextOptions,
        x: pxToPt(leftPx) + Math.cos(dirRad) * shadowOffsetPt,
        y: pxToPt(baselineY) + Math.sin(dirRad) * shadowOffsetPt,
        text,
        color: ts.color,
      });
    } else if (styles.shadow) {
      writer.drawText(pageIndex, {
        ...baseTextOptions,
        x: pxToPt(leftPx) + offsetPt,
        y: pxToPt(baselineY) + offsetPt,
        text,
        color: "#808080",
      });
    }
    if (styles.reflection) {
      // PDF has no vertical-flip for text; approximate as a downward-shifted copy
      // blended toward white to simulate the average of startAlpha and endAlpha.
      const ref = styles.reflection;
      const avgAlpha = (ref.startAlpha + ref.endAlpha) / 2;
      const refColor = blendColorWithWhite(mainColor, avgAlpha * 0.6);
      writer.drawText(pageIndex, {
        ...baseTextOptions,
        x: pxToPt(leftPx),
        y: pxToPt(baselineY) + pxToPt(ref.distPt * PX_PER_POINT) + fontSizePt,
        text,
        color: refColor,
      });
    }
    const textOutline = styles.textOutline;
    writer.drawText(pageIndex, {
      ...baseTextOptions,
      x: pxToPt(leftPx),
      y: pxToPt(baselineY),
      text,
      color: mainColor,
      ...(textOutline
        ? {
            renderMode: 2,
            strokeColor: textOutline.color ?? mainColor,
            strokeWidth: textOutline.widthPt,
          }
        : { renderMode: styles.outline ? 1 : 0 }),
    });
  };
  const chunks =
    paragraphAlign === "justify"
      ? groupSlotChunksByWhitespace(chars)
      : groupSlotChunksByOffsetGaps(chars);
  for (const chunk of chunks) {
    const chunkText = chunk
      .map((c) => (styles.allCaps ? c.char.toUpperCase() : c.char))
      .join("");
    if (chunkText.length === 0) continue;
    emitChunk(originX + chunk[0]!.left, chunkText);
  }
  // Automatic hyphenation: the last fragment of a hyphenated line draws a
  // render-only trailing hyphen past the last character, in this fragment's
  // style (mirrors the canvas renderer).
  if (line.trailingHyphen && fragment.endOffset >= line.endOffset) {
    const endSlot =
      line.slots.find((slot) => slot.offset === line.endOffset) ??
      line.slots[line.slots.length - 1];
    if (endSlot) {
      emitChunk(originX + endSlot.left, "-");
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
