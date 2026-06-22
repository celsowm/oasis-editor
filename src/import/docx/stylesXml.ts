import { DOMParser } from "@xmldom/xmldom";
import type {
  EditorConditionalRowStyle,
  EditorNamedStyle,
  EditorTableConditionalFormat,
  EditorTableStyle,
} from "@/core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  isWordTrue,
  parseOnOffProperty,
} from "./xmlHelpers.js";
import { twipsToPoints } from "./units.js";
import { type DocxImportTheme } from "./theme.js";
import { parseRunStyle } from "./runStyle.js";
import {
  parseParagraphStyle,
  withDocxImplicitSingleLineHeight,
} from "./paragraphStyle.js";
import { mergeStyles, emptyOrUndefined, parseShdFill } from "./styleUtils.js";
import { parseDocxBoxBorders } from "./borders.js";

function parseConditionalRowStyle(
  trPr: ReturnType<typeof getFirstChildByTagNameNS>,
): EditorConditionalRowStyle | undefined {
  if (!trPr) return undefined;
  const style: EditorConditionalRowStyle = {};
  const trHeight = getFirstChildByTagNameNS(trPr, WORD_NS, "trHeight");
  if (trHeight) {
    const height = twipsToPoints(getAttributeValue(trHeight, "val"));
    if (height !== undefined) style.height = height;
    const hRule = getAttributeValue(trHeight, "hRule");
    if (hRule === "auto" || hRule === "exact" || hRule === "atLeast") {
      style.heightRule = hRule;
    }
  }
  const cantSplit = parseOnOffProperty(trPr, "cantSplit");
  if (cantSplit !== undefined) style.cantSplit = cantSplit;
  const hidden = parseOnOffProperty(trPr, "hidden");
  if (hidden !== undefined) style.hidden = hidden;
  return Object.keys(style).length > 0 ? style : undefined;
}

