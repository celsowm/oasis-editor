/**
 * Shared registry of the bundled, metric-compatible font assets and the helpers
 * that load their bytes. These fonts ship in `./assets/` and are reused by both
 * the PDF exporter (glyph embedding) and the layout engine (advance-width
 * metrics), so the alias map and loader live here as the single source of truth.
 *
 * Asset URLs are resolved relative to *this* module's location, which is why
 * this file is co-located with `assets/`: the same `import.meta.url` math then
 * works in both the unbundled source tree and the flat built library.
 */

export interface FontFaceFiles {
  regular: string;
  bold: string;
  italic: string;
  bolditalic: string;
}

export interface OfficeFontFamilyDef {
  family: string;
  aliases: string[];
  files: FontFaceFiles;
}

export const ROBOTO_FONT_FILES: FontFaceFiles = {
  regular: "Roboto-Regular.ttf",
  bold: "Roboto-Medium.ttf",
  italic: "Roboto-Italic.ttf",
  bolditalic: "Roboto-MediumItalic.ttf",
};

export const OFFICE_COMPAT_FONT_FAMILIES: OfficeFontFamilyDef[] = [
  {
    family: "Carlito",
    aliases: [
      "Calibri",
      "Calibri Light",
      "Aptos",
      "Aptos Display",
      "Aptos Narrow",
    ],
    files: {
      regular: "Carlito-Regular.ttf",
      bold: "Carlito-Bold.ttf",
      italic: "Carlito-Italic.ttf",
      bolditalic: "Carlito-BoldItalic.ttf",
    },
  },
  {
    family: "Arimo",
    aliases: ["Arial"],
    files: {
      regular: "Arimo-Regular.ttf",
      bold: "Arimo-Bold.ttf",
      italic: "Arimo-Italic.ttf",
      bolditalic: "Arimo-BoldItalic.ttf",
    },
  },
  {
    family: "Tinos",
    aliases: ["Times New Roman", "Times"],
    files: {
      regular: "Tinos-Regular.ttf",
      bold: "Tinos-Bold.ttf",
      italic: "Tinos-Italic.ttf",
      bolditalic: "Tinos-BoldItalic.ttf",
    },
  },
];

export function normalizeFamily(fontFamily: string | null | undefined): string {
  const firstFamily = (fontFamily ?? "Helvetica")
    .split(",")[0]
    ?.trim()
    .replace(/^['"]|['"]$/g, "");
  return firstFamily && firstFamily.length > 0 ? firstFamily : "Helvetica";
}

/** Maps a bold/italic combination to the corresponding {@link FontFaceFiles} key. */
export function faceStyleKey(
  bold: boolean,
  italic: boolean,
): keyof FontFaceFiles {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "regular";
}

export function resolveFontAssetUrl(fileName: string): string {
  return `${import.meta.url.replace(/[^/]*$/, "")}assets/${encodeURIComponent(fileName)}`;
}

interface NodeBuiltins {
  fs?: {
    readFileSync(path: string | URL): Uint8Array;
  };
  fileURLToPath?: (url: string) => string;
}

function getNodeBuiltins(): NodeBuiltins {
  const processObject = new Function(
    "return typeof process === 'object' ? process : undefined",
  )() as { getBuiltinModule?(id: string): unknown } | undefined;
  const dynamicRequire = new Function(
    "return typeof require === 'function' ? require : undefined",
  )() as ((id: string) => unknown) | undefined;
  const getBuiltin = (id: string): unknown =>
    processObject?.getBuiltinModule?.(id) ?? dynamicRequire?.(id);
  const fs = getBuiltin("node:fs") as NodeBuiltins["fs"];
  const fileURLToPath = (
    getBuiltin("node:url") as { fileURLToPath(url: string): string } | undefined
  )?.fileURLToPath;
  return { fs, fileURLToPath };
}

/**
 * Synchronously reads a bundled font asset. Only works under Node (via
 * `fs.readFileSync`); returns `null` in the browser, where callers must
 * pre-warm the cache through {@link loadFontAsset} instead.
 */
export function readFontAssetSync(fileName: string): Uint8Array | null {
  const assetUrl = resolveFontAssetUrl(fileName);
  try {
    const { fs, fileURLToPath } = getNodeBuiltins();
    if (!fs) return null;
    if (assetUrl.startsWith("file:")) {
      return fs.readFileSync(new URL(assetUrl));
    }
    return fileURLToPath ? fs.readFileSync(fileURLToPath(assetUrl)) : null;
  } catch {
    return null;
  }
}

const fontAssetCache = new Map<string, Promise<Uint8Array | null>>();

export function loadFontAsset(fileName: string): Promise<Uint8Array | null> {
  const cachedFontAsset = fontAssetCache.get(fileName);
  if (cachedFontAsset) {
    return cachedFontAsset;
  }
  const fontAsset = readFontAsset(fileName);
  fontAssetCache.set(fileName, fontAsset);
  return fontAsset;
}

async function readFontAsset(fileName: string): Promise<Uint8Array | null> {
  const assetUrl = resolveFontAssetUrl(fileName);
  try {
    if (assetUrl.startsWith("file:")) {
      const { fs } = getNodeBuiltins();
      return fs?.readFileSync(new URL(assetUrl)) ?? null;
    }

    if (typeof fetch === "function") {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        return null;
      }
      return new Uint8Array(await response.arrayBuffer());
    }

    const { fs, fileURLToPath } = getNodeBuiltins();
    if (!fs || !fileURLToPath) {
      return null;
    }
    return fs.readFileSync(fileURLToPath(assetUrl));
  } catch {
    return null;
  }
}
