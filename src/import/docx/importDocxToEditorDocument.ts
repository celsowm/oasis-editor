import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorAsset,
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
import { EDITOR_ASSET_REF_PREFIX } from "../../core/model.js";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
  DEFAULT_EDITOR_STYLES,
} from "../../core/editorState.js";
import {
  normalizePageSettings,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";

export type DocxImportStage =
  | "opening-docx"
  | "parsing-document";

export interface ImportDocxToEditorDocumentOptions {
  onProgress?: (stage: DocxImportStage) => void;
}

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;
const PAGE_BREAK_MARKER = "\f";

interface NumberingMaps {
  abstractKinds: Map<string, EditorParagraphListStyle["kind"]>;
  numKinds: Map<string, EditorParagraphListStyle["kind"]>;
}

/**
 * Mutable registry that collects unique image payloads encountered during
 * import and assigns each a stable id. Image runs reference the entry via
 * `image.src = "asset:<id>"` so the heavy base64 payload lives in
 * `document.assets` exactly once instead of being copied into every run.
 */
interface AssetRegistry {
  /** id → asset record (stored as the document's `assets` map). */
  assets: Record<string, EditorAsset>;
  /** zip path → asset id, used to dedupe images that share a source file. */
  byPath: Map<string, string>;
  /** monotonically increasing counter used to mint new asset ids. */
  nextId: number;
}

function createAssetRegistry(): AssetRegistry {
  return { assets: {}, byPath: new Map(), nextId: 1 };
}

function registerImageAsset(
  registry: AssetRegistry,
  zipPath: string,
  url: string,
): string {
  const existing = registry.byPath.get(zipPath);
  if (existing) {
    return `${EDITOR_ASSET_REF_PREFIX}${existing}`;
  }
  const id = `img-${registry.nextId}`;
  registry.nextId += 1;
  registry.assets[id] = { id, url };
  registry.byPath.set(zipPath, id);
  return `${EDITOR_ASSET_REF_PREFIX}${id}`;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> | undefined {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

function normalizeImportedParagraphStyle(style: EditorParagraphStyle | undefined): EditorParagraphStyle | undefined {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveParagraphStyle(style, DEFAULT_EDITOR_STYLES);
  const defaultEffective = resolveEffectiveParagraphStyle(undefined, DEFAULT_EDITOR_STYLES);

  return stripUndefined({
    align: effective.align !== defaultEffective.align ? effective.align : undefined,
    spacingBefore:
      effective.spacingBefore !== defaultEffective.spacingBefore ? effective.spacingBefore : undefined,
    spacingAfter:
      effective.spacingAfter !== defaultEffective.spacingAfter ? effective.spacingAfter : undefined,
    lineHeight: effective.lineHeight !== defaultEffective.lineHeight ? effective.lineHeight : undefined,
    indentLeft: effective.indentLeft !== defaultEffective.indentLeft ? effective.indentLeft : undefined,
    indentRight: effective.indentRight !== defaultEffective.indentRight ? effective.indentRight : undefined,
    indentFirstLine:
      effective.indentFirstLine !== defaultEffective.indentFirstLine ? effective.indentFirstLine : undefined,
    pageBreakBefore:
      effective.pageBreakBefore !== defaultEffective.pageBreakBefore ? effective.pageBreakBefore : undefined,
    keepWithNext: effective.keepWithNext !== defaultEffective.keepWithNext ? effective.keepWithNext : undefined,
  });
}

function normalizeImportedRunStyle(
  style: EditorTextStyle | undefined,
  paragraphStyleId: string | undefined,
): EditorTextStyle | undefined {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveTextStyleForParagraph(style, paragraphStyleId, DEFAULT_EDITOR_STYLES);
  const defaultEffective = resolveEffectiveTextStyleForParagraph(undefined, paragraphStyleId, DEFAULT_EDITOR_STYLES);

  return stripUndefined({
    bold: effective.bold !== defaultEffective.bold ? effective.bold : undefined,
    italic: effective.italic !== defaultEffective.italic ? effective.italic : undefined,
    underline: effective.underline !== defaultEffective.underline ? effective.underline : undefined,
    strike: effective.strike !== defaultEffective.strike ? effective.strike : undefined,
    superscript: effective.superscript !== defaultEffective.superscript ? effective.superscript : undefined,
    subscript: effective.subscript !== defaultEffective.subscript ? effective.subscript : undefined,
    fontFamily: effective.fontFamily !== defaultEffective.fontFamily ? effective.fontFamily : undefined,
    fontSize: effective.fontSize !== defaultEffective.fontSize ? effective.fontSize : undefined,
    color: effective.color !== defaultEffective.color ? effective.color : undefined,
    highlight: effective.highlight !== defaultEffective.highlight ? effective.highlight : undefined,
    link: effective.link !== defaultEffective.link ? effective.link : undefined,
  });
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

function halfPointsToPx(value: string | null | undefined): number | null {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round((parsed / 2 / 72) * PX_PER_INCH * 10000) / 10000;
}

interface ImportedRun {
  text: string;
  image?: { src: string; width: number; height: number; alt?: string };
  styles?: EditorTextStyle;
  field?: { type: "PAGE" | "NUMPAGES" };
}

interface SectionProperties {
  pageSettings?: EditorPageSettings;
  headerRId: string | null;
  footerRId: string | null;
}

interface ParsedSection {
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  header: EditorBlockNode[];
  footer: EditorBlockNode[];
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
  const headerRId =
    headerRef?.getAttribute("r:id") ??
    headerRef?.getAttributeNS(OFFICE_REL_NS, "id") ??
    null;
  const footerRId =
    footerRef?.getAttribute("r:id") ??
    footerRef?.getAttributeNS(OFFICE_REL_NS, "id") ??
    null;

  return {
    pageSettings,
    headerRId,
    footerRId,
  };
}

async function parseHeaderFooterXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<EditorBlockNode[]> {
  if (!xmlContent) {
    return [];
  }

  const doc = new DOMParser().parseFromString(xmlContent, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return [];
  }

  const blocks: EditorBlockNode[] = [];
  for (let index = 0; index < root.childNodes.length; index += 1) {
    const node = root.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName === "p" && element.namespaceURI === WORD_NS) {
      blocks.push(await parseParagraphNode(element, numberingMaps, zip, relsMap, assets));
    } else if (element.localName === "tbl" && element.namespaceURI === WORD_NS) {
      blocks.push(await parseTableNode(element, numberingMaps, zip, relsMap, assets));
    }
  }
  return blocks;
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
    const parsed = halfPointsToPx(sizeValue);
    if (parsed !== null) {
      styles.fontSize = parsed;
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
    style.spacingBefore = twipsToPx(before, 0);
  }
  if (after) {
    style.spacingAfter = twipsToPx(after, 0);
  }
  if (line) {
    style.lineHeight = Number(line) / 240;
  }

  const indent = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "ind");
  const left = getAttributeValue(indent, "left");
  const right = getAttributeValue(indent, "right");
  const firstLine = getAttributeValue(indent, "firstLine");
  if (left) {
    style.indentLeft = twipsToPx(left, 0);
  }
  if (right) {
    style.indentRight = twipsToPx(right, 0);
  }
  if (firstLine) {
    style.indentFirstLine = twipsToPx(firstLine, 0);
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
  assets: AssetRegistry,
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
      } else if (element.localName === "br") {
        textParts.push(getAttributeValue(element, "type") === "page" ? PAGE_BREAK_MARKER : "\n");
      } else if (element.localName === "cr") {
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
                // Store the heavy base64 payload in the document's asset
                // registry exactly once and reference it from the run.
                // Without this, every clone/equality check/signature pass
                // would have to walk a multi-hundred-KB string per keystroke.
                const assetSrc = registerImageAsset(
                  assets,
                  zipPath,
                  `data:${mime};base64,${base64}`,
                );
                image = {
                  src: assetSrc,
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
  assets: AssetRegistry,
  inheritedLink?: string | null,
) {
  const runs: ImportedRun[] = [];

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
      const { text, image } = await parseRunElement(element, zip, relsMap, assets);
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

    if (element.localName === "fldSimple") {
      const instr =
        element.getAttribute("w:instr") ??
        element.getAttributeNS(WORD_NS, "instr") ??
        element.getAttribute("instr") ??
        "";
      const fieldType =
        /\bNUMPAGES\b/i.test(instr) ? "NUMPAGES" : /\bPAGE\b/i.test(instr) ? "PAGE" : null;
      const fieldRuns = await parseRunsContainer(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        inheritedLink,
      );
      const displayText = fieldRuns.map((run) => run.text).join("") || "1";
      const styles = fieldRuns.find((run) => run.styles)?.styles;
      runs.push({
        text: displayText,
        styles,
        ...(fieldType ? { field: { type: fieldType } } : {}),
      });
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
          assets,
          href,
        )),
      );
    }
  }

  return runs;
}

