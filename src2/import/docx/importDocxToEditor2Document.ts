import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { Editor2BlockNode, Editor2Document, Editor2ParagraphListStyle, Editor2ParagraphStyle, Editor2TableNode, Editor2TextStyle } from "../../core/model.js";
import { createEditor2Document, createEditor2ParagraphFromRuns, createEditor2Table, createEditor2TableCell, createEditor2TableRow } from "../../core/editorState.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

interface NumberingMaps {
  abstractKinds: Map<string, Editor2ParagraphListStyle["kind"]>;
  numKinds: Map<string, Editor2ParagraphListStyle["kind"]>;
}

function getChildrenByTagNameNS(element: XmlElement, namespace: string, localName: string): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === namespace &&
      (node as XmlElement).localName === localName
    ) {
      result.push(node as XmlElement);
    }
  }
  return result;
}

function getFirstChildByTagNameNS(
  element: XmlElement,
  namespace: string,
  localName: string,
): XmlElement | null {
  return getChildrenByTagNameNS(element, namespace, localName)[0] ?? null;
}

function getAttributeValue(element: XmlElement | null, localName: string): string | null {
  if (!element) {
    return null;
  }
  return element.getAttributeNS(WORD_NS, localName) ?? element.getAttribute(`w:${localName}`) ?? element.getAttribute(localName);
}

function parseBooleanProperty(parent: XmlElement, localName: string): boolean {
  return getFirstChildByTagNameNS(parent, WORD_NS, localName) !== null;
}

function parseRunStyle(runProperties: XmlElement | null): Editor2TextStyle | undefined {
  if (!runProperties) {
    return undefined;
  }

  const styles: Editor2TextStyle = {};
  if (parseBooleanProperty(runProperties, "b")) {
    styles.bold = true;
  }
  if (parseBooleanProperty(runProperties, "i")) {
    styles.italic = true;
  }
  if (parseBooleanProperty(runProperties, "strike")) {
    styles.strike = true;
  }

  const underline = getFirstChildByTagNameNS(runProperties, WORD_NS, "u");
  const underlineValue = getAttributeValue(underline, "val");
  if (underline && underlineValue !== "none") {
    styles.underline = true;
  }

  const vertAlign = getFirstChildByTagNameNS(runProperties, WORD_NS, "vertAlign");
  const vertAlignValue = getAttributeValue(vertAlign, "val");
  if (vertAlignValue === "superscript") {
    styles.superscript = true;
  }
  if (vertAlignValue === "subscript") {
    styles.subscript = true;
  }

  const fonts = getFirstChildByTagNameNS(runProperties, WORD_NS, "rFonts");
  const fontFamily =
    getAttributeValue(fonts, "ascii") ??
    getAttributeValue(fonts, "hAnsi") ??
    getAttributeValue(fonts, "cs");
  if (fontFamily) {
    styles.fontFamily = fontFamily;
  }

  const size = getFirstChildByTagNameNS(runProperties, WORD_NS, "sz");
  const sizeValue = getAttributeValue(size, "val");
  if (sizeValue) {
    const parsed = Number(sizeValue);
    if (Number.isFinite(parsed)) {
      styles.fontSize = parsed / 2;
    }
  }

  const color = getFirstChildByTagNameNS(runProperties, WORD_NS, "color");
  const colorValue = getAttributeValue(color, "val");
  if (colorValue && colorValue !== "auto") {
    styles.color = colorValue.startsWith("#") ? colorValue : `#${colorValue}`;
  }

  const highlight = getFirstChildByTagNameNS(runProperties, WORD_NS, "highlight");
  const highlightValue = getAttributeValue(highlight, "val");
  if (highlightValue && highlightValue !== "none") {
    styles.highlight = highlightValue;
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}

function parseParagraphStyle(paragraphProperties: XmlElement | null): Editor2ParagraphStyle | undefined {
  if (!paragraphProperties) {
    return undefined;
  }

  const style: Editor2ParagraphStyle = {};
  const justification = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "jc");
  const justificationValue = getAttributeValue(justification, "val");
  if (
    justificationValue === "left" ||
    justificationValue === "center" ||
    justificationValue === "right" ||
    justificationValue === "justify"
  ) {
    style.align = justificationValue;
  }

  const spacing = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "spacing");
  const before = getAttributeValue(spacing, "before");
  const after = getAttributeValue(spacing, "after");
  const line = getAttributeValue(spacing, "line");
  if (before) {
    style.spacingBefore = Number(before) / 20;
  }
  if (after) {
    style.spacingAfter = Number(after) / 20;
  }
  if (line) {
    style.lineHeight = Number(line) / 240;
  }

  const indent = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "ind");
  const left = getAttributeValue(indent, "left");
  const right = getAttributeValue(indent, "right");
  const firstLine = getAttributeValue(indent, "firstLine");
  if (left) {
    style.indentLeft = Number(left) / 20;
  }
  if (right) {
    style.indentRight = Number(right) / 20;
  }
  if (firstLine) {
    style.indentFirstLine = Number(firstLine) / 20;
  }

  if (parseBooleanProperty(paragraphProperties, "pageBreakBefore")) {
    style.pageBreakBefore = true;
  }
  if (parseBooleanProperty(paragraphProperties, "keepNext")) {
    style.keepWithNext = true;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function parseNumbering(numberingXml: string | null): NumberingMaps {
  const abstractKinds = new Map<string, Editor2ParagraphListStyle["kind"]>();
  const numKinds = new Map<string, Editor2ParagraphListStyle["kind"]>();

  if (!numberingXml) {
    return { abstractKinds, numKinds };
  }

  const document = new DOMParser().parseFromString(numberingXml, "application/xml");
  const numbering = document.documentElement;
  if (!numbering) {
    return { abstractKinds, numKinds };
  }

  const abstractNums = numbering.getElementsByTagNameNS(WORD_NS, "abstractNum");
  for (let index = 0; index < abstractNums.length; index += 1) {
    const abstractNum = abstractNums[index]!;
    const abstractId = getAttributeValue(abstractNum, "abstractNumId");
    const level = getFirstChildByTagNameNS(abstractNum, WORD_NS, "lvl");
    const numFmt = getFirstChildByTagNameNS(level ?? abstractNum, WORD_NS, "numFmt");
    const format = getAttributeValue(numFmt, "val");
    if (!abstractId || !format) {
      continue;
    }

    abstractKinds.set(
      abstractId,
      format === "bullet" ? "bullet" : "ordered",
    );
  }

  const nums = numbering.getElementsByTagNameNS(WORD_NS, "num");
  for (let index = 0; index < nums.length; index += 1) {
    const num = nums[index]!;
    const numId = getAttributeValue(num, "numId");
    const abstractNumIdElement = getFirstChildByTagNameNS(num, WORD_NS, "abstractNumId");
    const abstractNumId = getAttributeValue(abstractNumIdElement, "val");
    if (!numId || !abstractNumId) {
      continue;
    }

    numKinds.set(numId, abstractKinds.get(abstractNumId) ?? "ordered");
  }

  return { abstractKinds, numKinds };
}

function parseParagraphList(
  paragraphProperties: XmlElement | null,
  numberingMaps: NumberingMaps,
): Editor2ParagraphListStyle | undefined {
  if (!paragraphProperties) {
    return undefined;
  }

  const numPr = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "numPr");
  if (!numPr) {
    return undefined;
  }

  const numId = getAttributeValue(getFirstChildByTagNameNS(numPr, WORD_NS, "numId"), "val");
  if (!numId) {
    return undefined;
  }

  const ilvlValue = getAttributeValue(getFirstChildByTagNameNS(numPr, WORD_NS, "ilvl"), "val");
  const level = ilvlValue ? Number(ilvlValue) : 0;

  return {
    kind: numberingMaps.numKinds.get(numId) ?? "ordered",
    level: Number.isFinite(level) ? level : 0,
  };
}

