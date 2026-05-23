export interface OasisPdfPageSize {
  width: number;
  height: number;
}

export interface OasisPdfPage {
  width: number;
  height: number;
  commands: string[];
}

export interface OasisPdfRectOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
}

export interface OasisPdfLineOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  lineWidth?: number;
}

export interface OasisPdfTextOptions {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

interface PdfObject {
  id: number;
  body: string;
}

interface PdfFontResource {
  name: string;
  baseFont: string;
}

const PDF_HEADER = "%PDF-1.4\n% Oasis PDF\n";
const PDF_FONT_RESOURCES: PdfFontResource[] = [
  { name: "F1", baseFont: "Helvetica" },
  { name: "F2", baseFont: "Helvetica-Bold" },
  { name: "F3", baseFont: "Helvetica-Oblique" },
  { name: "F4", baseFont: "Helvetica-BoldOblique" },
];

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number(value.toFixed(3)).toString();
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function escapePdfString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function colorToRgb(color: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!color) {
    return fallback;
  }

  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

function colorCommand(
  color: string | undefined,
  operator: "rg" | "RG",
  fallback: [number, number, number],
): string {
  const [r, g, b] = colorToRgb(color, fallback);
  return `${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} ${operator}`;
}

function resolveFontName(options: Pick<OasisPdfTextOptions, "bold" | "italic">): string {
  if (options.bold && options.italic) {
    return "F4";
  }
  if (options.bold) {
    return "F2";
  }
  if (options.italic) {
    return "F3";
  }
  return "F1";
}

export class OasisPdfWriter {
  private readonly pages: OasisPdfPage[] = [];

  addPage(size: OasisPdfPageSize): number {
    this.pages.push({
      width: Math.max(1, size.width),
      height: Math.max(1, size.height),
      commands: [],
    });
    return this.pages.length - 1;
  }

  getPageCount(): number {
    return this.pages.length;
  }

  drawRect(pageIndex: number, options: OasisPdfRectOptions): void {
    const page = this.pages[pageIndex];
    if (!page || options.width <= 0 || options.height <= 0) {
      return;
    }

    const commands = ["q"];
    if (options.fill) {
      commands.push(colorCommand(options.fill, "rg", [1, 1, 1]));
    }
    if (options.stroke) {
      commands.push(colorCommand(options.stroke, "RG", [0, 0, 0]));
      commands.push(`${formatNumber(options.lineWidth ?? 1)} w`);
    }

    commands.push([
      formatNumber(options.x),
      formatNumber(page.height - options.y - options.height),
      formatNumber(options.width),
      formatNumber(options.height),
      "re",
    ].join(" "));

    if (options.fill && options.stroke) {
      commands.push("B");
    } else if (options.fill) {
      commands.push("f");
    } else if (options.stroke) {
      commands.push("S");
    }
    commands.push("Q");
    page.commands.push(commands.join("\n"));
  }

  drawLine(pageIndex: number, options: OasisPdfLineOptions): void {
    const page = this.pages[pageIndex];
    if (!page) {
      return;
    }

    page.commands.push([
      "q",
      colorCommand(options.stroke, "RG", [0, 0, 0]),
      `${formatNumber(options.lineWidth ?? 1)} w`,
      `${formatNumber(options.x1)} ${formatNumber(page.height - options.y1)} m`,
      `${formatNumber(options.x2)} ${formatNumber(page.height - options.y2)} l`,
      "S",
      "Q",
    ].join("\n"));
  }

  drawText(pageIndex: number, options: OasisPdfTextOptions): void {
    const page = this.pages[pageIndex];
    if (!page || options.text.length === 0) {
      return;
    }

    page.commands.push([
      "BT",
      colorCommand(options.color, "rg", [0, 0, 0]),
      `/${resolveFontName(options)} ${formatNumber(options.fontSize ?? 12)} Tf`,
      `${formatNumber(options.x)} ${formatNumber(page.height - options.y)} Td`,
      `(${escapePdfString(options.text)}) Tj`,
      "ET",
    ].join("\n"));
  }

  toArrayBuffer(): ArrayBuffer {
    const bytes = this.toUint8Array();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  toBlob(): Blob {
    return new Blob([this.toArrayBuffer()], { type: "application/pdf" });
  }

  private toUint8Array(): Uint8Array {
    if (this.pages.length === 0) {
      this.addPage({ width: 612, height: 792 });
    }

    const objects: PdfObject[] = [];
    const addObject = (body: string): number => {
      const id = objects.length + 1;
      objects.push({ id, body });
      return id;
    };

    const catalogObjectId = addObject("");
    const pagesObjectId = addObject("");
    const fontObjectIds = PDF_FONT_RESOURCES.map((font) =>
      addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /${font.baseFont} >>`),
    );
    const fontResourceXml = PDF_FONT_RESOURCES
      .map((font, index) => `/${font.name} ${fontObjectIds[index]} 0 R`)
      .join(" ");
    const pageObjectIds: number[] = [];

    for (const page of this.pages) {
      const stream = `${page.commands.join("\n")}\n`;
      const contentObjectId = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}endstream`);
      const pageObjectId = addObject([
        "<< /Type /Page",
        `/Parent ${pagesObjectId} 0 R`,
        `/MediaBox [0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}]`,
        `/Resources << /Font << ${fontResourceXml} >> >>`,
        `/Contents ${contentObjectId} 0 R`,
        ">>",
      ].join("\n"));
      pageObjectIds.push(pageObjectId);
    }

    objects[catalogObjectId - 1]!.body = `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`;
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
}
