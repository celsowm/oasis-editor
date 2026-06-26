/**
 * Assembles the final PDF byte stream from the accumulated pages and the font /
 * image tables: indirect objects, the cross-reference table, and the trailer.
 * Object emission order (catalog, pages, fonts, images, then per-page content +
 * page objects) is load-bearing — xref offsets and `N 0 R` references depend on
 * it — so it mirrors the original single-method writer exactly.
 */
import type { OasisPdfPage, PdfObject } from "./pdfTypes.js";
import type { PdfFontTable } from "./PdfFontTable.js";
import type { PdfImageTable } from "./PdfImageTable.js";
import type { PdfShadingTable } from "./PdfShadingTable.js";
import { PDF_HEADER, byteLength, formatNumber } from "./pdfPrimitives.js";

export function serializePdfDocument(
  pages: OasisPdfPage[],
  fonts: PdfFontTable,
  images: PdfImageTable,
  shadings: PdfShadingTable,
): Uint8Array {
  const objects: PdfObject[] = [];
  const addObject = (body: string): number => {
    const id = objects.length + 1;
    objects.push({ id, body });
    return id;
  };

  const catalogObjectId = addObject("");
  const pagesObjectId = addObject("");
  const { resourceXml: fontResourceXml } = fonts.buildFontObjects(addObject);
  const imageObjectIds = images.buildImageObjects(addObject);
  const shadingObjectIds = shadings.buildShadingObjects(addObject);
  const pageObjectIds: number[] = [];

  for (const page of pages) {
    const stream = `${page.commands.join("\n")}\n`;
    const contentObjectId = addObject(
      `<< /Length ${byteLength(stream)} >>\nstream\n${stream}endstream`,
    );
    const imageResourceXml = Array.from(page.imageResourceNames)
      .map((resourceName) => {
        const objectId = imageObjectIds.get(resourceName);
        return objectId ? `/${resourceName} ${objectId} 0 R` : "";
      })
      .filter(Boolean)
      .join(" ");
    const xObjectResourceXml = imageResourceXml
      ? ` /XObject << ${imageResourceXml} >>`
      : "";
    const shadingResourceXml = Array.from(page.shadingResourceNames)
      .map((resourceName) => {
        const objectId = shadingObjectIds.get(resourceName);
        return objectId ? `/${resourceName} ${objectId} 0 R` : "";
      })
      .filter(Boolean)
      .join(" ");
    const shadingResourceDictXml = shadingResourceXml
      ? ` /Shading << ${shadingResourceXml} >>`
      : "";
    const pageObjectId = addObject(
      [
        "<< /Type /Page",
        `/Parent ${pagesObjectId} 0 R`,
        `/MediaBox [0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}]`,
        `/Resources << /Font << ${fontResourceXml} >>${xObjectResourceXml}${shadingResourceDictXml} >>`,
        `/Contents ${contentObjectId} 0 R`,
        ">>",
      ].join("\n"),
    );
    pageObjectIds.push(pageObjectId);
  }

  objects[catalogObjectId - 1]!.body =
    `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`;
  objects[pagesObjectId - 1]!.body = [
    "<< /Type /Pages",
    `/Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}]`,
    `/Count ${pageObjectIds.length}`,
    ">>",
  ].join("\n");

  let body = PDF_HEADER;
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets[object.id] = byteLength(body);
    body += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }

  const xrefOffset = byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const object of objects) {
    body += `${String(offsets[object.id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  body += [
    "trailer",
    `<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ].join("\n");

  return new TextEncoder().encode(body);
}