function parseRunText(runElement: XmlElement): string {
  const textParts: string[] = [];

  const children = runElement.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (element.localName === "t") {
      textParts.push(element.textContent ?? "");
    } else if (element.localName === "tab") {
      textParts.push("\t");
    } else if (element.localName === "br" || element.localName === "cr") {
      textParts.push("\n");
    }
  }

  return textParts.join("");
}

function parseParagraphNode(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
) {
  const paragraphProperties = getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr");
  const runs = getChildrenByTagNameNS(paragraphNode, WORD_NS, "r")
    .map((runElement) => ({
      text: parseRunText(runElement),
      styles: parseRunStyle(getFirstChildByTagNameNS(runElement, WORD_NS, "rPr")),
    }))
    .filter((run) => run.text.length > 0);

  const paragraph = createEditor2ParagraphFromRuns(
    runs.length > 0 ? runs : [{ text: "" }],
  );
  paragraph.style = parseParagraphStyle(paragraphProperties);
  paragraph.list = parseParagraphList(paragraphProperties, numberingMaps);
  return paragraph;
}

function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
): Editor2TableNode {
  const rows = getChildrenByTagNameNS(tableNode, WORD_NS, "tr").map((rowNode) => {
    const cells = getChildrenByTagNameNS(rowNode, WORD_NS, "tc").map((cellNode) => {
      const paragraphs = getChildrenByTagNameNS(cellNode, WORD_NS, "p").map((paragraphNode) =>
        parseParagraphNode(paragraphNode, numberingMaps),
      );
      return createEditor2TableCell(
        paragraphs.length > 0 ? paragraphs : [createEditor2ParagraphFromRuns([{ text: "" }])],
      );
    });

    return createEditor2TableRow(cells);
  });

  return createEditor2Table(rows);
}

export async function importDocxToEditor2Document(buffer: ArrayBuffer): Promise<Editor2Document> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("Missing word/document.xml");
  }

  const numberingXml = (await zip.file("word/numbering.xml")?.async("string")) ?? null;
  const numberingMaps = parseNumbering(numberingXml);
  const document = new DOMParser().parseFromString(documentXml, "application/xml");
  const body = document.getElementsByTagNameNS(WORD_NS, "body")[0];

  const blocks: Editor2BlockNode[] = [];
  if (body) {
    for (let index = 0; index < body.childNodes.length; index += 1) {
      const node = body.childNodes[index];
      if (node?.nodeType !== node.ELEMENT_NODE) {
        continue;
      }

      const element = node as XmlElement;
      if (element.namespaceURI !== WORD_NS) {
        continue;
      }

      if (element.localName === "p") {
        blocks.push(parseParagraphNode(element, numberingMaps));
      } else if (element.localName === "tbl") {
        blocks.push(parseTableNode(element, numberingMaps));
      }
    }
  }

  return createEditor2Document(
    blocks.length > 0 ? blocks : [createEditor2ParagraphFromRuns([{ text: "" }])],
  );
}
