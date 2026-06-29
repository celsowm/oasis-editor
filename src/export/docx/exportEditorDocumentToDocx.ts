import JSZip from "jszip";
import type { EditorBlockNode, EditorDocument } from "@/core/model.js";
import { getDocumentSections, resolveImageSrc } from "@/core/model.js";
import { EMU_PER_PX } from "@/core/units.js";
import { imageExtensionFromMime } from "@/utils/imageFormats.js";
import type {
  DocContext,
  ExportBuildState,
  NumberingContext,
  PartDefinition,
  SectionReferenceDefinition,
} from "./docxTypes.js";
import { buildBookmarkExportPlan } from "./bookmarksXml.js";
import {
  buildCommentExportPlan,
  buildCommentsPartXml,
  buildCommentsExtendedPartXml,
} from "./commentsXml.js";
import {
  buildFootnoteIdMap,
  buildFootnotesXml,
  collectReferencedFootnotesForExport,
  type ReferencedFootnote,
} from "./footnotesXml.js";
import {
  buildEndnoteIdMap,
  buildEndnotesXml,
  collectReferencedEndnotesForExport,
  type ReferencedEndnote,
} from "./endnotesXml.js";
import { buildStylesXml } from "./stylesXml.js";
import {
  buildContentTypesXml,
  buildRootRelationshipsXml,
  buildDocumentRelationshipsXml,
  buildSettingsXml,
  buildPartRelationshipsXml,
  buildFontTableXml,
} from "./docxPackageXml.js";
import { buildNumberingContext, buildNumberingXml } from "./docxNumbering.js";
import { visitBlocks } from "./docxBlockVisitor.js";
import { buildDocumentXml, buildHeaderFooterXml } from "./docxDocumentXml.js";
import { renumberImageCaptionsInDocument } from "@/core/document/imageCaptions.js";

function buildPartContext(
  blocks: EditorBlockNode[],
  numberingContext: NumberingContext,
  state: ExportBuildState,
  document: EditorDocument,
): DocContext {
  const images: DocContext["images"] = [];
  const imageMap = new Map<string, string>();
  const textBoxDocPrIds = new Map<string, number>();
  const hyperlinks: Array<{ rId: string; href: string }> = [];
  const hyperlinkMap = new Map<string, string>();

  visitBlocks(blocks, (paragraph) => {
    for (const run of paragraph.runs) {
      const link = run.styles?.link;
      if (link && !link.startsWith("#") && !hyperlinkMap.has(link)) {
        const rId = `rIdLink${hyperlinks.length + 1}`;
        hyperlinkMap.set(link, rId);
        hyperlinks.push({ rId, href: link });
      }

      if (run.kind === "textBox" && !textBoxDocPrIds.has(run.id)) {
        textBoxDocPrIds.set(run.id, state.nextTextBoxDocPrId);
        state.nextTextBoxDocPrId += 1;
      }

      if (run.kind !== "image") {
        continue;
      }

      const imageNumber = state.nextImageId;
      const rId = `rIdImg${imageNumber}`;
      const common = {
        rId,
        runId: run.id,
        cx: Math.round(run.image.width * EMU_PER_PX),
        cy: Math.round(run.image.height * EMU_PER_PX),
        alt: run.image.alt,
        crop: run.image.crop,
        fillMode: run.image.fillMode,
        rotation: run.image.rotation,
        flipH: run.image.flipH,
        flipV: run.image.flipV,
        floating: run.image.floating,
        wrapPolygon: run.image.wrapPolygon,
      };

      if (run.image.linkedSrc) {
        images.push({
          ...common,
          kind: "linked",
          target: run.image.linkedSrc,
        });
        imageMap.set(run.id, rId);
        state.nextImageId += 1;
        continue;
      }

      // Image src may be an "asset:<id>" reference into the document's
      // asset registry — resolve it to the actual data URL before parsing.
      const resolvedSrc = resolveImageSrc(document, run.image.src);
      const match = resolvedSrc.match(/^data:([^;,]+);base64,(.*)$/);
      if (!match) {
        continue;
      }
      const ext = imageExtensionFromMime(match[1]!);
      if (!ext) {
        // Unsupported image MIME type: skip rather than emit an invalid part.
        continue;
      }

      const base64 = match[2];
      const target = `media/image${imageNumber}.${ext}`;
      images.push({
        ...common,
        kind: "embedded",
        target,
        base64,
      });
      imageMap.set(run.id, rId);
      state.nextImageId += 1;
    }
  });

  return {
    numberingInfo: numberingContext.numberingInfo,
    definitions: numberingContext.definitions,
    images,
    imageMap,
    textBoxDocPrIds,
    hyperlinks,
    hyperlinkMap,
  };
}

