import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  Editor2BlockNode,
  Editor2Document,
  Editor2PageSettings,
  Editor2ParagraphNode,
  Editor2ParagraphListStyle,
  Editor2Section,
  Editor2ParagraphStyle,
  Editor2TableNode,
  Editor2TextStyle,
} from "../../core/model.js";
import { createEditor2Document, createEditor2Paragraph, createEditor2ParagraphFromRuns, createEditor2Table, createEditor2TableCell, createEditor2TableRow } from "../../core/editorState.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;

interface NumberingMaps {
  abstractKinds: Map<string, Editor2ParagraphListStyle["kind"]>;
  numKinds: Map<string, Editor2ParagraphListStyle["kind"]>;
}

function getChildrenByTagNameNS(element: XmlElement | null, namespace: string, localName: string): XmlElement[] {
  const result: XmlElement[] = [];
  if (!element || !element.childNodes) {
    return result;
  }
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as unknown as XmlElement).namespaceURI === namespace &&
      (node as unknown as XmlElement).localName === localName
    ) {
      result.push(node as unknown as XmlElement);
    }
  }
  return result;
}

function getFirstChildByTagNameNS(
  element: XmlElement | null,
  namespace: string,
  localName: string,
): XmlElement | null {
  if (!element) {
    return null;
  }
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

function getTableCellVMerge(cellProperties: XmlElement | null): "restart" | "continue" | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const vMerge = getFirstChildByTagNameNS(cellProperties, WORD_NS, "vMerge");
  if (!vMerge) {
    return undefined;
  }

  const value = getAttributeValue(vMerge, "val");
  return value === "restart" ? "restart" : "continue";
}

function parseBooleanProperty(parent: XmlElement, localName: string): boolean {
  return getFirstChildByTagNameNS(parent, WORD_NS, localName) !== null;
}

function twipsToPx(value: string | null | undefined, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.round((parsed / TWIPS_PER_INCH) * PX_PER_INCH);
}

function parsePageSettings(body: XmlElement | undefined): Editor2PageSettings | undefined {
  if (!body) {
    return undefined;
  }

  const sectionProperties = getFirstChildByTagNameNS(body, WORD_NS, "sectPr");
  if (!sectionProperties) {
    return undefined;
  }

  const pageSize = getFirstChildByTagNameNS(sectionProperties, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(sectionProperties, WORD_NS, "pgMar");
  if (!pageSize && !pageMargins) {
    return undefined;
  }

  const width = twipsToPx(getAttributeValue(pageSize, "w"), 816);
  const height = twipsToPx(getAttributeValue(pageSize, "h"), 1056);
  const orientationValue = getAttributeValue(pageSize, "orient");

  return {
    width,
    height,
    orientation:
      orientationValue === "landscape"
        ? "landscape"
        : orientationValue === "portrait"
          ? "portrait"
          : width > height
            ? "landscape"
            : "portrait",
    margins: {
      top: twipsToPx(getAttributeValue(pageMargins, "top"), 96),
      right: twipsToPx(getAttributeValue(pageMargins, "right"), 96),
      bottom: twipsToPx(getAttributeValue(pageMargins, "bottom"), 96),
      left: twipsToPx(getAttributeValue(pageMargins, "left"), 96),
      header: twipsToPx(getAttributeValue(pageMargins, "header"), 48),
      footer: twipsToPx(getAttributeValue(pageMargins, "footer"), 48),
      gutter: twipsToPx(getAttributeValue(pageMargins, "gutter"), 0),
    },
  };
}

function isTableHeaderRow(rowNode: XmlElement): boolean {
  const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");
  return rowProperties ? parseBooleanProperty(rowProperties, "tblHeader") : false;
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

async function parseRunElement(
  runElement: XmlElement,
  zip: JSZip,
  relsMap: Map<string, string>,
): Promise<{ text: string; image?: { src: string; width: number; height: number; alt?: string } }> {
  const textParts: string[] = [];
  let image: { src: string; width: number; height: number; alt?: string } | undefined;

  const children = runElement.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as unknown as XmlElement;
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
                const docPr = findElementDeep(element, "docPr");
                let width = 300;
                let height = 300;
                if (extent) {
                  const cx = extent.getAttribute("cx");
                  const cy = extent.getAttribute("cy");
                  if (cx) width = Math.round(parseInt(cx, 10) / 9525);
                  if (cy) height = Math.round(parseInt(cy, 10) / 9525);
                }
                const alt = docPr
                  ? getAttributeValue(docPr, "descr") ?? getAttributeValue(docPr, "title")
                  : null;
                image = {
                  src: `data:${mime};base64,${base64}`,
                  width,
                  height,
                  ...(alt !== null ? { alt } : {}),
                };
              }
            }
          }
        }
      }
    }
  }

  return { text: textParts.join(""), image };
}