export function parseImportedStyles(
  stylesXml: string | null,
  theme: DocxImportTheme,
): Record<string, EditorNamedStyle> | undefined {
  if (!stylesXml) {
    return undefined;
  }

  const document = new DOMParser().parseFromString(
    stylesXml,
    "application/xml",
  );
  const root = document.documentElement;
  if (!root) {
    return undefined;
  }

  const docDefaults = getFirstChildByTagNameNS(root, WORD_NS, "docDefaults");
  const pPrDefault = getFirstChildByTagNameNS(
    getFirstChildByTagNameNS(docDefaults, WORD_NS, "pPrDefault"),
    WORD_NS,
    "pPr",
  );
  const rPrDefault = getFirstChildByTagNameNS(
    getFirstChildByTagNameNS(docDefaults, WORD_NS, "rPrDefault"),
    WORD_NS,
    "rPr",
  );
  // The docx's docDefaults establish the authoritative paragraph baseline.
  // OOXML's true default for before/after spacing is 0 (a Word doc that wants
  // 8pt sets it explicitly on a style). Pin them to 0 here so oasis's
  // blank-document default (DEFAULT_PARAGRAPH_STYLE.spacingAfter = 8px) does not
  // leak into every imported paragraph and inflate pagination.
  const defaultParagraphStyle = pPrDefault
    ? {
        spacingBefore: 0,
        spacingAfter: 0,
        ...withDocxImplicitSingleLineHeight(parseParagraphStyle(pPrDefault)),
      }
    : withDocxImplicitSingleLineHeight(parseParagraphStyle(pPrDefault));
  const defaultTextStyle = parseRunStyle(rPrDefault, theme);
  const styles: Record<string, EditorNamedStyle> = {};
  let defaultParagraphStyleId: string | undefined;

  for (const styleElement of getChildrenByTagNameNS(root, WORD_NS, "style")) {
    const id = getAttributeValue(styleElement, "styleId");
    const type = getAttributeValue(styleElement, "type");
    if (
      !id ||
      (type !== "paragraph" && type !== "character" && type !== "table")
    ) {
      continue;
    }

    const name =
      getAttributeValue(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "name"),
        "val",
      ) ?? id;
    const basedOn =
      getAttributeValue(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "basedOn"),
        "val",
      ) ?? undefined;
    const nextStyle =
      getAttributeValue(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "next"),
        "val",
      ) ?? undefined;
    const qFormat = parseOnOffProperty(styleElement, "qFormat");
    const semiHidden = parseOnOffProperty(styleElement, "semiHidden");
    const unhideWhenUsed = parseOnOffProperty(styleElement, "unhideWhenUsed");
    const rawUiPriority = getAttributeValue(
      getFirstChildByTagNameNS(styleElement, WORD_NS, "uiPriority"),
      "val",
    );
    const parsedUiPriority =
      rawUiPriority === null ? NaN : Number(rawUiPriority);
    const uiPriority =
      Number.isInteger(parsedUiPriority) && parsedUiPriority >= 0
        ? parsedUiPriority
        : undefined;
    const paragraphStyle = withDocxImplicitSingleLineHeight(
      parseParagraphStyle(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "pPr"),
      ),
    );
    const textStyle = parseRunStyle(
      getFirstChildByTagNameNS(styleElement, WORD_NS, "rPr"),
      theme,
    );

    let tableStyle: EditorTableStyle | undefined;
    if (type === "table") {
      const tblPr = getFirstChildByTagNameNS(styleElement, WORD_NS, "tblPr");
      const tblInd = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblInd");
      const indentLeft = twipsToPoints(getAttributeValue(tblInd, "w"));
      const parseBandSize = (localName: string): number | undefined => {
        const raw = getAttributeValue(
          getFirstChildByTagNameNS(tblPr, WORD_NS, localName),
          "val",
        );
        const parsed = raw ? Number(raw) : Number.NaN;
        return Number.isFinite(parsed) && parsed > 0
          ? Math.floor(parsed)
          : undefined;
      };
      const rowBandSize = parseBandSize("tblStyleRowBandSize");
      const colBandSize = parseBandSize("tblStyleColBandSize");
      const conditionalFormats: Record<string, EditorTableConditionalFormat> =
        {};
      for (const tblStylePr of getChildrenByTagNameNS(
        styleElement,
        WORD_NS,
        "tblStylePr",
      )) {
        const condType = getAttributeValue(tblStylePr, "type");
        if (!condType) continue;
        const tcPr = getFirstChildByTagNameNS(tblStylePr, WORD_NS, "tcPr");
        const shd = getFirstChildByTagNameNS(tcPr, WORD_NS, "shd");
        const fill = parseShdFill(shd);
        const condTextStyle = parseRunStyle(
          getFirstChildByTagNameNS(tblStylePr, WORD_NS, "rPr"),
          theme,
        );
        const condBorders = emptyOrUndefined(
          parseDocxBoxBorders(
            getFirstChildByTagNameNS(tcPr, WORD_NS, "tcBorders"),
          ),
        );
        const condParagraphStyle = parseParagraphStyle(
          getFirstChildByTagNameNS(tblStylePr, WORD_NS, "pPr"),
        );
        const condRowStyle = parseConditionalRowStyle(
          getFirstChildByTagNameNS(tblStylePr, WORD_NS, "trPr"),
        );
        if (
          fill ||
          condTextStyle ||
          condBorders ||
          condParagraphStyle ||
          condRowStyle
        ) {
          conditionalFormats[condType] = {
            ...(fill ? { shading: fill } : {}),
            ...(condTextStyle ? { textStyle: condTextStyle } : {}),
            ...(condBorders ? { borders: condBorders } : {}),
            ...(condParagraphStyle
              ? { paragraphStyle: condParagraphStyle }
              : {}),
            ...(condRowStyle ? { rowStyle: condRowStyle } : {}),
          };
        }
      }
      tableStyle = {
        styleId: id,
        indentLeft,
        ...(rowBandSize !== undefined ? { rowBandSize } : {}),
        ...(colBandSize !== undefined ? { colBandSize } : {}),
        ...(Object.keys(conditionalFormats).length > 0
          ? { conditionalFormats }
          : {}),
      };
    }

    const isDefaultParagraph =
      type === "paragraph" &&
      isWordTrue(getAttributeValue(styleElement, "default"));

    if (isDefaultParagraph) {
      defaultParagraphStyleId = id;
    }

    styles[id] = {
      id,
      name,
      type,
      basedOn,
      nextStyle,
      qFormat,
      uiPriority,
      semiHidden,
      unhideWhenUsed,
      paragraphStyle:
        type === "paragraph" && isDefaultParagraph
          ? mergeStyles(defaultParagraphStyle, paragraphStyle)
          : paragraphStyle,
      textStyle:
        type === "paragraph" && isDefaultParagraph
          ? mergeStyles(defaultTextStyle, textStyle)
          : textStyle,
      tableStyle,
    };
  }

  if (defaultParagraphStyleId && styles[defaultParagraphStyleId]) {
    return styles;
  }

  if (defaultParagraphStyle || defaultTextStyle) {
    styles.Normal = {
      id: "Normal",
      name: "Normal",
      type: "paragraph",
      paragraphStyle: defaultParagraphStyle,
      textStyle: defaultTextStyle,
    };
  }

  return emptyOrUndefined(styles);
}
