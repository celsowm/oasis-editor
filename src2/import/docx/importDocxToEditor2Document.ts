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

function getTableCellColSpan(cellProperties: XmlElement | null): number {
  if (!cellProperties) {
    return 1;
  }

  const gridSpan = getFirstChildByTagNameNS(cellProperties, WORD_NS, "gridSpan");
  const value = getAttributeValue(gridSpan, "val");
  const parsed = value ? Number(value) : 1;
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}

function parseBooleanProperty(parent: XmlElement, localName: string): boolean {
  return getFirstChildByTagNameNS(parent, WORD_NS, localName) !== null;
}

function findElementDeep(element: XmlElement, localName: string): XmlElement | null {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (node?.nodeType === 1) {
      const el = node as XmlElement;
      if (el.localName === localName) return el;
      const found = findElementDeep(el, localName);
      if (found) return found;
    }
  }
  return null;
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

async function parseRunElement(runElement: XmlElement, zip: JSZip, relsMap: Map<string, string>): Promise<{ text: string; image?: { src: string; width: number; height: number; } }> {
  const textParts: string[] = [];
  let image: { src: string; width: number; height: number; } | undefined;

  const children = runElement.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (element.namespaceURI === WORD_NS) {
      if (element.localName === "t") {
        textParts.push(element.textContent ?? "");
      } else if (element.localName === "tab") {
        textParts.push("\t");
      } else if (element.localName === "br" || element.localName === "cr") {
        textParts.push("\n");
      } else if (element.localName === "drawing") {
        const blip = findElementDeep(element, "blip");
        if (blip) {
          let embed = null;
          for (let i = 0; i < blip.attributes.length; i++) {
             const attr = blip.attributes[i];
             if (attr && (attr.localName === "embed" || attr.name === "r:embed" || attr.name === "embed")) {
                embed = attr.value;
                break;
             }
          }
          if (embed) {
            const target = relsMap.get(embed);
            if (target) {
              let zipPath = target;
              if (zipPath.startsWith("/")) zipPath = zipPath.slice(1);
              if (!zipPath.startsWith("word/")) zipPath = "word/" + target;
              const file = zip.file(zipPath);
              const ext = target.split('.').pop()?.toLowerCase();
              const mime = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'image/png';
              const base64 = await file?.async("base64");
              if (base64) {
                textParts.push("\uFFFC");
                const extent = findElementDeep(element, "extent");
                let width = 300;
                let height = 300;
                if (extent) {
                  const cx = extent.getAttribute("cx");
                  const cy = extent.getAttribute("cy");
                  if (cx) width = Math.round(parseInt(cx, 10) / 9525);
                  if (cy) height = Math.round(parseInt(cy, 10) / 9525);
                }
                image = { src: `data:${mime};base64,${base64}`, width, height };
              }
            }
          }
        }
      }
    }
  }

  return { text: textParts.join(""), image };
}

async function parseParagraphNode(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
) {
  const paragraphProperties = getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr");
  const runElements = getChildrenByTagNameNS(paragraphNode, WORD_NS, "r");
  const runs = [];
  for (const runElement of runElements) {
    const { text, image } = await parseRunElement(runElement, zip, relsMap);
    if (text.length > 0) {
      runs.push({
        text,
        image,
        styles: parseRunStyle(getFirstChildByTagNameNS(runElement, WORD_NS, "rPr")),
      });
    }
  }

  const paragraph = createEditor2ParagraphFromRuns(
    runs.length > 0 ? runs : [{ text: "" }],
  );
  paragraph.style = parseParagraphStyle(paragraphProperties);
  paragraph.list = parseParagraphList(paragraphProperties, numberingMaps);
  return paragraph;
}

async function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
): Promise<Editor2TableNode> {
  const rows = [];
  for (const rowNode of getChildrenByTagNameNS(tableNode, WORD_NS, "tr")) {
    const cells = [];
    for (const cellNode of getChildrenByTagNameNS(rowNode, WORD_NS, "tc")) {
      const paragraphs = [];
      const cellProperties = getFirstChildByTagNameNS(cellNode, WORD_NS, "tcPr");
      for (const paragraphNode of getChildrenByTagNameNS(cellNode, WORD_NS, "p")) {
        paragraphs.push(await parseParagraphNode(paragraphNode, numberingMaps, zip, relsMap));
      }
      cells.push(createEditor2TableCell(
        paragraphs.length > 0 ? paragraphs : [createEditor2ParagraphFromRuns([{ text: "" }])],
        getTableCellColSpan(cellProperties),
      ));
    }
    rows.push(createEditor2TableRow(cells));
  }

  return createEditor2Table(rows);
}

export async function importDocxToEditor2Document(buffer: ArrayBuffer): Promise<Editor2Document> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("Missing word/document.xml");
  }

  const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
  const relsMap = new Map<string, string>();
  if (relsXml) {
    const relsDoc = new DOMParser().parseFromString(relsXml, "application/xml");
    const relNodes = relsDoc.documentElement?.childNodes;
    if (relNodes) {
      for (let index = 0; index < relNodes.length; index += 1) {
        const node = relNodes[index];
        if (node?.nodeType === 1) {
          const rel = node as XmlElement;
          if (rel.localName === "Relationship") {
            const id = rel.getAttribute("Id");
            const target = rel.getAttribute("Target");
            if (id && target) {
              relsMap.set(id, target);
            }
          }
        }
      }
    }
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
        blocks.push(await parseParagraphNode(element, numberingMaps, zip, relsMap));
      } else if (element.localName === "tbl") {
        blocks.push(await parseTableNode(element, numberingMaps, zip, relsMap));
      }
    }
  }

  return createEditor2Document(
    blocks.length > 0 ? blocks : [createEditor2ParagraphFromRuns([{ text: "" }])],
  );
}