function createImportedParagraph(
  runs: ImportedRun[],
  paragraphStyle: EditorParagraphStyle | undefined,
  list: EditorParagraphListStyle | undefined,
): EditorParagraphNode {
  const paragraph = createEditorParagraphFromRuns(
    runs.length > 0
      ? runs.map((run) => ({ text: run.text, styles: run.styles, image: run.image }))
      : [{ text: "" }],
  );
  runs.forEach((run, index) => {
    if (run.field) {
      paragraph.runs[index]!.field = { ...run.field };
    }
  });
  paragraph.style = paragraphStyle ? { ...paragraphStyle } : undefined;
  for (const run of paragraph.runs) {
    run.styles = normalizeImportedRunStyle(run.styles, paragraph.style?.styleId);
  }
  paragraph.list = list ? { ...list } : undefined;
  return paragraph;
}

function splitRunsAtPageBreaks(runs: ImportedRun[]): { segments: ImportedRun[][]; hasPageBreak: boolean } {
  const segments: ImportedRun[][] = [[]];
  let hasPageBreak = false;

  const appendRun = (run: ImportedRun, text: string) => {
    if (text.length === 0 && !run.image && !run.field) {
      return;
    }
    segments[segments.length - 1]!.push({
      ...run,
      text,
    });
  };

  for (const run of runs) {
    if (!run.text.includes(PAGE_BREAK_MARKER)) {
      appendRun(run, run.text);
      continue;
    }

    const parts = run.text.split(PAGE_BREAK_MARKER);
    parts.forEach((part, index) => {
      appendRun(run, part);
      if (index < parts.length - 1) {
        hasPageBreak = true;
        segments.push([]);
      }
    });
  }

  return { segments, hasPageBreak };
}

