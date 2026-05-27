import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorSection,
} from "../../core/model.js";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "../../core/editorState.js";
import { normalizePageSettings } from "../../core/model.js";
import { WORD_NS, getFirstChildByTagNameNS, yieldToEventLoop } from "./xmlHelpers.js";
import { createAssetRegistry } from "./assetRegistry.js";
import { parseRelationshipsXml, loadPartRelationships } from "./relationships.js";
import { parseThemeFonts } from "./themeFonts.js";
import { parseSettings } from "./settings.js";
import { parseNumbering } from "./numbering.js";
import { parseImportedStyles } from "./styles.js";
import {
  type SectionProperties,
  parseSectionProperties,
  parsePageSettings,
  applyDocGridLinePitch,
} from "./sectionProperties.js";
import { parseParagraphNodes } from "./paragraphs.js";
import { parseTableNode } from "./tables.js";
import { parseHeaderFooterXml } from "./headerFooter.js";

export type DocxImportStage =
  | "opening-docx"
  | "parsing-document"
  | "parsing-headers-footers";

export interface ImportDocxToEditorDocumentOptions {
  onProgress?: (stage: DocxImportStage, progress?: number) => void;
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
  const relsMap = parseRelationshipsXml(relsXml);

  const numberingXml = (await zip.file("word/numbering.xml")?.async("string")) ?? null;
  const numberingMaps = parseNumbering(numberingXml);
  const settingsXml = (await zip.file("word/settings.xml")?.async("string")) ?? null;
  const docSettings = parseSettings(settingsXml);
  const stylesXml = (await zip.file("word/styles.xml")?.async("string")) ?? null;
  const themeXml = (await zip.file("word/theme/theme1.xml")?.async("string")) ?? null;
  const themeFonts = parseThemeFonts(themeXml);
  const importedStyles = parseImportedStyles(stylesXml, themeFonts);
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
    if (pendingPageBreakBefore) {
      block.style = { ...(block.style ?? {}), pageBreakBefore: true };
      pendingPageBreakBefore = false;
    }
    sectionBlocks[sectionBlocks.length - 1]!.push(block);
  };

  // Count total body work items for progress tracking
  let totalBodyWorkItems = 0;
  for (let index = 0; index < body.childNodes.length; index += 1) {
    const node = body.childNodes[index];
    if (node?.nodeType === node.ELEMENT_NODE) {
      const element = node as XmlElement;
      if (element.namespaceURI === WORD_NS && element.localName !== "sectPr") {
        totalBodyWorkItems += 1;
      }
    }
  }
  let completedBodyWorkItems = 0;

  const reportBodyProgress = () => {
    completedBodyWorkItems += 1;
    if (totalBodyWorkItems > 0) {
      options.onProgress?.("parsing-document", completedBodyWorkItems / totalBodyWorkItems);
    }
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
      const parsedParagraph = await parseParagraphNodes(element, numberingMaps, zip, relsMap, assets, themeFonts);
      for (const paragraph of parsedParagraph.paragraphs) {
        appendBodyBlock(paragraph);
      }
      if (parsedParagraph.pageBreakAfter) {
        pendingPageBreakBefore = true;
      }
      reportBodyProgress();
    } else if (element.localName === "tbl") {
      appendBodyBlock(await parseTableNode(element, numberingMaps, zip, relsMap, assets, themeFonts, importedStyles));
      reportBodyProgress();
    }

    // Yield to event loop every 50 items so progress messages are delivered
    await yieldToEventLoop(50, completedBodyWorkItems);
  }

  // Ensure at least one section
  if (sectionProps.length === 0) {
    const defaultSectionProperties = getFirstChildByTagNameNS(body, WORD_NS, "sectPr");
    sectionProps.push(
      defaultSectionProperties
        ? parseSectionProperties(defaultSectionProperties)
        : {
            pageSettings: parsePageSettings(body),
            headerRIds: {},
            footerRIds: {},
          },
    );
  }

  // Build sections with headers/footers
  options.onProgress?.("parsing-headers-footers");
  const sections: EditorSection[] = [];
  const hasHeaderFooterReferences = (props: SectionProperties) =>
    Object.keys(props.headerRIds).length > 0 || Object.keys(props.footerRIds).length > 0;
  const totalSectionsWithHeaders = sectionProps.filter(hasHeaderFooterReferences).length;
  let processedSections = 0;

  const reportHeaderFooterProgress = () => {
    processedSections += 1;
    if (totalSectionsWithHeaders > 0) {
      options.onProgress?.("parsing-headers-footers", processedSections / totalSectionsWithHeaders);
    }
  };

  for (let i = 0; i < sectionProps.length; i += 1) {
    const props = sectionProps[i]!;
    const blocks = sectionBlocks[i] ?? [];
    applyDocGridLinePitch(
      blocks,
      props.docGridLinePitchPx,
      props.docGridMode,
      props.docGridType,
      docSettings,
    );

    const loadHeaderFooterBlocks = async (rId: string | undefined) => {
      if (!rId) {
        return [];
      }
      const target = relsMap.get(rId);
      if (!target) {
        return [];
      }
      let zipPath = target.startsWith("/") ? target.slice(1) : target;
      if (!zipPath.startsWith("word/")) zipPath = `word/${target}`;
      const xml = await zip.file(zipPath)?.async("string");
      const partRelsMap = await loadPartRelationships(zip, zipPath);
      const partBlocks = await parseHeaderFooterXml(xml ?? null, numberingMaps, zip, partRelsMap, assets, themeFonts, importedStyles);
      applyDocGridLinePitch(
        partBlocks,
        props.docGridLinePitchPx,
        props.docGridMode,
        props.docGridType,
        docSettings,
      );
      return partBlocks;
    };

    const header = await loadHeaderFooterBlocks(props.headerRIds.default);
    const firstPageHeader = await loadHeaderFooterBlocks(props.headerRIds.first);
    const evenPageHeader = await loadHeaderFooterBlocks(props.headerRIds.even);
    const footer = await loadHeaderFooterBlocks(props.footerRIds.default);
    const firstPageFooter = await loadHeaderFooterBlocks(props.footerRIds.first);
    const evenPageFooter = await loadHeaderFooterBlocks(props.footerRIds.even);

    if (hasHeaderFooterReferences(props)) {
      reportHeaderFooterProgress();
    }

    // Yield to event loop every 2 sections so progress messages are delivered
    await yieldToEventLoop(2, processedSections);

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
      firstPageHeader: firstPageHeader.length > 0 ? firstPageHeader : undefined,
      evenPageHeader: evenPageHeader.length > 0 ? evenPageHeader : undefined,
      footer: footer.length > 0 ? footer : undefined,
      firstPageFooter: firstPageFooter.length > 0 ? firstPageFooter : undefined,
      evenPageFooter: evenPageFooter.length > 0 ? evenPageFooter : undefined,
    });
  }

  const shouldPreserveSections =
    sections.length > 1 ||
    sections.some((section) =>
      (section.header?.length ?? 0) > 0 ||
      (section.firstPageHeader?.length ?? 0) > 0 ||
      (section.evenPageHeader?.length ?? 0) > 0 ||
      (section.footer?.length ?? 0) > 0 ||
      (section.firstPageFooter?.length ?? 0) > 0 ||
      (section.evenPageFooter?.length ?? 0) > 0
    );

  const hasAssets = Object.keys(assets.assets).length > 0;

  if (shouldPreserveSections) {
    const doc = createEditorDocument([]);
    (doc as any).sections = sections;
    if (sections.length === 1) {
      doc.pageSettings = sections[0]!.pageSettings;
    }
    if (importedStyles) {
      doc.styles = importedStyles;
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
  if (importedStyles) {
    doc.styles = importedStyles;
  }
  return doc;
}
