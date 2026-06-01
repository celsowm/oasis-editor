import JSZip from "jszip";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorNamedStyle,
  EditorPageSettings,
  EditorParagraphListStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { getDocumentSections, resolveImageSrc } from "../../core/model.js";
import type {
  DocContext,
  ExportBuildState,
  NumberingContext,
  PartDefinition,
  SectionReferenceDefinition,
} from "./docxTypes.js";
import { serializeTableXml } from "./tableXml.js";
import { serializeParagraphXml } from "./textXml.js";
import {
  buildFootnoteIdMap,
  buildFootnotesXml,
  collectReferencedFootnotesForExport,
  type ReferencedFootnote,
} from "./footnotesXml.js";
import {
  escapeXml,
  OFFICE_REL_NS,
  PACKAGE_REL_NS,
  pxToTwips,
  WORD14_NS,
  WORD_NS,
} from "./xmlUtils.js";

const DOCUMENT_XMLNS =
  `xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" ` +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  `xmlns:r="${OFFICE_REL_NS}"`;

function serializeSectionProperties(pageSettings: EditorPageSettings): string {
  return serializeSectionPropertiesWithReferences(pageSettings);
}

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
    references?.header?.first || references?.footer?.first ? "<w:titlePg/>" : "";

  return `<w:sectPr>${referencesXml}${titlePageXml}<w:pgSz w:w="${width}" w:h="${height}"${orientationAttr}/><w:pgMar w:top="${pxToTwips(margins.top, 1440)}" w:right="${pxToTwips(margins.right, 1440)}" w:bottom="${pxToTwips(margins.bottom, 1440)}" w:left="${pxToTwips(margins.left, 1440)}" w:header="${pxToTwips(margins.header, 720)}" w:footer="${pxToTwips(margins.footer, 720)}" w:gutter="${pxToTwips(margins.gutter, 0)}"/></w:sectPr>`;
}

