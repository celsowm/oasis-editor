/**
 * Assembles the final PDF byte stream from the accumulated pages and the font /
 * image tables: indirect objects, the cross-reference table, and the trailer.
 * Object emission order (catalog, pages, fonts, images, then per-page content +
 * page objects) is load-bearing — xref offsets and `N 0 R` references depend on
 * it — so it mirrors the original single-method writer exactly.
 */
import type {
  OasisPdfDocumentInfo,
  OasisPdfNamedDestination,
  OasisPdfOutlineItem,
  OasisPdfPage,
  PdfObject,
} from "./pdfTypes.js";
import type { PdfFontTable } from "./PdfFontTable.js";
import type { PdfImageTable } from "./PdfImageTable.js";
import type { PdfShadingTable } from "./PdfShadingTable.js";
import { zlibSync } from "fflate";
import {
  PDF_HEADER,
  byteLength,
  encodePdfUtf16Hex,
  formatNumber,
} from "./pdfPrimitives.js";

const utf8 = new TextEncoder();

/** Byte length of a string (UTF-8) or raw byte chunk. */
function chunkByteLength(chunk: string | Uint8Array): number {
  return typeof chunk === "string" ? byteLength(chunk) : chunk.length;
}

/** Concatenates string (UTF-8) and binary chunks into one byte buffer. */
function concatChunks(chunks: Array<string | Uint8Array>): Uint8Array {
  const total = chunks.reduce((sum, chunk): number => sum + chunkByteLength(chunk), 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    const bytes = typeof chunk === "string" ? utf8.encode(chunk) : chunk;
    out.set(bytes, offset);
    offset += bytes.length;
  }
  return out;
}

/**
 * Builds a page content-stream object body, FlateDecode-compressed. Returns raw
 * bytes (dict + deflated stream) so the deflated data bypasses UTF-8 encoding.
 */
function buildContentStreamObject(streamText: string): Uint8Array {
  const compressed = zlibSync(utf8.encode(streamText));
  return concatChunks([
    `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`,
    compressed,
    "\nendstream",
  ]);
}

/** Escapes a string for a PDF literal `(...)` string (used for `/URI`). */
function encodePdfLiteralString(value: string): string {
  return value.replace(/[\\()]/g, (char): string => `\\${char}`);
}

/**
 * Encodes a human-readable string (outline title) as a UTF-16BE hex string with
 * a byte-order mark, so non-ASCII headings (e.g. accented Portuguese) render.
 */
function encodePdfTextString(value: string): string {
  const codePoints = Array.from(value).map((ch): number => ch.codePointAt(0) ?? 0x3f);
  return `<FEFF${encodePdfUtf16Hex(codePoints)}>`;
}

/** Formats a date as a PDF date string in UTC: `D:YYYYMMDDHHmmSS+00'00'`. */
function formatPdfDate(date: Date): string {
  const pad = (n: number, width = 2): string => String(n).padStart(width, "0");
  return (
    `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}+00'00'`
  );
}

/** Builds an `/Info` dictionary body, or `undefined` when no fields are set. */
function buildDocumentInfoBody(info: OasisPdfDocumentInfo): string | undefined {
  const entries: string[] = [];
  if (info.title) entries.push(`/Title ${encodePdfTextString(info.title)}`);
  if (info.author) entries.push(`/Author ${encodePdfTextString(info.author)}`);
  if (info.subject)
    entries.push(`/Subject ${encodePdfTextString(info.subject)}`);
  if (info.keywords)
    entries.push(`/Keywords ${encodePdfTextString(info.keywords)}`);
  if (info.producer)
    entries.push(`/Producer (${encodePdfLiteralString(info.producer)})`);
  if (info.creationDate)
    entries.push(`/CreationDate (${formatPdfDate(info.creationDate)})`);
  if (entries.length === 0) {
    return undefined;
  }
  return `<< ${entries.join(" ")} >>`;
}

interface OutlineNode {
  title: string;
  destName: string;
  children: OutlineNode[];
}

/** Folds a flat, document-ordered outline list into a tree nested by `level`. */
function buildOutlineTree(items: OasisPdfOutlineItem[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: { node: OutlineNode; level: number }[] = [];
  for (const item of items) {
    const node: OutlineNode = {
      title: item.title,
      destName: item.destName,
      children: [],
    };
    while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.node.children.push(node);
    }
    stack.push({ node, level: item.level });
  }
  return roots;
}