function paragraphHasVisibleContent(runs: ImportedRun[]): boolean {
  return runs.some((run) => run.image || run.field || run.text.replace(/\s/g, "").length > 0);
}

async function parseParagraphNodes(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<{ paragraphs: EditorParagraphNode[]; pageBreakAfter: boolean }> {
  const paragraphProperties = getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr");
  const runs = await parseRunsContainer(paragraphNode, numberingMaps, zip, relsMap, assets);
  const paragraphStyle = normalizeImportedParagraphStyle(parseParagraphStyle(paragraphProperties));
  const list = parseParagraphList(paragraphProperties, numberingMaps);
  const { segments, hasPageBreak } = splitRunsAtPageBreaks(runs);

  if (!hasPageBreak) {
    return {
      paragraphs: [createImportedParagraph(runs, paragraphStyle, list)],
      pageBreakAfter: false,
    };
  }

  const paragraphs: EditorParagraphNode[] = [];
  let pendingPageBreakBefore = false;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    if (index > 0) {
      pendingPageBreakBefore = true;
    }
    if (!paragraphHasVisibleContent(segment)) {
      continue;
    }

    const style = pendingPageBreakBefore
      ? { ...(paragraphStyle ?? {}), pageBreakBefore: true }
      : paragraphStyle;
    paragraphs.push(createImportedParagraph(segment, style, list));
    pendingPageBreakBefore = false;
  }

  return {
    paragraphs,
    pageBreakAfter: pendingPageBreakBefore,
  };
}

async function parseParagraphNode(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
) {
  const parsed = await parseParagraphNodes(paragraphNode, numberingMaps, zip, relsMap, assets);
  return parsed.paragraphs[0] ?? createEditorParagraphFromRuns([{ text: "" }]);
}