function visitBlocks(
  blocks: EditorBlockNode[],
  callback: (paragraph: EditorParagraphNode) => void,
): void {
  for (const block of blocks) {
    if (block.type === "paragraph") {
      callback(block);
      continue;
    }

    for (const row of block.rows) {
      for (const cell of row.cells) {
        for (const paragraph of cell.blocks) {
          callback(paragraph);
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
  const definitions: Array<{
    kind: EditorParagraphListStyle["kind"];
    level: number;
    abstractNumId: number;
    numId: number;
  }> = [];
  let nextAbstractNumId = 1;
  let nextNumId = 1;

  const traverseParagraph = (paragraph: EditorParagraphNode) => {
    if (!paragraph.list) {
      return;
    }

    const level = Math.max(0, paragraph.list.level ?? 0);
    const key = `${paragraph.list.kind}:${level}`;
    let definition = definitionMap.get(key);
    if (!definition) {
      definition = { abstractNumId: nextAbstractNumId++, numId: nextNumId++ };
      definitionMap.set(key, definition);
      definitions.push({
        kind: paragraph.list.kind,
        level,
        abstractNumId: definition.abstractNumId,
        numId: definition.numId,
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
  const images: Array<{
    rId: string;
    target: string;
    base64: string;
    runId: string;
    cx: number;
    cy: number;
    alt?: string;
  }> = [];
  const imageMap = new Map<string, string>();
  const hyperlinks: Array<{ rId: string; href: string }> = [];
  const hyperlinkMap = new Map<string, string>();

  visitBlocks(blocks, (paragraph) => {
    for (const run of paragraph.runs) {
      if (run.styles?.link && !hyperlinkMap.has(run.styles.link)) {
        const rId = `rIdLink${hyperlinks.length + 1}`;
        hyperlinkMap.set(run.styles.link, rId);
        hyperlinks.push({ rId, href: run.styles.link });
      }

      if (!run.image) {
        continue;
      }

      // Image src may be an "asset:<id>" reference into the document's
      // asset registry — resolve it to the actual data URL before parsing.
      const resolvedSrc = resolveImageSrc(document, run.image.src);
      const match = resolvedSrc.match(
        /^data:image\/(png|jpeg|jpg);base64,(.*)$/,
      );
      if (!match) {
        continue;
      }

      const imageNumber = state.nextImageId;
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const base64 = match[2];
      const target = `media/image${imageNumber}.${ext}`;
      const rId = `rIdImg${imageNumber}`;
      images.push({
        rId,
        target,
        base64,
        runId: run.id,
        cx: Math.round(run.image.width * 9525),
        cy: Math.round(run.image.height * 9525),
        alt: run.image.alt,
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
    hyperlinks,
    hyperlinkMap,
  };
}

function buildNumberingXml(
  definitions: Array<{
    kind: EditorParagraphListStyle["kind"];
    level: number;
    abstractNumId: number;
    numId: number;
  }>,
): string {
  const abstractNums = definitions
    .map(({ kind, level, abstractNumId }) => {
      const format = kind === "bullet" ? "bullet" : "decimal";
      const levelText = kind === "bullet" ? "\uF0B7" : `%${level + 1}.`;
      const runFonts =
        kind === "bullet"
          ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>'
          : "";

      return `<w:abstractNum w:abstractNumId="${abstractNumId}"><w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${escapeXml(levelText)}"/><w:lvlJc w:val="left"/>${runFonts}</w:lvl></w:abstractNum>`;
    })
    .join("");

  const nums = definitions
    .map(
      ({ abstractNumId, numId }) =>
        `<w:num w:numId="${numId}"><w:abstractNumId w:val="${abstractNumId}"/></w:num>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${WORD_NS}">${abstractNums}${nums}</w:numbering>`;
}

function serializeBlocksXml(
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  return blocks
    .map((block) => {
      if (block.type === "table") {
        const pageBreakXml = block.style?.pageBreakBefore
          ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
          : "";
        return pageBreakXml + serializeTableXml(block, (paragraph, cell) =>
          serializeParagraphXml(paragraph, context, styles, {
            align: cell.style?.horizontalAlign,
          }),
        );
      }
      return serializeParagraphXml(block, context, styles);
    })
    .join("");
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
  hasImages: boolean,
  hasSettings: boolean,
  parts: PartDefinition[],
  hasFootnotes: boolean,
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
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${
    hasImages
      ? '<Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
      : ""
  }<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${
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
): string {
  let rels = "";
  if (hasNumbering)
    rels += `<Relationship Id="rIdNum" Type="${OFFICE_REL_NS}/numbering" Target="numbering.xml"/>`;
  if (hasSettings)
    rels += `<Relationship Id="rIdSettings" Type="${OFFICE_REL_NS}/settings" Target="settings.xml"/>`;
  for (const hyperlink of hyperlinks) {
    rels += `<Relationship Id="${hyperlink.rId}" Type="${OFFICE_REL_NS}/hyperlink" Target="${escapeXml(hyperlink.href)}" TargetMode="External"/>`;
  }
  for (const img of images) {
    rels += `<Relationship Id="${img.rId}" Type="${OFFICE_REL_NS}/image" Target="${img.target}"/>`;
  }
  for (const part of parts) {
    const relType = part.kind === "header" ? "header" : "footer";
    rels += `<Relationship Id="${part.relId}" Type="${OFFICE_REL_NS}/${relType}" Target="${part.path}"/>`;
  }
  if (hasFootnotes) {
    rels += `<Relationship Id="rIdFootnotes" Type="${OFFICE_REL_NS}/footnotes" Target="footnotes.xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${rels}</Relationships>`;
}

function buildSettingsXml(hasEvenAndOddHeaders: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${WORD_NS}">${
    hasEvenAndOddHeaders ? "<w:evenAndOddHeaders/>" : ""
  }</w:settings>`;
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
    rels += `<Relationship Id="${img.rId}" Type="${OFFICE_REL_NS}/image" Target="${img.target}"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${rels}</Relationships>`;
}

export async function exportEditorDocumentToDocx(
  document: EditorDocument,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const numberingContext = buildNumberingContext(document);
  const buildState: ExportBuildState = { nextImageId: 1 };
  const sections = getDocumentSections(document);

  // Footnotes: assign DOCX `w:id` values in reading order so reference runs
  // and body entries stay in sync. Bodies that aren't referenced are dropped.
  const referencedFootnotes: ReferencedFootnote[] =
    collectReferencedFootnotesForExport(document);
  const footnoteIdMap = buildFootnoteIdMap(referencedFootnotes);
  const hasFootnotes = referencedFootnotes.length > 0;

  const bodyContext = buildPartContext(
    sections.flatMap((section) => section.blocks),
    numberingContext,
    buildState,
    document,
  );
  bodyContext.footnoteIdMap = footnoteIdMap;
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
      // Footnote references in headers/footers must use the same numeric ids
      // as the body so the references resolve to the correct footnote bodies.
      context.footnoteIdMap = footnoteIdMap;
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
        (blocks) => buildPartContext(blocks, numberingContext, buildState, document),
        document.styles,
        footnoteIdMap,
      )
    : null;
  if (footnotesPart) {
    allImages.push(...footnotesPart.partContext.images);
  }
  const hasImagesIncludingFootnotes = allImages.length > 0;

  zip.file(
    "[Content_Types].xml",
    buildContentTypesXml(
      hasNumbering,
      hasImagesIncludingFootnotes,
      hasEvenAndOddHeaders,
      parts,
      hasFootnotes,
    ),
  );
  zip.file("_rels/.rels", buildRootRelationshipsXml());
  zip.file(
    "word/document.xml",
    buildDocumentXml(document, bodyContext, sectionReferences),
  );

  if (hasNumbering) {
    zip.file(
      "word/numbering.xml",
      buildNumberingXml(numberingContext.definitions),
    );
  }

  if (
    hasNumbering ||
    hasEvenAndOddHeaders ||
    bodyContext.images.length > 0 ||
    bodyContext.hyperlinks.length > 0 ||
    parts.length > 0 ||
    hasFootnotes
  ) {
    zip.file(
      "word/_rels/document.xml.rels",
      buildDocumentRelationshipsXml(
        hasNumbering,
        hasEvenAndOddHeaders,
        bodyContext.images,
        bodyContext.hyperlinks,
        parts,
        hasFootnotes,
      ),
    );
  }

  if (hasEvenAndOddHeaders) {
    zip.file("word/settings.xml", buildSettingsXml(hasEvenAndOddHeaders));
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

  for (const img of allImages) {
    zip.file(`word/${img.target}`, img.base64, { base64: true });
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
