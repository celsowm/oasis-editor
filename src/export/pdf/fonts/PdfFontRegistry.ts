import type { OasisPdfFontResource } from "../OasisPdfWriter.js";
import {
  loadFontAsset,
  normalizeFamily,
  OFFICE_COMPAT_FONT_FAMILIES,
  ROBOTO_FONT_FILES,
} from "./officeFontAssets.js";

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

export interface PdfBundledFontLoadOptions {
  families?: Iterable<string | null | undefined>;
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
    pdfResource: {
      kind: "base14",
      resourceName: "F2",
      baseFont: "Helvetica-Bold",
    },
  },
  {
    key: "helvetica:italic",
    family: "Helvetica",
    bold: false,
    italic: true,
    writerResourceName: "F3",
    pdfResource: {
      kind: "base14",
      resourceName: "F3",
      baseFont: "Helvetica-Oblique",
    },
  },
  {
    key: "helvetica:bolditalic",
    family: "Helvetica",
    bold: true,
    italic: true,
    writerResourceName: "F4",
    pdfResource: {
      kind: "base14",
      resourceName: "F4",
      baseFont: "Helvetica-BoldOblique",
    },
  },
];

function faceKey(family: string, bold: boolean, italic: boolean): string {
  return `${family.toLowerCase()}:${bold ? "bold" : "regular"}${italic ? "italic" : ""}`;
}

export class PdfFontRegistry {
  private readonly faces = new Map<string, PdfRegisteredFontFace>();
  private fallbackFamily = "Helvetica";

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

  async loadBundledUnicodeFaces(
    options: PdfBundledFontLoadOptions = {},
  ): Promise<void> {
    const requestedFamilies = options.families
      ? new Set(
          Array.from(options.families)
            .map(normalizeFamily)
            .map((family) => family.toLowerCase()),
        )
      : null;
    const matchedFamilies =
      await this.registerOfficeCompatibleFaces(requestedFamilies);

    const shouldLoadRoboto =
      !requestedFamilies ||
      requestedFamilies.has("roboto") ||
      Array.from(requestedFamilies).some(
        (family) => family !== "helvetica" && !matchedFamilies.has(family),
      );
    if (!shouldLoadRoboto) {
      return;
    }

    for (const [style, assetUrl] of Object.entries(ROBOTO_FONT_FILES)) {
      const fontData = await loadFontAsset(assetUrl);
      if (!fontData) {
        continue;
      }
      const bold = style === "bold" || style === "bolditalic";
      const italic = style === "italic" || style === "bolditalic";
      const resourceName = `Roboto${style[0]!.toUpperCase()}${style.slice(1)}`;
      this.registerFontFace({
        key: `roboto:${style}`,
        family: "Roboto",
        bold,
        italic,
        writerResourceName: resourceName,
        pdfResource: {
          kind: "unicode",
          resourceName,
          family: "Roboto",
          fontData,
        },
      });
      this.fallbackFamily = "Roboto";
    }
  }

  private async registerOfficeCompatibleFaces(
    requestedFamilies: Set<string> | null,
  ): Promise<Set<string>> {
    const matchedFamilies = new Set<string>();
    for (const familyDefinition of OFFICE_COMPAT_FONT_FAMILIES) {
      const familyNames = [
        familyDefinition.family,
        ...familyDefinition.aliases,
      ].map((family) => family.toLowerCase());
      const shouldLoad =
        !requestedFamilies ||
        familyNames.some((family) => requestedFamilies.has(family));
      if (!shouldLoad) {
        continue;
      }

      for (const family of familyNames) {
        matchedFamilies.add(family);
      }

      const registeredFaces: PdfRegisteredFontFace[] = [];
      for (const [style, assetUrl] of Object.entries(familyDefinition.files)) {
        const fontData = await loadFontAsset(assetUrl);
        if (!fontData) {
          continue;
        }
        const bold = style === "bold" || style === "bolditalic";
        const italic = style === "italic" || style === "bolditalic";
        const resourceName = `${familyDefinition.family}${style[0]!.toUpperCase()}${style.slice(1)}`;
        const face: PdfRegisteredFontFace = {
          key: `${familyDefinition.family.toLowerCase()}:${style}`,
          family: familyDefinition.family,
          bold,
          italic,
          writerResourceName: resourceName,
          pdfResource: {
            kind: "unicode",
            resourceName,
            family: familyDefinition.family,
            fontData,
          },
        };
        this.registerFontFace(face);
        registeredFaces.push(face);
      }

      for (const alias of familyDefinition.aliases) {
        for (const face of registeredFaces) {
          this.registerFontFace({
            ...face,
            key: `${alias.toLowerCase()}:${face.key.split(":")[1]}`,
            family: alias,
          });
        }
      }
    }
    return matchedFamilies;
  }
}
