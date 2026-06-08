import type {
  EditorBlockNode,
  EditorImageFloatingLayout,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTabStop,
  EditorTextBoxData,
  EditorTextRun,
  EditorTextStyle,
} from "../../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import type { DocContext } from "./docxTypes.js";
import {
  escapeXml,
  normalizeDocxColor,
  OFFICE_REL_NS,
  pointsToTwips,
  toHalfPoints,
  toTwips,
} from "./xmlUtils.js";
import { serializeParagraphBorders } from "./borders.js";
import { serializeTableXml } from "./tableXml.js";

const EMU_PER_PX = 9525;
const EMU_PER_PT = 12700;

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

function pointsToSignedTwips(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 20);
}

function ligaturesToDocx(value: EditorTextStyle["ligatures"]): string | null {
  switch (value) {
    case "none":
      return "none";
    case "standard":
      return "standard";
    case "contextual":
      return "contextual";
    case "historical":
      return "historical";
    case "standardContextual":
      return "standardContextual";
    default:
      return null;
  }
}

function numberSpacingToDocx(
  value: EditorTextStyle["numberSpacing"],
): string | null {
  switch (value) {
    case "proportional":
      return "proportional";
    case "tabular":
      return "tabular";
    default:
      return null;
  }
}

function numberFormToDocx(value: EditorTextStyle["numberForm"]): string | null {
  switch (value) {
    case "lining":
      return "lining";
    case "oldStyle":
      return "oldStyle";
    default:
      return null;
  }
}

function stylisticSetToDocx(
  value: EditorTextStyle["stylisticSet"],
): string | null {
  if (typeof value !== "number" || value < 1 || value > 20) {
    return null;
  }
  return (1 << (value - 1)).toString(16).toUpperCase().padStart(8, "0");
}

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
    if (char === "\u2011") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:noBreakHyphen/>";
      continue;
    }
    if (char === "\u00AD") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:softHyphen/>";
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
  // Emit the complex-script twins alongside the Latin flags so bold/italic
  // applies to every script (RTL, CJK) and round-trips through Word.
  if (styles.bold) parts.push("<w:b/>", "<w:bCs/>");
  if (styles.italic) parts.push("<w:i/>", "<w:iCs/>");
  if (styles.underline) {
    const underlineVal = styles.underlineStyle ?? "single";
    const underlineColor = styles.underlineColor
      ? ` w:color="${escapeXml(styles.underlineColor.replace(/^#/, ""))}"`
      : "";
    parts.push(`<w:u w:val="${escapeXml(underlineVal)}"${underlineColor}/>`);
  }
  if (styles.strike) parts.push("<w:strike/>");
  if (styles.doubleStrike) parts.push("<w:dstrike/>");
  if (styles.smallCaps) parts.push("<w:smallCaps/>");
  if (styles.allCaps) parts.push("<w:caps/>");
  if (styles.hidden) parts.push("<w:vanish/>");
  if (styles.noProof) parts.push("<w:noProof/>");
  if (styles.webHidden) parts.push("<w:webHidden/>");
  if (styles.specVanish) parts.push("<w:specVanish/>");
  if (styles.textEffect) {
    parts.push(`<w:effect w:val="${escapeXml(styles.textEffect)}"/>`);
  }
  if (
    styles.characterScale !== undefined &&
    styles.characterScale !== null &&
    Number.isFinite(styles.characterScale)
  ) {
    parts.push(
      `<w:w w:val="${Math.max(1, Math.round(styles.characterScale))}"/>`,
    );
  }
  if (
    styles.characterSpacing !== undefined &&
    styles.characterSpacing !== null
  ) {
    const spacing = pointsToSignedTwips(styles.characterSpacing);
    if (spacing !== null) parts.push(`<w:spacing w:val="${spacing}"/>`);
  }
  if (
    styles.baselineShift !== undefined &&
    styles.baselineShift !== null &&
    Number.isFinite(styles.baselineShift)
  ) {
    parts.push(`<w:position w:val="${Math.round(styles.baselineShift * 2)}"/>`);
  }
  if (
    styles.kerningThreshold !== undefined &&
    styles.kerningThreshold !== null &&
    Number.isFinite(styles.kerningThreshold)
  ) {
    parts.push(
      `<w:kern w:val="${Math.max(0, Math.round(styles.kerningThreshold * 2))}"/>`,
    );
  }
  const ligatures = ligaturesToDocx(styles.ligatures);
  if (ligatures) {
    parts.push(`<w14:ligatures w14:val="${ligatures}"/>`);
  }
  const numberSpacing = numberSpacingToDocx(styles.numberSpacing);
  if (numberSpacing) {
    parts.push(`<w14:numSpacing w14:val="${numberSpacing}"/>`);
  }
  const numberForm = numberFormToDocx(styles.numberForm);
  if (numberForm) {
    parts.push(`<w14:numForm w14:val="${numberForm}"/>`);
  }
  const stylisticSet = stylisticSetToDocx(styles.stylisticSet);
  if (stylisticSet) {
    parts.push(`<w14:stylisticSets w14:val="${stylisticSet}"/>`);
  }
  if (styles.contextualAlternates) {
    parts.push('<w14:cntxtAlts w14:val="1"/>');
  }
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
    if (size !== null) {
      parts.push(`<w:sz w:val="${size}"/>`, `<w:szCs w:val="${size}"/>`);
    }
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
  if (styles.shading) {
    parts.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeDocxColor(styles.shading, "FFFFFF")}"/>`,
    );
  }
  if (styles.language) {
    const attrs: string[] = [];
    if (styles.language.value) {
      attrs.push(`w:val="${escapeXml(styles.language.value)}"`);
    }
    if (styles.language.eastAsia) {
      attrs.push(`w:eastAsia="${escapeXml(styles.language.eastAsia)}"`);
    }
    if (styles.language.bidi) {
      attrs.push(`w:bidi="${escapeXml(styles.language.bidi)}"`);
    }
    if (attrs.length > 0) {
      parts.push(`<w:lang ${attrs.join(" ")}/>`);
    }
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
    contextualSpacing: effective.contextualSpacing,
    lineHeight: effective.lineHeight,
    indentLeft: effective.indentLeft,
    indentRight: effective.indentRight,
    indentFirstLine: effective.indentFirstLine,
    indentHanging: effective.indentHanging,
    pageBreakBefore: effective.pageBreakBefore,
    keepWithNext: effective.keepWithNext,
    keepLinesTogether: effective.keepLinesTogether,
    widowControl: effective.widowControl,
    shading: effective.shading,
    borderTop: effective.borderTop,
    borderRight: effective.borderRight,
    borderBottom: effective.borderBottom,
    borderLeft: effective.borderLeft,
    tabs: effective.tabs,
  };
}

