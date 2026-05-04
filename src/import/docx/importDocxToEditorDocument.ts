import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorPageSettings,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorSection,
  EditorTableNode,
  EditorTextStyle,
} from "../../core/model.js";
import { createEditorDocument, createEditorParagraphFromRuns, createEditorTable, createEditorTableCell, createEditorTableRow } from "../../core/editorState.js";
import { normalizePageSettings } from "../../core/model.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;

interface NumberingMaps {
  abstractKinds: Map<string, EditorParagraphListStyle["kind"]>;
  numKinds: Map<string, EditorParagraphListStyle["kind"]>;
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

interface SectionProperties {
  pageSettings?: EditorPageSettings;
  headerRId: string | null;
  footerRId: string | null;
}

interface ParsedSection {
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  header: EditorParagraphNode[];
  footer: EditorParagraphNode[];
}

function parseSectionProperties(sectPr: XmlElement): SectionProperties {
  const pageSize = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgMar");

  let pageSettings: EditorPageSettings | undefined;
  if (pageSize || pageMargins) {
    const width = twipsToPx(getAttributeValue(pageSize, "w"), 816);
    const height = twipsToPx(getAttributeValue(pageSize, "h"), 1056);
    const orientationValue = getAttributeValue(pageSize, "orient");

    pageSettings = {
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

  const headerRef = getFirstChildByTagNameNS(sectPr, WORD_NS, "headerReference");
  const footerRef = getFirstChildByTagNameNS(sectPr, WORD_NS, "footerReference");

  return {
    pageSettings,
    headerRId: headerRef ? getAttributeValue(headerRef, "id") : null,
    footerRId: footerRef ? getAttributeValue(footerRef, "id") : null,
  };
}

async function parseHeaderFooterXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
): Promise<EditorParagraphNode[]> {
  if (!xmlContent) {
    return [];
  }

  const doc = new DOMParser().parseFromString(xmlContent, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return [];
  }

  const paragraphs: EditorParagraphNode[] = [];
  for (let index = 0; index < root.childNodes.length; index += 1) {
    const node = root.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName === "p" && element.namespaceURI === WORD_NS) {
      paragraphs.push(await parseParagraphNode(element, numberingMaps, zip, relsMap));
    }
  }
  return paragraphs;
}

function parsePageSettings(body: XmlElement | undefined): EditorPageSettings | undefined {
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

function parseRunStyle(runProperties: XmlElement | null): EditorTextStyle | undefined {
  if (!runProperties) {
    return undefined;
  }

  const styles: EditorTextStyle = {};
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

function parseParagraphStyle(paragraphProperties: XmlElement | null): EditorParagraphStyle | undefined {
  if (!paragraphProperties) {
    return undefined;
  }

  const style: EditorParagraphStyle = {};
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
  const abstractKinds = new Map<string, EditorParagraphListStyle["kind"]>();
  const numKinds = new Map<string, EditorParagraphListStyle["kind"]>();

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
): EditorParagraphListStyle | undefined {
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
  const runs: Array<{ text: string; image?: { src: string; width: number; height: number; alt?: string }; styles?: EditorTextStyle }> = [];

  for (let index = 0; index < container.childNodes.length; index += 1) {
    const node = container.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
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

  const paragraph = createEditorParagraphFromRuns(
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
): Promise<EditorTableNode> {
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
      const cell = createEditorTableCell(
        paragraphs.length > 0 ? paragraphs : [createEditorParagraphFromRuns([{ text: "" }])],
        colSpan,
        vMerge === "restart" ? { rowSpan: 1, vMerge } : vMerge ? { vMerge } : undefined,
      );
      if (vMerge === "continue") {
        cell.blocks = [];
      }
      cells.push(cell);
    }
    rows.push(createEditorTableRow(cells, isTableHeaderRow(rowNode) ? { isHeader: true } : undefined));
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

  return createEditorTable(rows);
}

export async function importDocxToEditorDocument(buffer: ArrayBuffer): Promise<EditorDocument> {
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
    return createEditorDocument([createEditorParagraphFromRuns([{ text: "" }])]);
  }

  // Parse body into sections separated by sectPr elements
  const sectionProps: SectionProperties[] = [];
  const sectionBlocks: EditorBlockNode[][] = [[]];

  for (let index = 0; index < body.childNodes.length; index += 1) {
    const node = body.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (element.localName === "sectPr") {
      // sectPr marks the end of a section
      sectionProps.push(parseSectionProperties(element));
      sectionBlocks.push([]);
    } else if (element.localName === "p") {
      sectionBlocks[sectionBlocks.length - 1]!.push(
        await parseParagraphNode(element, numberingMaps, zip, relsMap),
      );
    } else if (element.localName === "tbl") {
      sectionBlocks[sectionBlocks.length - 1]!.push(
        await parseTableNode(element, numberingMaps, zip, relsMap),
      );
    }
  }

  // Ensure at least one section
  if (sectionProps.length === 0) {
    const defaultPageSettings = parsePageSettings(body);
    sectionProps.push({
      pageSettings: defaultPageSettings,
      headerRId: null,
      footerRId: null,
    });
  }

  // Build sections with headers/footers
  const sections: EditorSection[] = [];
  for (let i = 0; i < sectionProps.length; i += 1) {
    const props = sectionProps[i]!;
    const blocks = sectionBlocks[i] ?? [];

    // Load header and footer if referenced
    let header: EditorParagraphNode[] = [];
    let footer: EditorParagraphNode[] = [];

    if (props.headerRId) {
      const headerTarget = relsMap.get(props.headerRId);
      if (headerTarget) {
        let zipPath = headerTarget.startsWith("/") ? headerTarget.slice(1) : headerTarget;
        if (!zipPath.startsWith("word/")) zipPath = "word/" + headerTarget;
        const headerXml = await zip.file(zipPath)?.async("string");
        header = await parseHeaderFooterXml(headerXml ?? null, numberingMaps, zip, relsMap);
      }
    }

    if (props.footerRId) {
      const footerTarget = relsMap.get(props.footerRId);
      if (footerTarget) {
        let zipPath = footerTarget.startsWith("/") ? footerTarget.slice(1) : footerTarget;
        if (!zipPath.startsWith("word/")) zipPath = "word/" + footerTarget;
        const footerXml = await zip.file(zipPath)?.async("string");
        footer = await parseHeaderFooterXml(footerXml ?? null, numberingMaps, zip, relsMap);
      }
    }

    const rawPageSettings = props.pageSettings ?? {
      width: 816,
      height: 1056,
      orientation: "portrait" as const,
      margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 },
    };
    const pageSettings = normalizePageSettings(rawPageSettings);

    sections.push({
      id: `section:${i + 1}`,
      blocks: blocks.length > 0 ? blocks : [createEditorParagraphFromRuns([{ text: "" }])],
      pageSettings,
      header: header.length > 0 ? header : undefined,
      footer: footer.length > 0 ? footer : undefined,
    });
  }

  // Create document with sections only if there are multiple sections
  // For single-section documents, use flat blocks for Solid.js compatibility
  if (sections.length > 1) {
    const doc = createEditorDocument([]);
    (doc as any).sections = sections;
    doc.blocks = [];
    return doc;
  }

  // Single section: use flat blocks for compatibility
  const singleSection = sections[0];
  return createEditorDocument(
    singleSection?.blocks.length > 0 ? singleSection.blocks : [createEditorParagraphFromRuns([{ text: "" }])],
    singleSection?.pageSettings,
  );
}
