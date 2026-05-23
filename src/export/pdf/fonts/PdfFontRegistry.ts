import type { OasisPdfFontResource } from "../OasisPdfWriter.js";

export interface PdfFontResolveOptions {
  fontFamily?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
}

export interface PdfRegisteredFontFace {
  key: string;
  family: string;
  bold: boolean;
  italic: boolean;
  writerResourceName: string;
  pdfResource: OasisPdfFontResource;
}

const BASE14_HELVETICA_FACES: PdfRegisteredFontFace[] = [
  {
    key: "helvetica:regular",
    family: "Helvetica",
    bold: false,
    italic: false,
    writerResourceName: "F1",
    pdfResource: { kind: "base14", resourceName: "F1", baseFont: "Helvetica" },
  },
  {
    key: "helvetica:bold",
    family: "Helvetica",
    bold: true,
    italic: false,
    writerResourceName: "F2",
    pdfResource: { kind: "base14", resourceName: "F2", baseFont: "Helvetica-Bold" },
  },
  {
    key: "helvetica:italic",
    family: "Helvetica",
    bold: false,
    italic: true,
    writerResourceName: "F3",
    pdfResource: { kind: "base14", resourceName: "F3", baseFont: "Helvetica-Oblique" },
  },
  {
    key: "helvetica:bolditalic",
    family: "Helvetica",
    bold: true,
    italic: true,
    writerResourceName: "F4",
    pdfResource: { kind: "base14", resourceName: "F4", baseFont: "Helvetica-BoldOblique" },
  },
];

function normalizeFamily(fontFamily: string | null | undefined): string {
  const firstFamily = (fontFamily ?? "Helvetica").split(",")[0]?.trim().replace(/^[\'\"]|[\'\"]$/g, "");
  return firstFamily && firstFamily.length > 0 ? firstFamily : "Helvetica";
}

function faceKey(family: string, bold: boolean, italic: boolean): string {
  return `${family.toLowerCase()}:${bold ? "bold" : "regular"}${italic ? "italic" : ""}`;
}

export class PdfFontRegistry {
  private readonly faces = new Map<string, PdfRegisteredFontFace>();
  private readonly fallbackFamily = "Helvetica";

  constructor() {
    for (const face of BASE14_HELVETICA_FACES) {
      this.registerFontFace(face);
    }
  }

  registerFontFace(face: PdfRegisteredFontFace): void {
    this.faces.set(faceKey(face.family, face.bold, face.italic), face);
  }

  resolveFontFace(options: PdfFontResolveOptions): PdfRegisteredFontFace {
    const family = normalizeFamily(options.fontFamily);
    const bold = Boolean(options.bold);
    const italic = Boolean(options.italic);

    return (
      this.faces.get(faceKey(family, bold, italic)) ??
      this.faces.get(faceKey(this.fallbackFamily, bold, italic)) ??
      this.faces.get(faceKey(this.fallbackFamily, false, false))!
    );
  }

  getPdfFontResources(): OasisPdfFontResource[] {
    const resources = new Map<string, OasisPdfFontResource>();
    for (const face of this.faces.values()) {
      resources.set(face.pdfResource.resourceName, face.pdfResource);
    }
    return Array.from(resources.values());
  }
}