function serializeParagraphTabs(
  tabs: EditorTabStop[] | null | undefined,
): string {
  if (!tabs || tabs.length === 0) {
    return "";
  }

  const parts = tabs
    .map((tab) => {
      const position = pointsToTwips(tab.position);
      if (position === null) {
        return "";
      }
      const attrs = [`w:val="${escapeXml(tab.type)}"`, `w:pos="${position}"`];
      if (tab.leader && tab.leader !== "none") {
        attrs.push(`w:leader="${escapeXml(tab.leader)}"`);
      } else if (tab.leader === "none") {
        attrs.push('w:leader="none"');
      }
      return `<w:tab ${attrs.join(" ")}/>`;
    })
    .filter(Boolean);

  return parts.length > 0 ? `<w:tabs>${parts.join("")}</w:tabs>` : "";
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
    underlineStyle: effective.underlineStyle,
    underlineColor: effective.underlineColor,
    strike: effective.strike,
    doubleStrike: effective.doubleStrike,
    superscript: effective.superscript,
    subscript: effective.subscript,
    smallCaps: effective.smallCaps,
    allCaps: effective.allCaps,
    hidden: effective.hidden,
    noProof: effective.noProof,
    webHidden: effective.webHidden,
    specVanish: effective.specVanish,
    textEffect: effective.textEffect,
    characterScale: effective.characterScale,
    characterSpacing: effective.characterSpacing,
    baselineShift: effective.baselineShift,
    kerningThreshold: effective.kerningThreshold,
    ligatures: effective.ligatures,
    numberSpacing: effective.numberSpacing,
    numberForm: effective.numberForm,
    stylisticSet: effective.stylisticSet,
    contextualAlternates: effective.contextualAlternates,
    fontFamily: effective.fontFamily,
    fontSize: effective.fontSize,
    color: effective.color,
    highlight: effective.highlight,
    shading: effective.shading,
    language: effective.language,
  };

  if (run.styles?.link) {
    materialized.link = run.styles.link;
  }

  return materialized;
}

const OOXML_PERCENT_DENOMINATOR = 100000;
const OOXML_ROTATION_UNITS = 60000;

