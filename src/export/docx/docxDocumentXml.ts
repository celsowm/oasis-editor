import type {
  EditorBlockNode,
  EditorDocument,
  EditorNamedStyle,
  EditorPageSettings,
  EditorSection,
  EditorSectionPropertiesSnapshot,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import type { DocContext, SectionReferenceDefinition } from "./docxTypes.js";
import {
  OFFICE_REL_NS,
  pxToTwips,
  WORD14_NS,
  WORD_NS,
  escapeXml,
} from "./xmlUtils.js";
import { serializeBlocksXml } from "./textXml.js";
import { serializeRevisionMetadataAttributes } from "./text/revisionXml.js";

const DOCUMENT_XMLNS =
  `xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" ` +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
  `xmlns:r="${OFFICE_REL_NS}"`;

function sectionFromSnapshot(
  snapshot: EditorSectionPropertiesSnapshot,
): EditorSection {
  return {
    id: "section:revision",
    blocks: [],
    pageSettings: snapshot.pageSettings,
    ...(snapshot.pageBorder !== undefined
      ? { pageBorder: snapshot.pageBorder }
      : {}),
    ...(snapshot.pageNumbering
      ? { pageNumbering: snapshot.pageNumbering }
      : {}),
    ...(snapshot.verticalAlignment
      ? { verticalAlignment: snapshot.verticalAlignment }
      : {}),
    ...(snapshot.bidi !== undefined ? { bidi: snapshot.bidi } : {}),
  };
}

function serializeSectionPropertiesWithReferences(
  pageSettings: EditorPageSettings,
  references: SectionReferenceDefinition | undefined,
  section: EditorSection,
  nextBreakType: EditorSection["breakType"],
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

  // w:type describes how the *following* section begins and lives on this
  // sectPr (the off-by-one inverse of the import mapping). `nextPage` is the
  // Word default and is omitted. The last section has no following section, so
  // nextBreakType is undefined and nothing is emitted.
  const typeXml =
    nextBreakType && nextBreakType !== "nextPage"
      ? `<w:type w:val="${nextBreakType}"/>`
      : "";

  const columns = pageSettings.columns;
  let columnsXml = "";
  if (columns && columns.count > 1) {
    const space = pxToTwips(columns.space, 0);
    const sepAttr = columns.separator ? ' w:sep="1"' : "";
    if (columns.equalWidth === false && columns.columns?.length) {
      const colsXml = columns.columns
        .map(
          (col): string =>
            `<w:col w:w="${pxToTwips(col.width, 0)}" w:space="${pxToTwips(col.space, 0)}"/>`,
        )
        .join("");
      columnsXml = `<w:cols w:num="${columns.count}" w:space="${space}" w:equalWidth="0"${sepAttr}>${colsXml}</w:cols>`;
    } else {
      columnsXml = `<w:cols w:num="${columns.count}" w:space="${space}"${sepAttr}/>`;
    }
  }

  // w:pgNumType — page numbering format/start/chapter (round-trip preservation).
  const pgNum = section.pageNumbering;
  let pgNumTypeXml = "";
  if (pgNum) {
    const attrs: string[] = [];
    if (pgNum.start !== undefined) attrs.push(`w:start="${pgNum.start}"`);
    if (pgNum.format) attrs.push(`w:fmt="${escapeXml(pgNum.format)}"`);
    if (pgNum.chapterStyle)
      attrs.push(`w:chapStyle="${escapeXml(pgNum.chapterStyle)}"`);
    if (pgNum.chapterSeparator)
      attrs.push(`w:chapSep="${escapeXml(pgNum.chapterSeparator)}"`);
    if (attrs.length > 0) {
      pgNumTypeXml = `<w:pgNumType ${attrs.join(" ")}/>`;
    }
  }

  // w:vAlign — vertical justification of page contents. `top` is the Word
  // default and is omitted.
  const vAlignXml =
    section.verticalAlignment && section.verticalAlignment !== "top"
      ? `<w:vAlign w:val="${section.verticalAlignment}"/>`
      : "";

  // w:bidi — right-to-left section layout (on/off element).
  const bidiXml = section.bidi ? "<w:bidi/>" : "";

  const border = section.pageBorder;
  const borderColor = border?.color.replace("#", "").toUpperCase();
  const borderXml = border
    ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="${border.style}" w:sz="${Math.max(1, Math.round(border.width * 8))}" w:space="${Math.max(0, Math.round(border.distance ?? 0))}" w:color="${borderColor}"/><w:left w:val="${border.style}" w:sz="${Math.max(1, Math.round(border.width * 8))}" w:space="${Math.max(0, Math.round(border.distance ?? 0))}" w:color="${borderColor}"/><w:bottom w:val="${border.style}" w:sz="${Math.max(1, Math.round(border.width * 8))}" w:space="${Math.max(0, Math.round(border.distance ?? 0))}" w:color="${borderColor}"/><w:right w:val="${border.style}" w:sz="${Math.max(1, Math.round(border.width * 8))}" w:space="${Math.max(0, Math.round(border.distance ?? 0))}" w:color="${borderColor}"/></w:pgBorders>`
    : "";

  const propertyRevisionXml = section.propertyRevision
    ? `<w:sectPrChange ${serializeRevisionMetadataAttributes(section.propertyRevision)}>${serializeSectionPropertiesWithReferences(
        section.propertyRevision.previous.pageSettings,
        undefined,
        sectionFromSnapshot(section.propertyRevision.previous),
        section.propertyRevision.previous.nextBreakType,
      )}</w:sectPrChange>`
    : "";

  return `<w:sectPr>${referencesXml}${titlePageXml}${typeXml}<w:pgSz w:w="${width}" w:h="${height}"${orientationAttr}/><w:pgMar w:top="${pxToTwips(margins.top, 1440)}" w:right="${pxToTwips(margins.right, 1440)}" w:bottom="${pxToTwips(margins.bottom, 1440)}" w:left="${pxToTwips(margins.left, 1440)}" w:header="${pxToTwips(margins.header, 720)}" w:footer="${pxToTwips(margins.footer, 720)}" w:gutter="${pxToTwips(margins.gutter, 0)}"/>${pgNumTypeXml}${columnsXml}${vAlignXml}${bidiXml}${borderXml}${propertyRevisionXml}</w:sectPr>`;
}

export function buildDocumentXml(
  document: EditorDocument,
  context: DocContext,
  sectionReferences: SectionReferenceDefinition[],
): string {
  const sections = getDocumentSections(document);

  const sectionsXml = sections
    .map((section, sectionIndex): string => {
      const blocksXml = serializeBlocksXml(
        section.blocks,
        context,
        document.styles,
      );
      const sectionPr = serializeSectionPropertiesWithReferences(
        section.pageSettings,
        sectionReferences[sectionIndex],
        section,
        sections[sectionIndex + 1]?.breakType,
      );
      return blocksXml + sectionPr;
    })
    .join("");

  const pageColor = document.design?.pageColor?.replace("#", "").toUpperCase();
  const backgroundXml = pageColor
    ? `<w:background w:color="${pageColor}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${DOCUMENT_XMLNS}>${backgroundXml}<w:body>${sectionsXml}</w:body></w:document>`;
}

export function buildHeaderFooterXml(
  kind: "header" | "footer",
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  watermark?: import("@/core/model.js").EditorWatermark | null,
): string {
  const tag = kind === "header" ? "hdr" : "ftr";
  const mark =
    kind === "header" && watermark?.kind === "text" && watermark.text
      ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml"><v:shape type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${watermark.rotation ?? -45}" fillcolor="${watermark.color ?? "#94a3b8"}" fillopacity="${watermark.opacity ?? 0.25}"><v:textpath on="true" string="${escapeXml(watermark.text)}" style="font-family:${escapeXml(watermark.fontFamily ?? "Arial")};font-size:${watermark.fontSize ?? 48}pt"/></v:shape></w:pict>`
      : kind === "header" &&
          watermark?.kind === "image" &&
          context.images.some((image) => image.runId === "__watermark")
        ? `<w:pict xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><v:shape type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:216pt;z-index:-251654144;rotation:${watermark.rotation ?? -45}" fillcolor="${watermark.color ?? "#ffffff"}" fillopacity="${watermark.opacity ?? 0.25}" stroked="f"><v:imagedata r:id="rIdWatermark" o:title="Watermark"/></v:shape></w:pict>`
        : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${tag} ${DOCUMENT_XMLNS}>${mark}${serializeBlocksXml(blocks, context, styles)}</w:${tag}>`;
}
