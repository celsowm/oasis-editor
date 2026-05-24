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
  fontResourceName?: string;
}

export type OasisPdfFontResource = OasisPdfBase14FontResource;

export interface OasisPdfBase14FontResource {
  kind: "base14";
  resourceName: string;
  baseFont: string;
}

interface PdfObject {
  id: number;
  body: string;
}

const PDF_HEADER = "%PDF-1.4\n% Oasis PDF\n";
const DEFAULT_PDF_FONT_RESOURCES: OasisPdfFontResource[] = [
  { kind: "base14", resourceName: "F1", baseFont: "Helvetica" },
  { kind: "base14", resourceName: "F2", baseFont: "Helvetica-Bold" },
  { kind: "base14", resourceName: "F3", baseFont: "Helvetica-Oblique" },
  { kind: "base14", resourceName: "F4", baseFont: "Helvetica-BoldOblique" },
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

function resolveFontName(options: Pick<OasisPdfTextOptions, "bold" | "italic" | "fontResourceName">): string {
  if (options.fontResourceName) {
    return options.fontResourceName;
  }
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

function fontResourceObjectBody(resource: OasisPdfFontResource): string {
  switch (resource.kind) {
    case "base14":
      return `<< /Type /Font /Subtype /Type1 /BaseFont /${resource.baseFont} /Encoding /WinAnsiEncoding >>`;
  }
}

const WIN_ANSI_OVERRIDES = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function encodeWinAnsiByte(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0x3f;
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) {
    return codePoint;
  }
  return WIN_ANSI_OVERRIDES.get(codePoint) ?? 0x3f;
}

function encodePdfHexString(value: string): string {
  return Array.from(value)
    .map((char) => encodeWinAnsiByte(char).toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

export class OasisPdfWriter {
  private readonly pages: OasisPdfPage[] = [];
  private readonly fontResources = new Map<string, OasisPdfFontResource>();

  constructor(fontResources: OasisPdfFontResource[] = DEFAULT_PDF_FONT_RESOURCES) {
    for (const resource of fontResources) {
      this.registerFontResource(resource);
    }
  }

  registerFontResource(resource: OasisPdfFontResource): void {
    this.fontResources.set(resource.resourceName, resource);
  }

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
      `<${encodePdfHexString(options.text)}> Tj`,
      "ET",
    ].join("\n"));
  }

  toArrayBuffer(): ArrayBuffer {
    const bytes = this.toUint8Array();
    return Uint8Array.from(bytes).buffer;
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
    const fontResourceEntries = Array.from(this.fontResources.values());
    const fontObjectIds = fontResourceEntries.map((font) => addObject(fontResourceObjectBody(font)));
    const fontResourceXml = fontResourceEntries
      .map((font, index) => `/${font.resourceName} ${fontObjectIds[index]} 0 R`)
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