/** Build the attribute string for `a:xfrm` (rotation/flip), empty if none. */
function buildXfrmAttrs(img: DocContext["images"][number]): string {
  let attrs = "";
  if (img.rotation) {
    const rot = Math.round(img.rotation * OOXML_ROTATION_UNITS);
    if (rot !== 0) {
      attrs += ` rot="${rot}"`;
    }
  }
  if (img.flipH) {
    attrs += ` flipH="1"`;
  }
  if (img.flipV) {
    attrs += ` flipV="1"`;
  }
  return attrs;
}

/** Build an `a:srcRect` element from crop fractions, empty string if none. */
function buildSrcRect(crop: DocContext["images"][number]["crop"]): string {
  if (!crop) {
    return "";
  }
  const toUnits = (value: number | undefined): number =>
    value ? Math.round(value * OOXML_PERCENT_DENOMINATOR) : 0;
  const l = toUnits(crop.left);
  const t = toUnits(crop.top);
  const r = toUnits(crop.right);
  const b = toUnits(crop.bottom);
  if (l === 0 && t === 0 && r === 0 && b === 0) {
    return "";
  }
  return `<a:srcRect l="${l}" t="${t}" r="${r}" b="${b}"/>`;
}

function buildAnchorBool(
  value: boolean | undefined,
  fallback: boolean,
): string {
  return (value ?? fallback) ? "1" : "0";
}

function buildAnchorPositionXml(
  tagName: "positionH" | "positionV",
  position: EditorImageFloatingLayout["positionH"],
  fallbackRelativeFrom: string,
): string {
  const relativeFrom = escapeXml(
    position?.relativeFrom ?? fallbackRelativeFrom,
  );
  if (position?.align) {
    return `<wp:${tagName} relativeFrom="${relativeFrom}"><wp:align>${escapeXml(position.align)}</wp:align></wp:${tagName}>`;
  }
  const offset = position?.offset ?? 0;
  return `<wp:${tagName} relativeFrom="${relativeFrom}"><wp:posOffset>${offset}</wp:posOffset></wp:${tagName}>`;
}

function buildAnchorWrapXml(wrap: EditorImageFloatingLayout["wrap"]): string {
  switch (wrap) {
    case "square":
      return '<wp:wrapSquare wrapText="bothSides"/>';
    case "tight":
      return '<wp:wrapTight wrapText="bothSides"/>';
    case "through":
      return '<wp:wrapThrough wrapText="bothSides"/>';
    case "topAndBottom":
      return "<wp:wrapTopAndBottom/>";
    case "none":
    default:
      return "<wp:wrapNone/>";
  }
}

/**
 * Build a `w:drawing` wrapper (inline or anchored) around an arbitrary
 * DrawingML graphic (`graphicXml`). Shared by images (`pic:pic`) and text boxes
 * (`wps:wsp`).
 */
function buildDrawingContainerXml(options: {
  cx: number;
  cy: number;
  floating: EditorImageFloatingLayout | undefined;
  docPrId: number;
  docPrName: string;
  altAttr: string;
  graphicXml: string;
}): string {
  const { cx, cy, floating, docPrId, docPrName, altAttr, graphicXml } = options;
  const name = escapeXml(docPrName);
  if (!floating) {
    return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${name}"${altAttr}/>${graphicXml}</wp:inline></w:drawing>`;
  }

  const distT = floating.distT ?? 0;
  const distB = floating.distB ?? 0;
  const distL = floating.distL ?? 0;
  const distR = floating.distR ?? 0;
  const positionH = buildAnchorPositionXml(
    "positionH",
    floating.positionH,
    "column",
  );
  const positionV = buildAnchorPositionXml(
    "positionV",
    floating.positionV,
    "paragraph",
  );
  const wrap = buildAnchorWrapXml(floating.wrap);
  return `<w:drawing><wp:anchor distT="${distT}" distB="${distB}" distL="${distL}" distR="${distR}" simplePos="${buildAnchorBool(floating.simplePos, false)}" relativeHeight="${floating.relativeHeight ?? 0}" behindDoc="${buildAnchorBool(floating.behindDoc, false)}" locked="${buildAnchorBool(floating.locked, false)}" layoutInCell="${buildAnchorBool(floating.layoutInCell, true)}" allowOverlap="${buildAnchorBool(floating.allowOverlap, true)}"><wp:simplePos x="0" y="0"/>${positionH}${positionV}<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${docPrId}" name="${name}"${altAttr}/>${graphicXml}</wp:anchor></w:drawing>`;
}

