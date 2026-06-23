import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorDropCap,
  EditorSection,
  EditorTextRun,
} from "@/core/model.js";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import { normalizePageSettings } from "@/core/model.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  yieldToEventLoop,
} from "./xmlHelpers.js";
import { createAssetRegistry } from "./assetRegistry.js";
import {
  parseRelationshipsXml,
  loadPartRelationships,
} from "./relationships.js";
import { parseDocxTheme } from "./theme.js";
import { parseSettings } from "./settings.js";
import { parseNumbering } from "./numbering.js";
import { parseImportedStyles } from "./stylesXml.js";
import {
  type SectionProperties,
  parseSectionProperties,
  parsePageSettings,
  applyDocGridLinePitch,
} from "./sectionProperties.js";
import { parseParagraphNodes } from "./paragraphs.js";
import { parseTableNode } from "./tables.js";
import { createNestedBlockParser } from "./nestedBlocks.js";
import { parseHeaderFooterXml } from "./headerFooter.js";
import { parseFootnotesXml } from "./footnotes.js";
import { parseEndnotesXml } from "./endnotes.js";
import { renumberFootnotes } from "@/core/footnotes.js";
import { renumberEndnotes } from "@/core/endnotes.js";
import { extractBookmarksFromSections } from "./bookmarks.js";
import { extractCommentRangesFromSections } from "./comments.js";
import { parseCommentsXml } from "./commentsXml.js";
import { createEditorCommentId } from "@/core/editorState.js";
import type { EditorComments } from "@/core/model.js";

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

  const relsXml = await zip
    .file("word/_rels/document.xml.rels")
    ?.async("string");
  const relsMap = parseRelationshipsXml(relsXml);

  const numberingXml =
    (await zip.file("word/numbering.xml")?.async("string")) ?? null;
  const numberingMaps = parseNumbering(numberingXml);
  const settingsXml =
    (await zip.file("word/settings.xml")?.async("string")) ?? null;
  const docSettings = parseSettings(settingsXml);
  const stylesXml =
    (await zip.file("word/styles.xml")?.async("string")) ?? null;
  const themeXml =
    (await zip.file("word/theme/theme1.xml")?.async("string")) ?? null;
  const theme = parseDocxTheme(themeXml);
  const importedStyles = parseImportedStyles(stylesXml, theme);
  options.onProgress?.("parsing-document");
  const document = new DOMParser().parseFromString(
    documentXml,
    "application/xml",
  );
  const body = document.getElementsByTagNameNS(WORD_NS, "body")[0];

  if (!body) {
    return createEditorDocument([
      createEditorParagraphFromRuns([{ text: "" }]),
    ]);
  }

  // Single registry shared across body, headers and footers so identical
  // images referenced from multiple places dedupe to one stored payload.
  const assets = createAssetRegistry();

  // Parse body into sections separated by sectPr elements
  const sectionProps: SectionProperties[] = [];
  const sectionBlocks: EditorBlockNode[][] = [[]];
  let pendingPageBreakBefore = false;
  let pendingDropCap: EditorDropCap | null = null;

  const appendBodyBlock = (block: EditorBlockNode) => {
    if (pendingPageBreakBefore) {
      block.style = { ...(block.style ?? {}), pageBreakBefore: true };
      pendingPageBreakBefore = false;
    }
    if (pendingDropCap && block.type === "paragraph") {
      block.dropCap = pendingDropCap;
      pendingDropCap = null;
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
      options.onProgress?.(
        "parsing-document",
        completedBodyWorkItems / totalBodyWorkItems,
      );
    }
  };

  const parseNestedBlocks = createNestedBlockParser(
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
  );

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
      const parsedParagraph = await parseParagraphNodes(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
        parseNestedBlocks,
      );
      for (const paragraph of parsedParagraph.paragraphs) {
        appendBodyBlock(paragraph);
      }
      if (parsedParagraph.dropCapFrame) {
        pendingDropCap = parsedParagraph.dropCapFrame;
      }
      if (parsedParagraph.pageBreakAfter) {
        pendingPageBreakBefore = true;
      }
      reportBodyProgress();
    } else if (element.localName === "tbl") {
      appendBodyBlock(
        await parseTableNode(
          element,
          numberingMaps,
          zip,
          relsMap,
          assets,
          theme,
          parseNestedBlocks,
          importedStyles,
        ),
      );
      reportBodyProgress();
    }

    // Yield to event loop every 50 items so progress messages are delivered
    await yieldToEventLoop(50, completedBodyWorkItems);
  }

  // Ensure at least one section
  if (sectionProps.length === 0) {
    const defaultSectionProperties = getFirstChildByTagNameNS(
      body,
      WORD_NS,
      "sectPr",
    );
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
    Object.keys(props.headerRIds).length > 0 ||
    Object.keys(props.footerRIds).length > 0;
  const totalSectionsWithHeaders = sectionProps.filter(
    hasHeaderFooterReferences,
  ).length;
  let processedSections = 0;

  const reportHeaderFooterProgress = () => {
    processedSections += 1;
    if (totalSectionsWithHeaders > 0) {
      options.onProgress?.(
        "parsing-headers-footers",
        processedSections / totalSectionsWithHeaders,
      );
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
      const partBlocks = await parseHeaderFooterXml(
        xml ?? null,
        numberingMaps,
        zip,
        partRelsMap,
        assets,
        theme,
        importedStyles,
      );
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
    const firstPageHeader = await loadHeaderFooterBlocks(
      props.headerRIds.first,
    );
    const evenPageHeader = await loadHeaderFooterBlocks(props.headerRIds.even);
    const footer = await loadHeaderFooterBlocks(props.footerRIds.default);
    const firstPageFooter = await loadHeaderFooterBlocks(
      props.footerRIds.first,
    );
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
    const pageSettings = normalizePageSettings(rawPageSettings);

    sections.push({
      id: `section:${i + 1}`,
      blocks:
        blocks.length > 0
          ? blocks
          : [createEditorParagraphFromRuns([{ text: "" }])],
      pageSettings,
      header: header.length > 0 ? header : undefined,
      firstPageHeader: firstPageHeader.length > 0 ? firstPageHeader : undefined,
      evenPageHeader: evenPageHeader.length > 0 ? evenPageHeader : undefined,
      footer: footer.length > 0 ? footer : undefined,
      firstPageFooter: firstPageFooter.length > 0 ? firstPageFooter : undefined,
      evenPageFooter: evenPageFooter.length > 0 ? evenPageFooter : undefined,
    });
  }

  // Footnotes: parse `word/footnotes.xml` (if present) and remap inline
  // references inside the body/header/footer paragraphs from the transient
  // `__importedFootnoteRef` marker to the editor's `run.footnoteReference`.
  const footnotesXml =
    (await zip.file("word/footnotes.xml")?.async("string")) ?? null;
  const footnotesPartRels = footnotesXml
    ? await loadPartRelationships(zip, "word/footnotes.xml")
    : new Map<string, string>();
  const parsedFootnotes = await parseFootnotesXml(
    footnotesXml,
    numberingMaps,
    zip,
    footnotesPartRels,
    assets,
    theme,
    importedStyles,
  );
  if (docSettings.footnoteSettings) {
    parsedFootnotes.footnotes.settings = docSettings.footnoteSettings;
  }
  const editorFootnotes =
    Object.keys(parsedFootnotes.footnotes.items).length > 0 ||
    parsedFootnotes.footnotes.separator ||
    parsedFootnotes.footnotes.continuationSeparator ||
    parsedFootnotes.footnotes.settings
      ? parsedFootnotes.footnotes
      : undefined;

  remapImportedFootnoteRefsInSections(sections, parsedFootnotes.byDocxId);

  // Endnotes: parse `word/endnotes.xml` (if present) and remap inline
  // references from the transient `__importedEndnoteRef` marker to the
  // editor's `run.endnoteReference`.
  const endnotesXml =
    (await zip.file("word/endnotes.xml")?.async("string")) ?? null;
  const endnotesPartRels = endnotesXml
    ? await loadPartRelationships(zip, "word/endnotes.xml")
    : new Map<string, string>();
  const parsedEndnotes = await parseEndnotesXml(
    endnotesXml,
    numberingMaps,
    zip,
    endnotesPartRels,
    assets,
    theme,
    importedStyles,
  );
  if (docSettings.endnoteSettings) {
    parsedEndnotes.endnotes.settings = docSettings.endnoteSettings;
  }
  const editorEndnotes =
    Object.keys(parsedEndnotes.endnotes.items).length > 0 ||
    parsedEndnotes.endnotes.separator ||
    parsedEndnotes.endnotes.continuationSeparator ||
    parsedEndnotes.endnotes.settings
      ? parsedEndnotes.endnotes
      : undefined;

  remapImportedEndnoteRefsInSections(sections, parsedEndnotes.byDocxId);

  // Bookmarks: extract the transient `__importedBookmark` markers into a
  // document-level registry and strip the zero-length marker runs. Must run
  // after section paragraphs exist (anchors reference paragraph ids).
  const editorBookmarks = extractBookmarksFromSections(sections);

  // Comments: pair the `__importedComment` range markers (start/end anchors)
  // with the comment bodies in `word/comments.xml` (+ resolved flags in
  // `word/commentsExtended.xml`) into a document-level registry.
  const commentRanges = extractCommentRangesFromSections(sections);
  const commentsXml =
    (await zip.file("word/comments.xml")?.async("string")) ?? null;
  const commentsExtendedXml =
    (await zip.file("word/commentsExtended.xml")?.async("string")) ?? null;
  const commentBodies = parseCommentsXml(commentsXml, commentsExtendedXml);
  const editorComments = buildEditorComments(commentRanges, commentBodies);

  const shouldPreserveSections =
    sections.length > 1 ||
    sections.some(
      (section) =>
        (section.header?.length ?? 0) > 0 ||
        (section.firstPageHeader?.length ?? 0) > 0 ||
        (section.evenPageHeader?.length ?? 0) > 0 ||
        (section.footer?.length ?? 0) > 0 ||
        (section.firstPageFooter?.length ?? 0) > 0 ||
        (section.evenPageFooter?.length ?? 0) > 0,
    );

  const hasAssets = Object.keys(assets.assets).length > 0;

  const finalize = (doc: EditorDocument): EditorDocument => {
    if (docSettings.defaultTabStop !== undefined) {
      doc.settings = {
        ...(doc.settings ?? {}),
        defaultTabStop: docSettings.defaultTabStop,
      };
    }
    if (docSettings.allowSpaceOfSameStyleInTable) {
      doc.settings = {
        ...(doc.settings ?? {}),
        allowSpaceOfSameStyleInTable: true,
      };
    }
    if (docSettings.autoHyphenation) {
      doc.settings = {
        ...(doc.settings ?? {}),
        autoHyphenation: true,
      };
    }
    if (docSettings.doNotHyphenateCaps) {
      doc.settings = {
        ...(doc.settings ?? {}),
        doNotHyphenateCaps: true,
      };
    }
    if (docSettings.consecutiveHyphenLimit !== undefined) {
      doc.settings = {
        ...(doc.settings ?? {}),
        consecutiveHyphenLimit: docSettings.consecutiveHyphenLimit,
      };
    }
    if (docSettings.hyphenationZone !== undefined) {
      doc.settings = {
        ...(doc.settings ?? {}),
        hyphenationZone: docSettings.hyphenationZone,
      };
    }
    let result = doc;
    if (editorFootnotes) {
      result.footnotes = editorFootnotes;
      // Materialize markers ("1", "2", ...) from references in document order
      // and prune any footnote body that ends up unreferenced.
      result = renumberFootnotes(result);
    }
    if (editorEndnotes) {
      result.endnotes = editorEndnotes;
      result = renumberEndnotes(result);
    }
    if (editorBookmarks) {
      result.bookmarks = editorBookmarks;
    }
    if (editorComments) {
      result.comments = editorComments;
    }
    return result;
  };

  if (shouldPreserveSections) {
    const doc = createEditorDocument([]);
    doc.sections = sections;
    if (sections.length === 1) {
      doc.pageSettings = sections[0]!.pageSettings;
    }
    if (importedStyles) {
      doc.styles = importedStyles;
    }
    if (hasAssets) {
      doc.assets = assets.assets;
    }
    return finalize(doc);
  }

  // Single section: use flat blocks for compatibility
  const singleSection = sections[0];
  const doc = createEditorDocument(
    singleSection?.blocks.length > 0
      ? singleSection.blocks
      : [createEditorParagraphFromRuns([{ text: "" }])],
    singleSection?.pageSettings,
  );
  if (hasAssets) {
    doc.assets = assets.assets;
  }
  if (importedStyles) {
    doc.styles = importedStyles;
  }
  return finalize(doc);
}

/**
 * Join comment range anchors (keyed by DOCX id) with the parsed comment bodies
 * into a document-level {@link EditorComments} registry. Comments are emitted in
 * DOCX-id numeric order for a deterministic registry. A comment with neither a
 * range nor a body is skipped; one with a body but no range is still kept so its
 * text survives the round-trip (Word tolerates a body-only comment).
 */
function buildEditorComments(
  ranges: Map<string, import("./comments.js").CommentRange>,
  bodies: Map<string, import("./commentsXml.js").ParsedCommentBody>,
): EditorComments | undefined {
  const docxIds = new Set<string>([...ranges.keys(), ...bodies.keys()]);
  if (docxIds.size === 0) {
    return undefined;
  }
  const sorted = [...docxIds].sort((a, b) => {
    const na = Number.parseInt(a, 10);
    const nb = Number.parseInt(b, 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      return a.localeCompare(b);
    }
    return na - nb;
  });

  const items: EditorComments["items"] = {};
  const order: string[] = [];
  for (const docxId of sorted) {
    const range = ranges.get(docxId);
    const body = bodies.get(docxId);
    if (!range && !body) {
      continue;
    }
    const id = createEditorCommentId();
    const docxIdNum = Number.parseInt(docxId, 10);
    items[id] = {
      id,
      author: body?.author ?? "",
      ...(body?.initials ? { initials: body.initials } : {}),
      ...(body?.date !== undefined ? { date: body.date } : {}),
      ...(body?.dateUtc !== undefined ? { dateUtc: body.dateUtc } : {}),
      ...(body?.resolved ? { resolved: body.resolved } : {}),
      text: body?.text ?? "",
      ...(range?.start ? { start: range.start } : {}),
      ...(range?.end ? { end: range.end } : {}),
      ...(Number.isNaN(docxIdNum) ? {} : { docxIdHint: docxIdNum }),
    };
    order.push(id);
  }

  return order.length > 0 ? { items, order } : undefined;
}

/**
 * Walk every paragraph in the sections and convert the transient
 * `__importedFootnoteRef` markers (left by `paragraphs.ts`) into proper
 * `run.footnoteReference` fields pointing to the local footnote ids.
 *
 * Runs that reference an unknown docxId are stripped of the marker so they
 * don't leak as fake references in the model.
 */
function remapImportedFootnoteRefsInSections(
  sections: EditorSection[],
  byDocxId: Map<string, import("@/core/model.js").EditorFootnote>,
): void {
  const remapBlock = (block: EditorBlockNode): void => {
    if (block.type === "paragraph") {
      block.runs.forEach((run, index) => {
        const runWithRef = run as EditorTextRun & {
          __importedFootnoteRef?: { docxId: string; customMark?: string };
        };
        const transient = runWithRef.__importedFootnoteRef;
        if (!transient) return;
        delete runWithRef.__importedFootnoteRef;
        const footnote = byDocxId.get(transient.docxId);
        if (!footnote) {
          // Dangling reference (unknown id). Drop the marker but keep the
          // (probably empty) run text so we don't blow up the paragraph.
          return;
        }
        // Replace the transient text run with a proper footnoteReference member.
        block.runs[index] = {
          id: run.id,
          text: run.text,
          styles: run.styles,
          revision: run.revision,
          kind: "footnoteReference",
          footnoteReference: {
            footnoteId: footnote.id,
            ...(transient.customMark
              ? { customMark: transient.customMark }
              : {}),
          },
        };
      });
      return;
    }
    for (const row of block.rows) {
      for (const cell of row.cells) {
        for (const p of cell.blocks) {
          remapBlock(p);
        }
      }
    }
  };

  for (const section of sections) {
    section.blocks.forEach(remapBlock);
    section.header?.forEach(remapBlock);
    section.firstPageHeader?.forEach(remapBlock);
    section.evenPageHeader?.forEach(remapBlock);
    section.footer?.forEach(remapBlock);
    section.firstPageFooter?.forEach(remapBlock);
    section.evenPageFooter?.forEach(remapBlock);
  }
}

/**
 * Endnote counterpart of {@link remapImportedFootnoteRefsInSections}: converts
 * the transient `__importedEndnoteRef` markers into proper
 * `run.endnoteReference` fields pointing to the local endnote ids.
 */
function remapImportedEndnoteRefsInSections(
  sections: EditorSection[],
  byDocxId: Map<string, import("@/core/model.js").EditorEndnote>,
): void {
  const remapBlock = (block: EditorBlockNode): void => {
    if (block.type === "paragraph") {
      block.runs.forEach((run, index) => {
        const runWithRef = run as EditorTextRun & {
          __importedEndnoteRef?: { docxId: string; customMark?: string };
        };
        const transient = runWithRef.__importedEndnoteRef;
        if (!transient) return;
        delete runWithRef.__importedEndnoteRef;
        const endnote = byDocxId.get(transient.docxId);
        if (!endnote) {
          // Dangling reference (unknown id). Drop the marker.
          return;
        }
        // Replace the transient text run with a proper endnoteReference member.
        block.runs[index] = {
          id: run.id,
          text: run.text,
          styles: run.styles,
          revision: run.revision,
          kind: "endnoteReference",
          endnoteReference: {
            endnoteId: endnote.id,
            ...(transient.customMark
              ? { customMark: transient.customMark }
              : {}),
          },
        };
      });
      return;
    }
    for (const row of block.rows) {
      for (const cell of row.cells) {
        for (const p of cell.blocks) {
          remapBlock(p);
        }
      }
    }
  };

  for (const section of sections) {
    section.blocks.forEach(remapBlock);
    section.header?.forEach(remapBlock);
    section.firstPageHeader?.forEach(remapBlock);
    section.evenPageHeader?.forEach(remapBlock);
    section.footer?.forEach(remapBlock);
    section.firstPageFooter?.forEach(remapBlock);
    section.evenPageFooter?.forEach(remapBlock);
  }
}