// Writes a notes part (footnotes or endnotes) and its relationships file when
// images or hyperlinks are present. Avoids duplicating the identical block for
// footnotes and endnotes inside exportEditorDocumentToDocx.
function writeNotePart(
  zip: JSZip,
  partName: string,
  part: { xml: string; partContext: DocContext } | null,
): void {
  if (!part) return;
  zip.file(`word/${partName}.xml`, part.xml);
  if (
    part.partContext.images.length > 0 ||
    part.partContext.hyperlinks.length > 0
  ) {
    zip.file(
      `word/_rels/${partName}.xml.rels`,
      buildPartRelationshipsXml(
        part.partContext.images,
        part.partContext.hyperlinks,
      ),
    );
  }
}

export async function exportEditorDocumentToDocx(
  document: EditorDocument,
): Promise<ArrayBuffer> {
  document = renumberImageCaptionsInDocument(document);
  const zip = new JSZip();
  const numberingContext = buildNumberingContext(document);
  const buildState: ExportBuildState = {
    nextImageId: 1,
    // High base so text-box docPr ids never collide with image docPr ids.
    nextTextBoxDocPrId: 1000001,
  };
  const sections = getDocumentSections(document);

  // Footnotes: assign DOCX `w:id` values in reading order so reference runs
  // and body entries stay in sync. Bodies that aren't referenced are dropped.
  const referencedFootnotes: ReferencedFootnote[] =
    collectReferencedFootnotesForExport(document);
  const footnoteIdMap = buildFootnoteIdMap(referencedFootnotes);
  const hasFootnotes = referencedFootnotes.length > 0;

  // Endnotes: same id-assignment discipline as footnotes, but written to a
  // separate `word/endnotes.xml` part.
  const referencedEndnotes: ReferencedEndnote[] =
    collectReferencedEndnotesForExport(document);
  const endnoteIdMap = buildEndnoteIdMap(referencedEndnotes);
  const hasEndnotes = referencedEndnotes.length > 0;

  // Bookmarks: assign deterministic w:ids once and share the per-paragraph
  // event map across body and header/footer contexts (paragraph ids are unique).
  const bookmarkEvents = buildBookmarkExportPlan(document);
  // Comments: same id-assignment + per-paragraph event sharing as bookmarks.
  const commentPlan = buildCommentExportPlan(document);

  // Stamp the shared cross-part references (footnote/endnote id maps, bookmark
  // and comment event maps) onto a context produced by buildPartContext.
  const annotateContext = (ctx: DocContext): DocContext => {
    ctx.footnoteIdMap = footnoteIdMap;
    ctx.endnoteIdMap = endnoteIdMap;
    ctx.bookmarkEventsByParagraph = bookmarkEvents;
    ctx.commentEventsByParagraph = commentPlan?.eventsByParagraph;
    return ctx;
  };

  const bodyContext = annotateContext(
    buildPartContext(
      sections.flatMap((section) => section.blocks),
      numberingContext,
      buildState,
      document,
    ),
  );
  const hasComments = commentPlan !== undefined;
  const parts: PartDefinition[] = [];
  const sectionReferences: SectionReferenceDefinition[] = sections.map(
    () => ({}),
  );
  let nextHeaderIndex = 1;
  let nextFooterIndex = 1;

  sections.forEach((section, sectionIndex) => {
    const addPart = (
      kind: "header" | "footer",
      type: "default" | "first" | "even",
      blocks: EditorBlockNode[] | undefined,
    ) => {
      if (!blocks || blocks.length === 0) {
        return;
      }
      const partIndex = kind === "header" ? nextHeaderIndex : nextFooterIndex;
      const relPrefix = kind === "header" ? "Header" : "Footer";
      const path = `${kind}${partIndex}.xml`;
      const relId = `rId${relPrefix}${partIndex}`;
      // Footnote/endnote references in headers/footers must use the same
      // numeric ids as the body so they resolve to the correct note bodies.
      const context = annotateContext(
        buildPartContext(blocks, numberingContext, buildState, document),
      );
      parts.push({
        kind,
        type,
        path,
        relId,
        blocks,
        context,
      });
      const referenceKey = kind === "header" ? "header" : "footer";
      (sectionReferences[sectionIndex]![referenceKey] ??= {})[type] = { relId };
      if (kind === "header") {
        nextHeaderIndex += 1;
      } else {
        nextFooterIndex += 1;
      }
    };

    addPart("header", "first", section.firstPageHeader);
    addPart("header", "even", section.evenPageHeader);
    addPart("header", "default", section.header);
    addPart("footer", "first", section.firstPageFooter);
    addPart("footer", "even", section.evenPageFooter);
    addPart("footer", "default", section.footer);
  });

  const hasNumbering = numberingContext.definitions.length > 0;
  const hasEvenAndOddHeaders = sections.some(
    (section) =>
      (section.evenPageHeader?.length ?? 0) > 0 ||
      (section.evenPageFooter?.length ?? 0) > 0,
  );
  const hasDocumentSettings =
    hasEvenAndOddHeaders ||
    document.settings?.defaultTabStop !== undefined ||
    document.settings?.allowSpaceOfSameStyleInTable !== undefined ||
    document.settings?.autoHyphenation !== undefined ||
    document.settings?.consecutiveHyphenLimit !== undefined ||
    document.settings?.hyphenationZone !== undefined ||
    document.settings?.doNotHyphenateCaps !== undefined ||
    document.footnotes?.settings !== undefined ||
    document.endnotes?.settings !== undefined;
  const allImages = [
    ...bodyContext.images,
    ...parts.flatMap((part) => part.context.images),
  ];
  // Build the footnotes part XML now so its image/hyperlink registry can be
  // merged into `allImages` (binaries are written to the same `word/media/`).
  const footnotesPart = hasFootnotes
    ? buildFootnotesXml(
        document,
        referencedFootnotes,
        numberingContext,
        buildState,
        (blocks) =>
          buildPartContext(blocks, numberingContext, buildState, document),
        document.styles,
        footnoteIdMap,
      )
    : null;
  if (footnotesPart) {
    allImages.push(...footnotesPart.partContext.images);
  }
  const endnotesPart = hasEndnotes
    ? buildEndnotesXml(
        document,
        referencedEndnotes,
        numberingContext,
        buildState,
        (blocks) =>
          buildPartContext(blocks, numberingContext, buildState, document),
        document.styles,
        endnoteIdMap,
      )
    : null;
  if (endnotesPart) {
    allImages.push(...endnotesPart.partContext.images);
  }
  const imageExtensions = allImages
    .filter((img) => img.kind === "embedded")
    .map((img) => img.target.split(".").pop()?.toLowerCase())
    .filter((ext): ext is string => Boolean(ext));

  const hasStyles =
    document.styles != null && Object.keys(document.styles).length > 0;
  const hasFontTable = (document.fontTable?.length ?? 0) > 0;

  zip.file(
    "[Content_Types].xml",
    buildContentTypesXml(
      hasNumbering,
      imageExtensions,
      hasDocumentSettings,
      parts,
      hasFootnotes,
      hasEndnotes,
      hasStyles,
      hasComments,
      hasFontTable,
    ),
  );
  zip.file("_rels/.rels", buildRootRelationshipsXml());
  zip.file(
    "word/document.xml",
    buildDocumentXml(document, bodyContext, sectionReferences),
  );

  if (hasStyles) {
    zip.file("word/styles.xml", buildStylesXml(document.styles!));
  }

  if (hasNumbering) {
    zip.file(
      "word/numbering.xml",
      buildNumberingXml(numberingContext.definitions),
    );
  }

  if (
    hasStyles ||
    hasNumbering ||
    hasDocumentSettings ||
    bodyContext.images.length > 0 ||
    bodyContext.hyperlinks.length > 0 ||
    parts.length > 0 ||
    hasFootnotes ||
    hasEndnotes ||
    hasComments ||
    hasFontTable
  ) {
    zip.file(
      "word/_rels/document.xml.rels",
      buildDocumentRelationshipsXml(
        hasNumbering,
        hasDocumentSettings,
        bodyContext.images,
        bodyContext.hyperlinks,
        parts,
        hasFootnotes,
        hasEndnotes,
        hasStyles,
        hasComments,
        hasFontTable,
      ),
    );
  }

  if (hasFontTable) {
    zip.file("word/fontTable.xml", buildFontTableXml(document.fontTable!));
  }

  if (hasDocumentSettings) {
    zip.file(
      "word/settings.xml",
      buildSettingsXml(
        hasEvenAndOddHeaders,
        document.settings?.defaultTabStop,
        document.footnotes?.settings,
        document.endnotes?.settings,
        document.settings?.allowSpaceOfSameStyleInTable,
        {
          autoHyphenation: document.settings?.autoHyphenation,
          consecutiveHyphenLimit: document.settings?.consecutiveHyphenLimit,
          hyphenationZone: document.settings?.hyphenationZone,
          doNotHyphenateCaps: document.settings?.doNotHyphenateCaps,
        },
      ),
    );
  }

  for (const part of parts) {
    zip.file(
      `word/${part.path}`,
      buildHeaderFooterXml(
        part.kind,
        part.blocks,
        part.context,
        document.styles,
      ),
    );
    if (part.context.images.length > 0 || part.context.hyperlinks.length > 0) {
      zip.file(
        `word/_rels/${part.path}.rels`,
        buildPartRelationshipsXml(part.context.images, part.context.hyperlinks),
      );
    }
  }

  writeNotePart(zip, "footnotes", footnotesPart);
  writeNotePart(zip, "endnotes", endnotesPart);

  if (commentPlan) {
    zip.file("word/comments.xml", buildCommentsPartXml(commentPlan));
    zip.file(
      "word/commentsExtended.xml",
      buildCommentsExtendedPartXml(commentPlan),
    );
  }

  for (const img of allImages) {
    if (img.kind === "embedded" && img.base64) {
      zip.file(`word/${img.target}`, img.base64, { base64: true });
    }
  }

  return zip.generateAsync({ type: "arraybuffer" });
}

export async function exportEditorDocumentToDocxBlob(
  document: EditorDocument,
): Promise<Blob> {
  const buffer = await exportEditorDocumentToDocx(document);
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