async function parseRunsContainer(
  container: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  inheritedLink?: string | null,
) {
  const runs: Array<{ text: string; image?: { src: string; width: number; height: number; alt?: string }; styles?: Editor2TextStyle }> = [];

  for (let index = 0; index < container.childNodes.length; index += 1) {
    const node = container.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as unknown as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (element.localName === "r") {
      const { text, image } = await parseRunElement(element, zip, relsMap);
      if (text.length === 0) {
        continue;
      }

      let styles = parseRunStyle(getFirstChildByTagNameNS(element, WORD_NS, "rPr"));
      if (inheritedLink) {
        (styles ??= {}).link = inheritedLink;
      }
      runs.push({ text, image, styles });
      continue;
    }

    if (element.localName === "hyperlink") {
      let href =
        relsMap.get(
          element.getAttribute("r:id") ??
            element.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ??
            "",
        ) ?? null;

      href ??= element.getAttribute("w:anchor");
      runs.push(
        ...(await parseRunsContainer(
          element,
          numberingMaps,
          zip,
          relsMap,
          href,
        )),
      );
    }
  }

  return runs;
}

async function parseParagraphNode(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
) {
  const paragraphProperties = getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr");
  const runs = await parseRunsContainer(paragraphNode, numberingMaps, zip, relsMap);

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
      const colSpan = getTableCellColSpan(cellProperties);
      const vMerge = getTableCellVMerge(cellProperties);
      const cell = createEditor2TableCell(
        paragraphs.length > 0 ? paragraphs : [createEditor2ParagraphFromRuns([{ text: "" }])],
        colSpan,
        vMerge === "restart" ? { rowSpan: 1, vMerge } : vMerge ? { vMerge } : undefined,
      );
      if (vMerge === "continue") {
        cell.blocks = [];
      }
      cells.push(cell);
    }
    rows.push(createEditor2TableRow(cells, isTableHeaderRow(rowNode) ? { isHeader: true } : undefined));
  }

  // Infer rowSpan from restart/continue sequences.
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]!;
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex];
      if (cell.vMerge !== "restart") {
        continue;
      }

      let span = 1;
      for (let nextRowIndex = rowIndex + 1; nextRowIndex < rows.length; nextRowIndex += 1) {
        const nextCell = rows[nextRowIndex]!.cells[cellIndex];
        if (!nextCell || nextCell.vMerge !== "continue") {
          break;
        }
        span += 1;
      }
      if (span > 1) {
        cell.rowSpan = span;
      }
    }
  }

  return createEditor2Table(rows);
}

async function parseBlocks(
  nodes: any,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
): Promise<Editor2BlockNode[]> {
  const blocks: Editor2BlockNode[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node?.nodeType !== 1) {
      continue;
    }

    const element = node as unknown as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (element.localName === "p") {
      blocks.push(await parseParagraphNode(element, numberingMaps, zip, relsMap));
    } else if (element.localName === "tbl") {
      blocks.push(await parseTableNode(element, numberingMaps, zip, relsMap));
    }
  }
  return blocks;
}

function parseSectPr(sectPr: XmlElement | null): Editor2PageSettings {
  if (!sectPr) {
    return {
      width: 816,
      height: 1056,
      orientation: "portrait",
      margins: {
        top: 96,
        right: 96,
        bottom: 96,
        left: 96,
        header: 48,
        footer: 48,
        gutter: 0,
      },
    };
  }
  const pageSize = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgMar");

  const width = twipsToPx(getAttributeValue(pageSize, "w"), 816);
  const height = twipsToPx(getAttributeValue(pageSize, "h"), 1056);
  const orientationValue = getAttributeValue(pageSize, "orient");

  return {
    width,
    height,
    orientation:
      orientationValue === "landscape"
        ? "landscape"
        : orientationValue === "portrait"
          ? "portrait"
          : width > height
            ? "landscape"
            : "portrait",
    margins: {
      top: twipsToPx(getAttributeValue(pageMargins, "top"), 96),
      right: twipsToPx(getAttributeValue(pageMargins, "right"), 96),
      bottom: twipsToPx(getAttributeValue(pageMargins, "bottom"), 96),
      left: twipsToPx(getAttributeValue(pageMargins, "left"), 96),
      header: twipsToPx(getAttributeValue(pageMargins, "header"), 48),
      footer: twipsToPx(getAttributeValue(pageMargins, "footer"), 48),
      gutter: twipsToPx(getAttributeValue(pageMargins, "gutter"), 0),
    },
  };
}