function countOutlineDescendants(node: OutlineNode): number {
  return node.children.reduce(
    (total, child): number => total + 1 + countOutlineDescendants(child),
    0,
  );
}

export function serializePdfDocument(
  pages: OasisPdfPage[],
  fonts: PdfFontTable,
  images: PdfImageTable,
  shadings: PdfShadingTable,
  namedDestinations: OasisPdfNamedDestination[] = [],
  outlineItems: OasisPdfOutlineItem[] = [],
  documentInfo?: OasisPdfDocumentInfo,
): Uint8Array {
  const objects: PdfObject[] = [];
  const addObject = (body: string | Uint8Array): number => {
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
    const contentObjectId = addObject(buildContentStreamObject(stream));
    const imageResourceXml = Array.from(page.imageResourceNames)
      .map((resourceName): string => {
        const objectId = imageObjectIds.get(resourceName);
        return objectId ? `/${resourceName} ${objectId} 0 R` : "";
      })
      .filter(Boolean)
      .join(" ");
    const xObjectResourceXml = imageResourceXml
      ? ` /XObject << ${imageResourceXml} >>`
      : "";
    const shadingResourceXml = Array.from(page.shadingResourceNames)
      .map((resourceName): string => {
        const objectId = shadingObjectIds.get(resourceName);
        return objectId ? `/${resourceName} ${objectId} 0 R` : "";
      })
      .filter(Boolean)
      .join(" ");
    const shadingResourceDictXml = shadingResourceXml
      ? ` /Shading << ${shadingResourceXml} >>`
      : "";
    const annotationObjectIds = page.annotations.map((annotation): number => {
      // PDF annotation rects are in default user space (bottom-left origin), so
      // flip the writer's top-left y the same way drawRect does.
      const x1 = annotation.x;
      const x2 = annotation.x + annotation.width;
      const y1 = page.height - annotation.y - annotation.height;
      const y2 = page.height - annotation.y;
      const action =
        annotation.destName !== undefined
          ? `/A << /Type /Action /S /GoTo /D (${encodePdfLiteralString(annotation.destName)}) >>`
          : `/A << /Type /Action /S /URI /URI (${encodePdfLiteralString(annotation.uri ?? "")}) >>`;
      return addObject(
        [
          "<< /Type /Annot /Subtype /Link",
          `/Rect [${formatNumber(x1)} ${formatNumber(y1)} ${formatNumber(x2)} ${formatNumber(y2)}]`,
          "/Border [0 0 0]",
          action,
          ">>",
        ].join("\n"),
      );
    });
    const annotsXml =
      annotationObjectIds.length > 0
        ? `\n/Annots [${annotationObjectIds.map((id): string => `${id} 0 R`).join(" ")}]`
        : "";
    const pageObjectId = addObject(
      [
        "<< /Type /Page",
        `/Parent ${pagesObjectId} 0 R`,
        `/MediaBox [0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}]`,
        `/Resources << /Font << ${fontResourceXml} >>${xObjectResourceXml}${shadingResourceDictXml} >>`,
        `/Contents ${contentObjectId} 0 R${annotsXml}`,
        ">>",
      ].join("\n"),
    );
    pageObjectIds.push(pageObjectId);
  }

  // Named-destination (`/Dests`) name tree. The `/Names` array must be sorted by
  // key, and each value is an explicit `[page /XYZ x y null]` destination bound to
  // the now-known page object. Duplicate/unresolved names are dropped.
  let namesObjectId: number | undefined;
  const resolvedDestinations = namedDestinations
    .filter((dest): boolean => pageObjectIds[dest.pageIndex] !== undefined)
    .sort((a, b): 0 | 1 | -1 => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (resolvedDestinations.length > 0) {
    const namesArray = resolvedDestinations
      .map((dest): string => {
        const pageObjectId = pageObjectIds[dest.pageIndex]!;
        const pageHeight = pages[dest.pageIndex]!.height;
        const top = pageHeight - dest.y;
        return `(${encodePdfLiteralString(dest.name)}) [${pageObjectId} 0 R /XYZ ${formatNumber(dest.x)} ${formatNumber(top)} null]`;
      })
      .join(" ");
    const destsObjectId = addObject(`<< /Names [${namesArray}] >>`);
    namesObjectId = addObject(`<< /Dests ${destsObjectId} 0 R >>`);
  }

  // Document outline (`/Outlines`). Items reference named destinations (which must
  // therefore resolve), are nested by level, and are emitted with the
  // sibling/parent/child cross-links the spec requires. Object ids are
  // pre-allocated so the cross-links can point at not-yet-emitted siblings.
  let outlineRootId: number | undefined;
  const resolvedNames = new Set(resolvedDestinations.map((dest): string => dest.name));
  const outlineRoots = buildOutlineTree(
    outlineItems.filter((item): boolean => resolvedNames.has(item.destName)),
  );
  if (outlineRoots.length > 0) {
    outlineRootId = addObject("");
    const assignIds = (nodes: OutlineNode[]): number[] =>
      nodes.map((node): number => {
        const id = addObject("");
        (node as OutlineNode & { id: number; childIds: number[] }).id = id;
        (node as OutlineNode & { id: number; childIds: number[] }).childIds =
          assignIds(node.children);
        return id;
      });
    const rootIds = assignIds(outlineRoots);
    const emit = (nodes: OutlineNode[], parentId: number): void => {
      nodes.forEach((node, index): void => {
        const self = node as OutlineNode & { id: number; childIds: number[] };
        const prev = index > 0 ? nodes[index - 1] : undefined;
        const next = index < nodes.length - 1 ? nodes[index + 1] : undefined;
        const lines = [
          "<< /Title " + encodePdfTextString(node.title),
          `/Parent ${parentId} 0 R`,
          prev ? `/Prev ${(prev as OutlineNode & { id: number }).id} 0 R` : "",
          next ? `/Next ${(next as OutlineNode & { id: number }).id} 0 R` : "",
          `/Dest (${encodePdfLiteralString(node.destName)})`,
        ];
        if (self.childIds.length > 0) {
          lines.push(`/First ${self.childIds[0]} 0 R`);
          lines.push(`/Last ${self.childIds[self.childIds.length - 1]} 0 R`);
          lines.push(`/Count ${countOutlineDescendants(node)}`);
        }
        lines.push(">>");
        objects[self.id - 1]!.body = lines.filter(Boolean).join("\n");
        emit(node.children, self.id);
      });
    };
    emit(outlineRoots, outlineRootId);
    const totalItems = outlineItems.filter((item): boolean =>
      resolvedNames.has(item.destName),
    ).length;
    objects[outlineRootId - 1]!.body = [
      "<< /Type /Outlines",
      `/First ${rootIds[0]} 0 R`,
      `/Last ${rootIds[rootIds.length - 1]} 0 R`,
      `/Count ${totalItems}`,
      ">>",
    ].join("\n");
  }

  objects[catalogObjectId - 1]!.body = [
    "<< /Type /Catalog",
    `/Pages ${pagesObjectId} 0 R`,
    namesObjectId !== undefined ? `/Names ${namesObjectId} 0 R` : "",
    outlineRootId !== undefined ? `/Outlines ${outlineRootId} 0 R` : "",
    outlineRootId !== undefined ? "/PageMode /UseOutlines" : "",
    ">>",
  ]
    .filter(Boolean)
    .join("\n");
  objects[pagesObjectId - 1]!.body = [
    "<< /Type /Pages",
    `/Kids [${pageObjectIds.map((id): string => `${id} 0 R`).join(" ")}]`,
    `/Count ${pageObjectIds.length}`,
    ">>",
  ].join("\n");

  // Document information dictionary (`/Info`), referenced from the trailer.
  let infoObjectId: number | undefined;
  if (documentInfo) {
    const infoBody = buildDocumentInfoBody(documentInfo);
    if (infoBody) {
      infoObjectId = addObject(infoBody);
    }
  }

  // Assemble the file as byte chunks (not a string) so the compressed binary
  // streams survive intact; offsets are tracked in bytes for the xref table.
  const chunks: Array<string | Uint8Array> = [PDF_HEADER];
  let offset = chunkByteLength(PDF_HEADER);
  const offsets: number[] = [0];
  const push = (chunk: string | Uint8Array): void => {
    chunks.push(chunk);
    offset += chunkByteLength(chunk);
  };
  for (const object of objects) {
    offsets[object.id] = offset;
    push(`${object.id} 0 obj\n`);
    push(object.body);
    push("\nendobj\n");
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (const object of objects) {
    xref += `${String(offsets[object.id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  const infoTrailerXml =
    infoObjectId !== undefined ? ` /Info ${infoObjectId} 0 R` : "";
  push(
    [
      "trailer",
      `<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R${infoTrailerXml} >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF",
      "",
    ].join("\n"),
  );

  return concatChunks(chunks);
}
