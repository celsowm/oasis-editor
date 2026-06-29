import type {
  EditorBlockNode,
  EditorDocument,
  EditorNamedStyle,
  EditorPageSettings,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import type { DocContext, SectionReferenceDefinition } from "./docxTypes.js";
import { OFFICE_REL_NS, pxToTwips, WORD14_NS, WORD_NS } from "./xmlUtils.js";
import { serializeBlocksXml } from "./textXml.js";

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

  return `<w:sectPr>${referencesXml}${titlePageXml}<w:pgSz w:w="${width}" w:h="${height}"${orientationAttr}/><w:pgMar w:top="${pxToTwips(margins.top, 1440)}" w:right="${pxToTwips(margins.right, 1440)}" w:bottom="${pxToTwips(margins.bottom, 1440)}" w:left="${pxToTwips(margins.left, 1440)}" w:header="${pxToTwips(margins.header, 720)}" w:footer="${pxToTwips(margins.footer, 720)}" w:gutter="${pxToTwips(margins.gutter, 0)}"/>${columnsXml}</w:sectPr>`;
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
      );
      return blocksXml + sectionPr;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${DOCUMENT_XMLNS}><w:body>${sectionsXml}</w:body></w:document>`;
}

export function buildHeaderFooterXml(
  kind: "header" | "footer",
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const tag = kind === "header" ? "hdr" : "ftr";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${tag} ${DOCUMENT_XMLNS}>${serializeBlocksXml(blocks, context, styles)}</w:${tag}>`;
}
