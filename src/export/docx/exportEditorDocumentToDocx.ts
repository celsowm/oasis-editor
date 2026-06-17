import JSZip from "jszip";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorFootnoteSettings,
  EditorNamedStyle,
  EditorPageSettings,
  EditorParagraphListStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import { getDocumentSections, resolveImageSrc } from "@/core/model.js";
import {
  imageContentTypeDefaults,
  imageExtensionFromMime,
} from "@/utils/imageFormats.js";
import type {
  DocContext,
  ExportBuildState,
  NumberingContext,
  NumberingDefinition,
  PartDefinition,
  SectionReferenceDefinition,
} from "./docxTypes.js";
import { serializeBlocksXml } from "./textXml.js";
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
import {
  escapeXml,
  OFFICE_REL_NS,
  PACKAGE_REL_NS,
  pointsToTwips,
  pxToTwips,
  WORD14_NS,
  WORD_NS,
} from "./xmlUtils.js";
import { buildStylesXml } from "./stylesXml.js";
import { renumberImageCaptionsInDocument } from "@/core/document/imageCaptions.js";

const DOCUMENT_XMLNS =
  `xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" ` +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
  `xmlns:r="${OFFICE_REL_NS}"`;

function serializeSectionPropertiesWithReferences(
  pageSettings: EditorPageSettings,
  references?: SectionReferenceDefinition,
): string {
  const width = pxToTwips(pageSettings.width, 12240);
  const height = pxToTwips(pageSettings.height, 15840);
  const margins = pageSettings.margins;
  const orientationAttr =
    pageSettings.orientation === "landscape" ? ' w:orient="landscape"' : "";
  const referencesXml = [
    references?.header?.first
      ? `<w:headerReference w:type="first" r:id="${references.header.first.relId}"/>`
      : "",
    references?.header?.even
      ? `<w:headerReference w:type="even" r:id="${references.header.even.relId}"/>`
      : "",
    references?.header?.default
      ? `<w:headerReference w:type="default" r:id="${references.header.default.relId}"/>`
      : "",
    references?.footer?.first
      ? `<w:footerReference w:type="first" r:id="${references.footer.first.relId}"/>`
      : "",
    references?.footer?.even
      ? `<w:footerReference w:type="even" r:id="${references.footer.even.relId}"/>`
      : "",
    references?.footer?.default
      ? `<w:footerReference w:type="default" r:id="${references.footer.default.relId}"/>`
      : "",
  ].join("");
  const titlePageXml =
    references?.header?.first || references?.footer?.first
      ? "<w:titlePg/>"
      : "";

  return `<w:sectPr>${referencesXml}${titlePageXml}<w:pgSz w:w="${width}" w:h="${height}"${orientationAttr}/><w:pgMar w:top="${pxToTwips(margins.top, 1440)}" w:right="${pxToTwips(margins.right, 1440)}" w:bottom="${pxToTwips(margins.bottom, 1440)}" w:left="${pxToTwips(margins.left, 1440)}" w:header="${pxToTwips(margins.header, 720)}" w:footer="${pxToTwips(margins.footer, 720)}" w:gutter="${pxToTwips(margins.gutter, 0)}"/></w:sectPr>`;
}

function visitParagraphDeep(
  paragraph: EditorParagraphNode,
  callback: (paragraph: EditorParagraphNode) => void,
): void {
  callback(paragraph);
  // Recurse into text-box bodies so their inner content participates in
  // numbering definitions and image/hyperlink relationship registration.
  for (const run of paragraph.runs) {
    if (run.textBox) {
      visitBlocks(run.textBox.blocks, callback);
    }
  }
}

function visitBlocks(
  blocks: EditorBlockNode[],
  callback: (paragraph: EditorParagraphNode) => void,
): void {
  for (const block of blocks) {
    if (block.type === "paragraph") {
      visitParagraphDeep(block, callback);
      continue;
    }

    for (const row of block.rows) {
      for (const cell of row.cells) {
        for (const paragraph of cell.blocks) {
          visitParagraphDeep(paragraph, callback);
        }
      }
    }
  }
}