function buildDrawingXml(
  img: DocContext["images"][number],
  docPrId: number,
  altAttr: string,
  picXml: string,
): string {
  return buildDrawingContainerXml({
    cx: img.cx,
    cy: img.cy,
    floating: img.floating,
    docPrId,
    docPrName: "Picture",
    altAttr,
    graphicXml: picXml,
  });
}

/** Serialize a list of block nodes (paragraphs/tables), e.g. a text box body. */
export function serializeBlocksXml(
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  return blocks
    .map((block) => {
      if (block.type === "table") {
        const pageBreakXml = block.style?.pageBreakBefore
          ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
          : "";
        return (
          pageBreakXml +
          serializeTableXml(block, (paragraph, cell) =>
            serializeParagraphXml(paragraph, context, styles, {
              align: cell.style?.horizontalAlign,
            }),
          )
        );
      }
      return serializeParagraphXml(block, context, styles);
    })
    .join("");
}

/** Build the `wps:wsp` graphic XML (geometry, fill, outline, body) for a text box. */
function buildTextBoxGraphicXml(
  textBox: EditorTextBoxData,
  cx: number,
  cy: number,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const shape = textBox.shape;
  const preset = escapeXml(shape?.preset ?? "rect");

  const fillXml = shape?.fill
    ? `<a:solidFill><a:srgbClr val="${escapeXml(shape.fill.replace(/^#/, ""))}"/></a:solidFill>`
    : "";
  let lnXml = "";
  if (shape?.borderColor || shape?.borderWidthPt !== undefined) {
    const widthAttr =
      shape?.borderWidthPt !== undefined
        ? ` w="${Math.round(shape.borderWidthPt * EMU_PER_PT)}"`
        : "";
    const colorXml = shape?.borderColor
      ? `<a:solidFill><a:srgbClr val="${escapeXml(shape.borderColor.replace(/^#/, ""))}"/></a:solidFill>`
      : "";
    lnXml = `<a:ln${widthAttr}>${colorXml}<a:miter lim="800000"/></a:ln>`;
  }

  const body = textBox.body;
  const bodyAttrs: string[] = ['rot="0"', 'vert="horz"'];
  bodyAttrs.push(`wrap="${escapeXml(body?.wrap ?? "square")}"`);
  if (body?.paddingLeft !== undefined) {
    bodyAttrs.push(`lIns="${Math.round(body.paddingLeft * EMU_PER_PX)}"`);
  }
  if (body?.paddingTop !== undefined) {
    bodyAttrs.push(`tIns="${Math.round(body.paddingTop * EMU_PER_PX)}"`);
  }
  if (body?.paddingRight !== undefined) {
    bodyAttrs.push(`rIns="${Math.round(body.paddingRight * EMU_PER_PX)}"`);
  }
  if (body?.paddingBottom !== undefined) {
    bodyAttrs.push(`bIns="${Math.round(body.paddingBottom * EMU_PER_PX)}"`);
  }
  bodyAttrs.push(`anchor="${escapeXml(body?.anchor ?? "t")}"`);
  bodyAttrs.push('anchorCtr="0"');
  const autoFitXml = body?.autoFit ? "<a:spAutoFit/>" : "";

  const innerXml = serializeBlocksXml(textBox.blocks, context, styles);

  return (
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
    "<wps:wsp>" +
    '<wps:cNvSpPr txBox="1"><a:spLocks noChangeArrowheads="1"/></wps:cNvSpPr>' +
    '<wps:spPr bwMode="auto">' +
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>` +
    fillXml +
    lnXml +
    "</wps:spPr>" +
    `<wps:txbx><w:txbxContent>${innerXml}</w:txbxContent></wps:txbx>` +
    `<wps:bodyPr ${bodyAttrs.join(" ")}>${autoFitXml}</wps:bodyPr>` +
    "</wps:wsp>" +
    "</a:graphicData>" +
    "</a:graphic>"
  );
}

/** Serialize a text-box run (`run.textBox`) to a `w:drawing` inside `w:r`. */
function serializeTextBoxRun(
  run: EditorTextRun,
  textBox: EditorTextBoxData,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  rPrXml: string,
): string {
  const cx = Math.round(textBox.width * EMU_PER_PX);
  const cy = Math.round(textBox.height * EMU_PER_PX);
  const docPrId = context.textBoxDocPrIds.get(run.id) ?? 1;
  const docPrName = textBox.name ?? "Text Box";
  const altAttr =
    textBox.alt !== undefined
      ? ` descr="${escapeXml(textBox.alt)}" title="${escapeXml(textBox.alt)}"`
      : "";
  const graphicXml = buildTextBoxGraphicXml(textBox, cx, cy, context, styles);
  const drawing = buildDrawingContainerXml({
    cx,
    cy,
    floating: textBox.floating,
    docPrId,
    docPrName,
    altAttr,
    graphicXml,
  });
  return `<w:r>${rPrXml}${drawing}</w:r>`;
}

function serializeRun(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  // Synthetic `<w:footnoteRef/>` marker injected by the footnotes-part
  // serializer to render the visible number inside a footnote body.
  if ((run as { __isFootnoteRefMarker?: boolean }).__isFootnoteRefMarker) {
    return `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r>`;
  }

  const materializedRunStyle = materializeRunStyle(
    run,
    paragraphStyleId,
    styles,
  );
  if (run.footnoteReference) {
    // Emit `<w:footnoteReference>` in the main document. The marker text
    // (run.text, e.g. "1") is auto-rendered by Word from the footnotes part.
    const docxId = context.footnoteIdMap?.get(run.footnoteReference.footnoteId);
    if (docxId !== undefined) {
      // Force superscript styling and the FootnoteReference rStyle so the
      // marker is visually consistent even when the named style isn't shipped.
      const referenceStyle: EditorTextStyle = {
        ...(materializedRunStyle ?? {}),
        styleId: "FootnoteReference",
        superscript: true,
      };
      const customMarkAttr = run.footnoteReference.customMark
        ? ' w:customMarkFollows="1"'
        : "";
      const customMarkText = run.footnoteReference.customMark
        ? `<w:t xml:space="preserve">${escapeXml(run.footnoteReference.customMark)}</w:t>`
        : "";
      return `<w:r>${serializeRunProperties(referenceStyle)}<w:footnoteReference${customMarkAttr} w:id="${docxId}"/>${customMarkText}</w:r>`;
    }
    // Unknown footnote id: fall back to plain text so we don't drop content.
  }
  if (run.field) {
    const instr = run.field.type === "PAGE" ? " PAGE " : " NUMPAGES ";
    return `<w:fldSimple w:instr="${instr}"><w:r>${serializeRunProperties(materializedRunStyle)}<w:t>1</w:t></w:r></w:fldSimple>`;
  }
  if (run.textBox) {
    return serializeTextBoxRun(
      run,
      run.textBox,
      context,
      styles,
      serializeRunProperties(materializedRunStyle),
    );
  }
  if (run.image) {
    const rId = context.imageMap.get(run.id);
    if (rId) {
      const img = context.images.find((i) => i.rId === rId);
      if (img) {
        // Deterministic id derived from the image's relationship id
        // (`rIdImg<N>`) so exports are stable and diff-friendly.
        const docPrId = (parseInt(rId.replace(/\D+/g, ""), 10) || 0) + 1;
        const altAttr =
          img.alt !== undefined
            ? ` descr="${escapeXml(img.alt)}" title="${escapeXml(img.alt)}"`
            : "";
        const xfrmAttrs = buildXfrmAttrs(img);
        const srcRect = buildSrcRect(img.crop);
        const fill =
          img.fillMode === "tile"
            ? "<a:tile/>"
            : "<a:stretch><a:fillRect/></a:stretch>";
        const blipRelAttr =
          img.kind === "linked" ? `r:link="${rId}"` : `r:embed="${rId}"`;
        const picXml = `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture"${altAttr}/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip ${blipRelAttr} xmlns:r="${OFFICE_REL_NS}"/>${srcRect}${fill}</pic:blipFill><pic:spPr><a:xfrm${xfrmAttrs}><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
        const drawing = buildDrawingXml(img, docPrId, altAttr, picXml);
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

  if (href.startsWith("#")) {
    return `<w:hyperlink w:anchor="${escapeXml(href.slice(1))}">${runXml}</w:hyperlink>`;
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

  const tabs = serializeParagraphTabs(style.tabs);
  if (tabs) {
    parts.push(tabs);
  }

  if (style.pageBreakBefore) parts.push("<w:pageBreakBefore/>");
  if (style.keepWithNext) parts.push("<w:keepNext/>");
  if (style.keepLinesTogether) parts.push("<w:keepLines/>");
  if (style.widowControl === false) parts.push('<w:widowControl w:val="0"/>');
  if (style.contextualSpacing) parts.push("<w:contextualSpacing/>");

  const paragraphBorders = serializeParagraphBorders(style);
  if (paragraphBorders) {
    parts.push(paragraphBorders);
  }
  if (style.shading) {
    parts.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeDocxColor(style.shading, "FFFFFF")}"/>`,
    );
  }

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
