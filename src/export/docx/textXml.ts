import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextRun,
  EditorTextStyle,
} from "../../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import type { DocContext } from "./docxTypes.js";
import { escapeXml, OFFICE_REL_NS, toHalfPoints, toTwips } from "./xmlUtils.js";

const DOCX_HIGHLIGHT_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  blue: [0, 0, 255],
  cyan: [0, 255, 255],
  green: [0, 128, 0],
  magenta: [255, 0, 255],
  red: [255, 0, 0],
  yellow: [255, 255, 0],
  white: [255, 255, 255],
  darkBlue: [0, 0, 139],
  darkCyan: [0, 139, 139],
  darkGreen: [0, 100, 0],
  darkMagenta: [139, 0, 139],
  darkRed: [139, 0, 0],
  darkYellow: [184, 134, 11],
  darkGray: [169, 169, 169],
  lightGray: [211, 211, 211],
};
const DOCX_HIGHLIGHT_HEX_ALIASES: Record<string, string> = {
  ffff00: "yellow",
  fef08a: "yellow",
  ff0000: "red",
  "00ff00": "green",
  "0000ff": "blue",
  "00ffff": "cyan",
  ff00ff: "magenta",
  "000000": "black",
  ffffff: "white",
};

function parseHexColor(color: string): [number, number, number] | null {
  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function normalizeHighlightForDocx(highlight: string): string {
  if (highlight in DOCX_HIGHLIGHT_COLORS) {
    return highlight;
  }

  const normalizedHex = highlight.trim().replace(/^#/, "").toLowerCase();
  const directAlias = DOCX_HIGHLIGHT_HEX_ALIASES[normalizedHex];
  if (directAlias) {
    return directAlias;
  }

  const rgb = parseHexColor(highlight);
  if (!rgb) {
    return "yellow";
  }

  let bestName = "yellow";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [name, candidate] of Object.entries(DOCX_HIGHLIGHT_COLORS)) {
    const distance =
      (candidate[0] - rgb[0]) ** 2 +
      (candidate[1] - rgb[1]) ** 2 +
      (candidate[2] - rgb[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  }
  return bestName;
}

function needsPreserveSpace(text: string): boolean {
  return /^\s|\s$/.test(text) || text.includes("  ");
}

function serializeTextSegment(segment: string): string {
  if (segment.length === 0) {
    return "";
  }
  const preserve = needsPreserveSpace(segment) ? ' xml:space="preserve"' : "";
  return `<w:t${preserve}>${escapeXml(segment)}</w:t>`;
}

function serializeRunText(text: string): string {
  if (text.length === 0) {
    return "<w:t></w:t>";
  }

  let result = "";
  let buffer = "";
  for (const char of text) {
    if (char === "\n") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:br/>";
      continue;
    }
    if (char === "\t") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:tab/>";
      continue;
    }
    buffer += char;
  }

  result += serializeTextSegment(buffer);
  return result || "<w:t></w:t>";
}

function serializeRunProperties(styles?: EditorTextStyle): string {
  if (!styles) {
    return "";
  }

  const parts: string[] = [];
  if (styles.bold) parts.push("<w:b/>");
  if (styles.italic) parts.push("<w:i/>");
  if (styles.underline) parts.push('<w:u w:val="single"/>');
  if (styles.strike) parts.push("<w:strike/>");
  if (styles.superscript) {
    parts.push('<w:vertAlign w:val="superscript"/>');
  } else if (styles.subscript) {
    parts.push('<w:vertAlign w:val="subscript"/>');
  }
  if (styles.fontFamily) {
    parts.push(
      `<w:rFonts w:ascii="${escapeXml(styles.fontFamily)}" w:hAnsi="${escapeXml(styles.fontFamily)}" w:cs="${escapeXml(styles.fontFamily)}"/>`,
    );
  }
  if (styles.fontSize !== undefined && styles.fontSize !== null) {
    const size = toHalfPoints(styles.fontSize);
    if (size !== null) parts.push(`<w:sz w:val="${size}"/>`);
  }
  if (styles.color) {
    parts.push(
      `<w:color w:val="${escapeXml(styles.color.replace(/^#/, ""))}"/>`,
    );
  }
  if (styles.highlight) {
    parts.push(
      `<w:highlight w:val="${escapeXml(normalizeHighlightForDocx(styles.highlight))}"/>`,
    );
  }

  return parts.length > 0 ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}

function materializeParagraphStyle(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphStyle {
  const effective = resolveEffectiveParagraphStyle(paragraph.style, styles);
  return {
    align: effective.align,
    spacingBefore: effective.spacingBefore,
    spacingAfter: effective.spacingAfter,
    lineHeight: effective.lineHeight,
    indentLeft: effective.indentLeft,
    indentRight: effective.indentRight,
    indentFirstLine: effective.indentFirstLine,
    indentHanging: effective.indentHanging,
    pageBreakBefore: effective.pageBreakBefore,
    keepWithNext: effective.keepWithNext,
    keepLinesTogether: effective.keepLinesTogether,
    widowControl: effective.widowControl,
  };
}

function materializeRunStyle(
  run: EditorTextRun,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorTextStyle | undefined {
  const effective = resolveEffectiveTextStyleForParagraph(
    run.styles,
    paragraphStyleId,
    styles,
  );

  const materialized: EditorTextStyle = {
    bold: effective.bold,
    italic: effective.italic,
    underline: effective.underline,
    strike: effective.strike,
    superscript: effective.superscript,
    subscript: effective.subscript,
    fontFamily: effective.fontFamily,
    fontSize: effective.fontSize,
    color: effective.color,
    highlight: effective.highlight,
  };

  if (run.styles?.link) {
    materialized.link = run.styles.link;
  }

  return materialized;
}

function serializeRun(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const materializedRunStyle = materializeRunStyle(
    run,
    paragraphStyleId,
    styles,
  );
  if (run.field) {
    const instr = run.field.type === "PAGE" ? " PAGE " : " NUMPAGES ";
    return `<w:fldSimple w:instr="${instr}"><w:r>${serializeRunProperties(materializedRunStyle)}<w:t>1</w:t></w:r></w:fldSimple>`;
  }
  if (run.image) {
    const rId = context.imageMap.get(run.id);
    if (rId) {
      const img = context.images.find((i) => i.rId === rId);
      if (img) {
        const docPrId = Math.floor(Math.random() * 10000) + 1;
        const altAttr =
          img.alt !== undefined
            ? ` descr="${escapeXml(img.alt)}" title="${escapeXml(img.alt)}"`
            : "";
        const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${img.cx}" cy="${img.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="Picture"${altAttr}/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture"${altAttr}/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="${OFFICE_REL_NS}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
        return `<w:r>${serializeRunProperties(materializedRunStyle)}${drawing}</w:r>`;
      }
    }
  }
  return `<w:r>${serializeRunProperties(materializedRunStyle)}${serializeRunText(run.text)}</w:r>`;
}

function serializeRunWithRelationships(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const runXml = serializeRun(run, context, paragraphStyleId, styles);
  const href = run.styles?.link;
  if (!href) {
    return runXml;
  }

  const rId = context.hyperlinkMap.get(href);
  if (!rId) {
    return runXml;
  }

  return `<w:hyperlink r:id="${rId}">${runXml}</w:hyperlink>`;
}

function serializeParagraphProperties(
  paragraph: EditorParagraphNode,
  numberingInfo: Map<string, { numId: number; level: number }>,
  styles?: Record<string, EditorNamedStyle>,
  overrides?: { align?: EditorParagraphStyle["align"] },
): string {
  const parts: string[] = [];
  const style = materializeParagraphStyle(paragraph, styles);
  const align = paragraph.style?.align ?? overrides?.align ?? style.align;

  if (align) {
    parts.push(`<w:jc w:val="${align}"/>`);
  }

  if (
    style.spacingBefore !== undefined ||
    style.spacingAfter !== undefined ||
    style.lineHeight !== undefined
  ) {
    const attrs: string[] = [];
    const before = toTwips(style.spacingBefore);
    const after = toTwips(style.spacingAfter);
    const line =
      style.lineHeight !== undefined &&
      style.lineHeight !== null &&
      Number.isFinite(style.lineHeight)
        ? Math.round(style.lineHeight * 240)
        : null;
    if (before !== null) attrs.push(`w:before="${before}"`);
    if (after !== null) attrs.push(`w:after="${after}"`);
    if (line !== null) attrs.push(`w:line="${line}"`);
    if (attrs.length > 0) parts.push(`<w:spacing ${attrs.join(" ")}/>`);
  }

  if (
    style.indentLeft !== undefined ||
    style.indentRight !== undefined ||
    style.indentFirstLine !== undefined ||
    style.indentHanging !== undefined
  ) {
    const attrs: string[] = [];
    const left = toTwips(style.indentLeft);
    const right = toTwips(style.indentRight);
    const firstLine = toTwips(style.indentFirstLine);
    const hanging = toTwips(style.indentHanging);
    if (left !== null) attrs.push(`w:left="${left}"`);
    if (right !== null) attrs.push(`w:right="${right}"`);
    if (firstLine !== null) attrs.push(`w:firstLine="${firstLine}"`);
    if (hanging !== null) attrs.push(`w:hanging="${hanging}"`);
    if (attrs.length > 0) parts.push(`<w:ind ${attrs.join(" ")}/>`);
  }

  if (style.pageBreakBefore) parts.push("<w:pageBreakBefore/>");
  if (style.keepWithNext) parts.push("<w:keepNext/>");
  if (style.keepLinesTogether) parts.push("<w:keepLines/>");
  if (style.widowControl === false) parts.push('<w:widowControl w:val="0"/>');

  const numbering = numberingInfo.get(paragraph.id);
  if (numbering) {
    parts.push(
      `<w:numPr><w:ilvl w:val="${numbering.level}"/><w:numId w:val="${numbering.numId}"/></w:numPr>`,
    );
  }

  return parts.length > 0 ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
}

export function serializeParagraphXml(
  paragraph: EditorParagraphNode,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  overrides?: { align?: EditorParagraphStyle["align"] },
): string {
  const runs =
    paragraph.runs.length > 0 ? paragraph.runs : [{ id: "", text: "" }];
  return `<w:p>${serializeParagraphProperties(
    paragraph,
    context.numberingInfo,
    styles,
    overrides,
  )}${runs
    .map((run) =>
      serializeRunWithRelationships(
        run,
        context,
        paragraph.style?.styleId,
        styles,
      ),
    )
    .join("")}</w:p>`;
}