async function loadHeaderFooter(
  sectPr: XmlElement,
  type: "headerReference" | "footerReference",
  zip: JSZip,
  relsMap: Map<string, string>,
  numberingMaps: NumberingMaps,
): Promise<Editor2ParagraphNode[] | undefined> {
  const references = getChildrenByTagNameNS(sectPr, WORD_NS, type);
  // For now, we only support 'default' type (ignore first/even for simplicity)
  const defaultRef =
    references.find((ref) => getAttributeValue(ref, "type") === "default") ?? references[0];
  if (!defaultRef) {
    return undefined;
  }

  const rId =
    defaultRef.getAttribute("r:id") ??
    defaultRef.getAttributeNS(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "id",
    );
  if (!rId) {
    return undefined;
  }

  const target = relsMap.get(rId);
  if (!target) {
    return undefined;
  }

  let zipPath = target;
  if (zipPath.startsWith("/")) zipPath = zipPath.slice(1);
  if (!zipPath.startsWith("word/")) zipPath = "word/" + target;

  const content = await zip.file(zipPath)?.async("string");
  if (!content) {
    return undefined;
  }

  const doc = new DOMParser().parseFromString(content, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return undefined;
  }

  // Header/Footer rels are usually in word/_rels/header1.xml.rels
  const fileName = zipPath.split("/").pop();
  const relsZipPath = `word/_rels/${fileName}.rels`;
  const relsContent = await zip.file(relsZipPath)?.async("string");
  const zoneRelsMap = new Map<string, string>();
  if (relsContent) {
    const relsDoc = new DOMParser().parseFromString(relsContent, "application/xml");
    const relNodes = relsDoc.documentElement?.childNodes;
    if (relNodes) {
      for (let i = 0; i < relNodes.length; i++) {
        const node = relNodes[i];
        if (node?.nodeType === 1) {
          const rel = node as XmlElement;
          const id = rel.getAttribute("Id");
          const t = rel.getAttribute("Target");
          if (id && t) zoneRelsMap.set(id, t);
        }
      }
    }
  }

  const blocks = await parseBlocks(root.childNodes, numberingMaps, zip, zoneRelsMap);
  return blocks.filter((b): b is Editor2ParagraphNode => b.type === "paragraph");
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
  if (!body) {
    throw new Error("Missing body in document.xml");
  }

  const sections: Editor2Section[] = [];
  let currentBlocks: Editor2BlockNode[] = [];

  for (let index = 0; index < body.childNodes.length; index += 1) {
    const node = body.childNodes[index];
    if (node?.nodeType !== 1) {
      continue;
    }

    const element = node as unknown as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (element.localName === "p") {
      const paragraph = await parseParagraphNode(element, numberingMaps, zip, relsMap);
      currentBlocks.push(paragraph);

      const pPr = getFirstChildByTagNameNS(element, WORD_NS, "pPr");
      const sectPr = getFirstChildByTagNameNS(pPr!, WORD_NS, "sectPr");
      if (sectPr) {
        sections.push({
          id: `section:${sections.length + 1}`,
          blocks: currentBlocks,
          pageSettings: parseSectPr(sectPr),
          header: await loadHeaderFooter(sectPr, "headerReference", zip, relsMap, numberingMaps),
          footer: await loadHeaderFooter(sectPr, "footerReference", zip, relsMap, numberingMaps),
        });
        currentBlocks = [];
      }
    } else if (element.localName === "tbl") {
      currentBlocks.push(await parseTableNode(element, numberingMaps, zip, relsMap));
    }
  }

  const bodySectPr = getFirstChildByTagNameNS(body, WORD_NS, "sectPr");
  sections.push({
    id: `section:${sections.length + 1}`,
    blocks: currentBlocks.length > 0 ? currentBlocks : [createEditor2Paragraph("")],
    pageSettings: parseSectPr(bodySectPr),
    header: bodySectPr
      ? await loadHeaderFooter(bodySectPr, "headerReference", zip, relsMap, numberingMaps)
      : undefined,
    footer: bodySectPr
      ? await loadHeaderFooter(bodySectPr, "footerReference", zip, relsMap, numberingMaps)
      : undefined,
  });

  return {
    id: `document:${Date.now()}`,
    sections,
    blocks: sections[0].blocks, // Legacy compatibility
    pageSettings: sections[0].pageSettings, // Legacy compatibility
  };
}