async function parseTableNode(
  tableNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<EditorTableNode> {
  const rows = [];
  for (const rowNode of getChildrenByTagNameNS(tableNode, WORD_NS, "tr")) {
    const cells = [];
    for (const cellNode of getChildrenByTagNameNS(rowNode, WORD_NS, "tc")) {
      const paragraphs = [];
      const cellProperties = getFirstChildByTagNameNS(cellNode, WORD_NS, "tcPr");
      for (const paragraphNode of getChildrenByTagNameNS(cellNode, WORD_NS, "p")) {
        paragraphs.push(await parseParagraphNode(paragraphNode, numberingMaps, zip, relsMap, assets));
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

export async function importDocxToEditorDocument(
  buffer: ArrayBuffer,
  options: ImportDocxToEditorDocumentOptions = {},
): Promise<EditorDocument> {
  options.onProgress?.("opening-docx");
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
  options.onProgress?.("parsing-document");
  const document = new DOMParser().parseFromString(documentXml, "application/xml");
  const body = document.getElementsByTagNameNS(WORD_NS, "body")[0];

  if (!body) {
    return createEditorDocument([createEditorParagraphFromRuns([{ text: "" }])]);
  }

  // Single registry shared across body, headers and footers so identical
  // images referenced from multiple places dedupe to one stored payload.
  const assets = createAssetRegistry();

  // Parse body into sections separated by sectPr elements
  const sectionProps: SectionProperties[] = [];
  const sectionBlocks: EditorBlockNode[][] = [[]];
  let pendingPageBreakBefore = false;

  const appendBodyBlock = (block: EditorBlockNode) => {
    if (pendingPageBreakBefore && block.type === "paragraph") {
      block.style = { ...(block.style ?? {}), pageBreakBefore: true };
      pendingPageBreakBefore = false;
    }
    sectionBlocks[sectionBlocks.length - 1]!.push(block);
  };

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
      pendingPageBreakBefore = false;
    } else if (element.localName === "p") {
      const parsedParagraph = await parseParagraphNodes(element, numberingMaps, zip, relsMap, assets);
      for (const paragraph of parsedParagraph.paragraphs) {
        appendBodyBlock(paragraph);
      }
      if (parsedParagraph.pageBreakAfter) {
        pendingPageBreakBefore = true;
      }
    } else if (element.localName === "tbl") {
      appendBodyBlock(await parseTableNode(element, numberingMaps, zip, relsMap, assets));
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
    let header: EditorBlockNode[] = [];
    let footer: EditorBlockNode[] = [];

    if (props.headerRId) {
      const headerTarget = relsMap.get(props.headerRId);
      if (headerTarget) {
        let zipPath = headerTarget.startsWith("/") ? headerTarget.slice(1) : headerTarget;
        if (!zipPath.startsWith("word/")) zipPath = "word/" + headerTarget;
        const headerXml = await zip.file(zipPath)?.async("string");
        header = await parseHeaderFooterXml(headerXml ?? null, numberingMaps, zip, relsMap, assets);
      }
    }

    if (props.footerRId) {
      const footerTarget = relsMap.get(props.footerRId);
      if (footerTarget) {
        let zipPath = footerTarget.startsWith("/") ? footerTarget.slice(1) : footerTarget;
        if (!zipPath.startsWith("word/")) zipPath = "word/" + footerTarget;
        const footerXml = await zip.file(zipPath)?.async("string");
        footer = await parseHeaderFooterXml(footerXml ?? null, numberingMaps, zip, relsMap, assets);
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

  const shouldPreserveSections =
    sections.length > 1 ||
    sections.some((section) => (section.header?.length ?? 0) > 0 || (section.footer?.length ?? 0) > 0);

  const hasAssets = Object.keys(assets.assets).length > 0;

  if (shouldPreserveSections) {
    const doc = createEditorDocument([]);
    (doc as any).sections = sections;
    doc.blocks = [];
    if (sections.length === 1) {
      doc.pageSettings = sections[0]!.pageSettings;
    }
    if (hasAssets) {
      doc.assets = assets.assets;
    }
    return doc;
  }

  // Single section: use flat blocks for compatibility
  const singleSection = sections[0];
  const doc = createEditorDocument(
    singleSection?.blocks.length > 0 ? singleSection.blocks : [createEditorParagraphFromRuns([{ text: "" }])],
    singleSection?.pageSettings,
  );
  if (hasAssets) {
    doc.assets = assets.assets;
  }
  return doc;
}