function buildNumberingContext(document: EditorDocument): NumberingContext {
  const numberingInfo = new Map<string, { numId: number; level: number }>();
  const definitionMap = new Map<
    string,
    { abstractNumId: number; numId: number }
  >();
  const definitions: NumberingDefinition[] = [];
  let nextAbstractNumId = 1;
  let nextNumId = 1;

  const traverseParagraph = (paragraph: EditorParagraphNode) => {
    if (!paragraph.list) {
      return;
    }

    const level = Math.max(0, paragraph.list.level ?? 0);
    // Include bulletGlyph in the key so distinct bullet styles get separate
    // numbering definitions rather than sharing a single one.
    const bulletGlyph = paragraph.list.bulletGlyph ?? "";
    const key = `${paragraph.list.kind}:${level}:${bulletGlyph}`;
    let definition = definitionMap.get(key);
    if (!definition) {
      definition = { abstractNumId: nextAbstractNumId++, numId: nextNumId++ };
      definitionMap.set(key, definition);
      definitions.push({
        kind: paragraph.list.kind,
        level,
        abstractNumId: definition.abstractNumId,
        numId: definition.numId,
        format: paragraph.list.format,
        startAt: paragraph.list.startAt,
        bulletGlyph: paragraph.list.bulletGlyph,
        bulletFont: paragraph.list.bulletFont,
      });
    }
    numberingInfo.set(paragraph.id, { numId: definition.numId, level });
  };

  for (const section of getDocumentSections(document)) {
    visitBlocks(section.blocks, traverseParagraph);
    if (section.header) {
      visitBlocks(section.header, traverseParagraph);
    }
    if (section.firstPageHeader) {
      visitBlocks(section.firstPageHeader, traverseParagraph);
    }
    if (section.evenPageHeader) {
      visitBlocks(section.evenPageHeader, traverseParagraph);
    }
    if (section.footer) {
      visitBlocks(section.footer, traverseParagraph);
    }
    if (section.firstPageFooter) {
      visitBlocks(section.firstPageFooter, traverseParagraph);
    }
    if (section.evenPageFooter) {
      visitBlocks(section.evenPageFooter, traverseParagraph);
    }
  }

  return { numberingInfo, definitions };
}

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

      if (run.textBox && !textBoxDocPrIds.has(run.id)) {
        textBoxDocPrIds.set(run.id, state.nextTextBoxDocPrId);
        state.nextTextBoxDocPrId += 1;
      }

      if (!run.image) {
        continue;
      }

      const imageNumber = state.nextImageId;
      const rId = `rIdImg${imageNumber}`;
      const common = {
        rId,
        runId: run.id,
        cx: Math.round(run.image.width * 9525),
        cy: Math.round(run.image.height * 9525),
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

function buildNumberingXml(definitions: NumberingDefinition[]): string {
  const abstractNums = definitions
    .map(
      ({
        kind,
        level,
        abstractNumId,
        format,
        startAt,
        bulletGlyph,
        bulletFont,
      }) => {
        const numFmtVal = kind === "bullet" ? "bullet" : (format ?? "decimal");
        const levelText =
          kind === "bullet" ? (bulletGlyph ?? "\uF0B7") : `%${level + 1}.`;
        const startVal = startAt ?? 1;
        const fontName =
          kind === "bullet" ? (bulletFont ?? "Symbol") : undefined;
        const runFonts = fontName
          ? `<w:rPr><w:rFonts w:ascii="${escapeXml(fontName)}" w:hAnsi="${escapeXml(fontName)}" w:hint="default"/></w:rPr>`
          : "";

        return `<w:abstractNum w:abstractNumId="${abstractNumId}"><w:lvl w:ilvl="${level}"><w:start w:val="${startVal}"/><w:numFmt w:val="${numFmtVal}"/><w:lvlText w:val="${escapeXml(levelText)}"/><w:lvlJc w:val="left"/>${runFonts}</w:lvl></w:abstractNum>`;
      },
    )
    .join("");

  const nums = definitions
    .map(
      ({ abstractNumId, numId }) =>
        `<w:num w:numId="${numId}"><w:abstractNumId w:val="${abstractNumId}"/></w:num>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${WORD_NS}">${abstractNums}${nums}</w:numbering>`;
}

function buildDocumentXml(
  document: EditorDocument,
  context: DocContext,
  sectionReferences: SectionReferenceDefinition[],
): string {
  const sections = getDocumentSections(document);

  const sectionsXml = sections
    .map((section, sectionIndex) => {
      const blocksXml = serializeBlocksXml(
        section.blocks,
        context,
        document.styles,
      );
      const sectionPr = serializeSectionPropertiesWithReferences(
        section.pageSettings,
        sectionReferences[sectionIndex],
      );
      return blocksXml + sectionPr;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${DOCUMENT_XMLNS}><w:body>${sectionsXml}</w:body></w:document>`;
}

function buildHeaderFooterXml(
  kind: "header" | "footer",
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const tag = kind === "header" ? "hdr" : "ftr";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${tag} ${DOCUMENT_XMLNS}>${serializeBlocksXml(blocks, context, styles)}</w:${tag}>`;
}

function buildContentTypesXml(
  hasNumbering: boolean,
  imageExtensions: Iterable<string>,
  hasSettings: boolean,
  parts: PartDefinition[],
  hasFootnotes: boolean,
  hasEndnotes: boolean,
  hasStyles: boolean,
  hasComments: boolean,
): string {
  const overrides = parts
    .map((part) => {
      const contentType =
        part.kind === "header"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";
      return `<Override PartName="/word/${part.path}" ContentType="${contentType}"/>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageContentTypeDefaults(
    imageExtensions,
  )}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${
    hasStyles
      ? '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      : ""
  }${
    hasNumbering
      ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
      : ""
  }${
    hasSettings
      ? '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
      : ""
  }${
    hasFootnotes
      ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>'
      : ""
  }${
    hasEndnotes
      ? '<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>'
      : ""
  }${
    hasComments
      ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' +
        '<Override PartName="/word/commentsExtended.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml"/>'
      : ""
  }${overrides}</Types>`;
}

function buildRootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`;
}

function buildDocumentRelationshipsXml(
  hasNumbering: boolean,
  hasSettings: boolean,
  images: DocContext["images"],
  hyperlinks: DocContext["hyperlinks"],
  parts: PartDefinition[],
  hasFootnotes: boolean,
  hasEndnotes: boolean,
  hasStyles: boolean,
  hasComments: boolean,
): string {
  let rels = "";
  if (hasStyles)
    rels += `<Relationship Id="rIdStyles" Type="${OFFICE_REL_NS}/styles" Target="styles.xml"/>`;
  if (hasNumbering)
    rels += `<Relationship Id="rIdNum" Type="${OFFICE_REL_NS}/numbering" Target="numbering.xml"/>`;
  if (hasSettings)
    rels += `<Relationship Id="rIdSettings" Type="${OFFICE_REL_NS}/settings" Target="settings.xml"/>`;
  for (const hyperlink of hyperlinks) {
    rels += `<Relationship Id="${hyperlink.rId}" Type="${OFFICE_REL_NS}/hyperlink" Target="${escapeXml(hyperlink.href)}" TargetMode="External"/>`;
  }
  for (const img of images) {
    const targetMode = img.kind === "linked" ? ' TargetMode="External"' : "";
    rels += `<Relationship Id="${img.rId}" Type="${OFFICE_REL_NS}/image" Target="${escapeXml(img.target)}"${targetMode}/>`;
  }
  for (const part of parts) {
    const relType = part.kind === "header" ? "header" : "footer";
    rels += `<Relationship Id="${part.relId}" Type="${OFFICE_REL_NS}/${relType}" Target="${part.path}"/>`;
  }
  if (hasFootnotes) {
    rels += `<Relationship Id="rIdFootnotes" Type="${OFFICE_REL_NS}/footnotes" Target="footnotes.xml"/>`;
  }
  if (hasEndnotes) {
    rels += `<Relationship Id="rIdEndnotes" Type="${OFFICE_REL_NS}/endnotes" Target="endnotes.xml"/>`;
  }
  if (hasComments) {
    rels += `<Relationship Id="rIdComments" Type="${OFFICE_REL_NS}/comments" Target="comments.xml"/>`;
    rels += `<Relationship Id="rIdCommentsExtended" Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended" Target="commentsExtended.xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${rels}</Relationships>`;
}

function buildSettingsXml(
  hasEvenAndOddHeaders: boolean,
  defaultTabStop?: number,
  footnoteSettings?: EditorFootnoteSettings,
  endnoteSettings?: EditorFootnoteSettings,
): string {
  const parts: string[] = [];
  const defaultTabStopTwips = pointsToTwips(defaultTabStop);
  if (defaultTabStopTwips !== null) {
    parts.push(`<w:defaultTabStop w:val="${defaultTabStopTwips}"/>`);
  }
  const footnotePr = serializeNoteSettings("footnotePr", footnoteSettings);
  if (footnotePr) {
    parts.push(footnotePr);
  }
  const endnotePr = serializeNoteSettings("endnotePr", endnoteSettings);
  if (endnotePr) {
    parts.push(endnotePr);
  }
  if (hasEvenAndOddHeaders) {
    parts.push("<w:evenAndOddHeaders/>");
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${WORD_NS}">${parts.join("")}</w:settings>`;
}

const NOTE_NUMBER_FORMATS: Record<
  NonNullable<EditorFootnoteSettings["numberFormat"]>,
  string
> = {
  decimal: "decimal",
  lowerRoman: "lowerRoman",
  upperRoman: "upperRoman",
  lowerLetter: "lowerLetter",
  upperLetter: "upperLetter",
  symbol: "symbol",
};

const NOTE_RESTARTS: Record<
  NonNullable<EditorFootnoteSettings["restart"]>,
  string
> = {
  continuous: "continuous",
  eachSection: "eachSect",
};

function serializeNoteSettings(
  tagName: "footnotePr" | "endnotePr",
  settings: EditorFootnoteSettings | undefined,
): string | null {
  if (!settings) return null;
  const parts: string[] = [];
  if (settings.numberFormat) {
    parts.push(
      `<w:numFmt w:val="${NOTE_NUMBER_FORMATS[settings.numberFormat]}"/>`,
    );
  }
  if (settings.startAt !== undefined) {
    parts.push(`<w:numStart w:val="${Math.max(1, settings.startAt)}"/>`);
  }
  if (settings.restart) {
    parts.push(`<w:numRestart w:val="${NOTE_RESTARTS[settings.restart]}"/>`);
  }
  return parts.length > 0
    ? `<w:${tagName}>${parts.join("")}</w:${tagName}>`
    : null;
}

function buildPartRelationshipsXml(
  images: DocContext["images"],
  hyperlinks: DocContext["hyperlinks"],
): string {
  let rels = "";
  for (const hyperlink of hyperlinks) {
    rels += `<Relationship Id="${hyperlink.rId}" Type="${OFFICE_REL_NS}/hyperlink" Target="${escapeXml(hyperlink.href)}" TargetMode="External"/>`;
  }
  for (const img of images) {
    const targetMode = img.kind === "linked" ? ' TargetMode="External"' : "";
    rels += `<Relationship Id="${img.rId}" Type="${OFFICE_REL_NS}/image" Target="${escapeXml(img.target)}"${targetMode}/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${rels}</Relationships>`;
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

  const bodyContext = buildPartContext(
    sections.flatMap((section) => section.blocks),
    numberingContext,
    buildState,
    document,
  );
  bodyContext.footnoteIdMap = footnoteIdMap;
  bodyContext.endnoteIdMap = endnoteIdMap;
  // Bookmarks: assign deterministic w:ids once and share the per-paragraph
  // event map across body and header/footer contexts (paragraph ids are unique).
  const bookmarkEvents = buildBookmarkExportPlan(document);
  bodyContext.bookmarkEventsByParagraph = bookmarkEvents;
  // Comments: same id-assignment + per-paragraph event sharing as bookmarks.
  const commentPlan = buildCommentExportPlan(document);
  bodyContext.commentEventsByParagraph = commentPlan?.eventsByParagraph;
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
      const context = buildPartContext(
        blocks,
        numberingContext,
        buildState,
        document,
      );
      // Footnote/endnote references in headers/footers must use the same
      // numeric ids as the body so they resolve to the correct note bodies.
      context.footnoteIdMap = footnoteIdMap;
      context.endnoteIdMap = endnoteIdMap;
      context.bookmarkEventsByParagraph = bookmarkEvents;
      context.commentEventsByParagraph = commentPlan?.eventsByParagraph;
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
    hasComments
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
      ),
    );
  }

  if (hasDocumentSettings) {
    zip.file(
      "word/settings.xml",
      buildSettingsXml(
        hasEvenAndOddHeaders,
        document.settings?.defaultTabStop,
        document.footnotes?.settings,
        document.endnotes?.settings,
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

  if (footnotesPart) {
    zip.file("word/footnotes.xml", footnotesPart.xml);
    if (
      footnotesPart.partContext.images.length > 0 ||
      footnotesPart.partContext.hyperlinks.length > 0
    ) {
      zip.file(
        "word/_rels/footnotes.xml.rels",
        buildPartRelationshipsXml(
          footnotesPart.partContext.images,
          footnotesPart.partContext.hyperlinks,
        ),
      );
    }
  }

  if (endnotesPart) {
    zip.file("word/endnotes.xml", endnotesPart.xml);
    if (
      endnotesPart.partContext.images.length > 0 ||
      endnotesPart.partContext.hyperlinks.length > 0
    ) {
      zip.file(
        "word/_rels/endnotes.xml.rels",
        buildPartRelationshipsXml(
          endnotesPart.partContext.images,
          endnotesPart.partContext.hyperlinks,
        ),
      );
    }
  }

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
