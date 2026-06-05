import { DOMParser } from "@xmldom/xmldom";
import type { EditorNamedStyle, EditorTableStyle } from "../../core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  isWordTrue,
} from "./xmlHelpers.js";
import { twipsToPoints } from "./units.js";
import { type DocxImportTheme } from "./theme.js";
import { parseRunStyle, mergeImportedTextStyles } from "./runStyle.js";
import {
  parseParagraphStyle,
  withDocxImplicitSingleLineHeight,
  mergeImportedParagraphStyles,
} from "./paragraphStyle.js";

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
  const defaultParagraphStyle = withDocxImplicitSingleLineHeight(
    parseParagraphStyle(pPrDefault),
  );
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
      tableStyle = {
        styleId: id,
        indentLeft,
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
      paragraphStyle:
        type === "paragraph" && isDefaultParagraph
          ? mergeImportedParagraphStyles(defaultParagraphStyle, paragraphStyle)
          : paragraphStyle,
      textStyle:
        type === "paragraph" && isDefaultParagraph
          ? mergeImportedTextStyles(defaultTextStyle, textStyle)
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

  return Object.keys(styles).length > 0 ? styles : undefined;
}
