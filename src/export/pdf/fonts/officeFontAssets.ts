/**
 * Shared registry of bundled, metric-compatible font assets. The original
 * bytes are embedded as base64 and decoded through the internal font pipeline:
 * browsers receive the original font for FontFace, while layout/PDF receive cached sfnt
 * bytes reconstructed from the same source.
 */
import { defaultFontDecoderRegistry } from "@/text/fonts/decoders/FontDecoderRegistry.js";
import ArimoRegular from "./assets/Arimo-Regular.woff2?base64";
import ArimoBold from "./assets/Arimo-Bold.woff2?base64";
import ArimoItalic from "./assets/Arimo-Italic.woff2?base64";
import ArimoBoldItalic from "./assets/Arimo-BoldItalic.woff2?base64";
import CarlitoRegular from "./assets/Carlito-Regular.woff2?base64";
import CarlitoBold from "./assets/Carlito-Bold.woff2?base64";
import CarlitoItalic from "./assets/Carlito-Italic.woff2?base64";
import CarlitoBoldItalic from "./assets/Carlito-BoldItalic.woff2?base64";
import TinosRegular from "./assets/Tinos-Regular.woff2?base64";
import TinosBold from "./assets/Tinos-Bold.woff2?base64";
import TinosItalic from "./assets/Tinos-Italic.woff2?base64";
import TinosBoldItalic from "./assets/Tinos-BoldItalic.woff2?base64";
import OpenSansRegular from "./assets/OpenSans-Regular.woff2?base64";
import OpenSansBold from "./assets/OpenSans-Bold.woff2?base64";
import OpenSansItalic from "./assets/OpenSans-Italic.woff2?base64";
import OpenSansBoldItalic from "./assets/OpenSans-BoldItalic.woff2?base64";
import RobotoRegular from "./assets/Roboto-Regular.woff2?base64";
import RobotoMedium from "./assets/Roboto-Medium.woff2?base64";
import RobotoItalic from "./assets/Roboto-Italic.woff2?base64";
import RobotoMediumItalic from "./assets/Roboto-MediumItalic.woff2?base64";

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
  regular: "Roboto-Regular.woff2",
  bold: "Roboto-Medium.woff2",
  italic: "Roboto-Italic.woff2",
  bolditalic: "Roboto-MediumItalic.woff2",
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
      regular: "Carlito-Regular.woff2",
      bold: "Carlito-Bold.woff2",
      italic: "Carlito-Italic.woff2",
      bolditalic: "Carlito-BoldItalic.woff2",
    },
  },
  {
    family: "Arimo",
    aliases: ["Arial"],
    files: {
      regular: "Arimo-Regular.woff2",
      bold: "Arimo-Bold.woff2",
      italic: "Arimo-Italic.woff2",
      bolditalic: "Arimo-BoldItalic.woff2",
    },
  },
  {
    family: "Tinos",
    aliases: ["Times New Roman", "Times"],
    files: {
      regular: "Tinos-Regular.woff2",
      bold: "Tinos-Bold.woff2",
      italic: "Tinos-Italic.woff2",
      bolditalic: "Tinos-BoldItalic.woff2",
    },
  },
  {
    family: "Open Sans",
    aliases: ["OpenSans"],
    files: {
      regular: "OpenSans-Regular.woff2",
      bold: "OpenSans-Bold.woff2",
      italic: "OpenSans-Italic.woff2",
      bolditalic: "OpenSans-BoldItalic.woff2",
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

export function resolveMetricCompatibleFamily(
  fontFamily: string | null | undefined,
): string {
  const normalized = normalizeFamily(fontFamily).toLowerCase();
  for (const definition of OFFICE_COMPAT_FONT_FAMILIES) {
    const names = [definition.family, ...definition.aliases].map((name): string =>
      name.toLowerCase(),
    );
    if (names.includes(normalized)) {
      return definition.family;
    }
  }
  return "Roboto";
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

/** File name → embedded WOFF2 base64 string, inlined via the Vite plugin. */
const EMBEDDED_FONT_BASE64: Record<string, string> = {
  "Arimo-Regular.woff2": ArimoRegular,
  "Arimo-Bold.woff2": ArimoBold,
  "Arimo-Italic.woff2": ArimoItalic,
  "Arimo-BoldItalic.woff2": ArimoBoldItalic,
  "Carlito-Regular.woff2": CarlitoRegular,
  "Carlito-Bold.woff2": CarlitoBold,
  "Carlito-Italic.woff2": CarlitoItalic,
  "Carlito-BoldItalic.woff2": CarlitoBoldItalic,
  "Tinos-Regular.woff2": TinosRegular,
  "Tinos-Bold.woff2": TinosBold,
  "Tinos-Italic.woff2": TinosItalic,
  "Tinos-BoldItalic.woff2": TinosBoldItalic,
  "OpenSans-Regular.woff2": OpenSansRegular,
  "OpenSans-Bold.woff2": OpenSansBold,
  "OpenSans-Italic.woff2": OpenSansItalic,
  "OpenSans-BoldItalic.woff2": OpenSansBoldItalic,
  "Roboto-Regular.woff2": RobotoRegular,
  "Roboto-Medium.woff2": RobotoMedium,
  "Roboto-Italic.woff2": RobotoItalic,
  "Roboto-MediumItalic.woff2": RobotoMediumItalic,
};

function decodeBase64(base64: string): Uint8Array {
  // `atob` is a global in browsers, jsdom, and modern Node (used by vitest).
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const originalFontCache = new Map<string, Uint8Array | null>();
// Only successful decodes are memoised here, shared by the sync and async
// loaders. Sync failures are tracked separately (see `syncDecodeFailed`) so a
// failed *synchronous* decode — expected in the browser, which has no Node
// zlib brotli — never blocks the async preloader from decoding the same face.
const decodedFontCache = new Map<string, Uint8Array>();
const syncDecodeFailed = new Set<string>();

function getOriginalFontBytes(fileName: string): Uint8Array | null {
  const cached = originalFontCache.get(fileName);
  if (cached !== undefined) {
    return cached;
  }
  const base64 = EMBEDDED_FONT_BASE64[fileName];
  const bytes = base64 ? decodeBase64(base64) : null;
  originalFontCache.set(fileName, bytes);
  return bytes;
}

/**
 * Returns the original bundled font bytes, used for browser FontFace
 * registration.
 */
export function readOriginalFontAsset(fileName: string): Uint8Array | null {
  return getOriginalFontBytes(fileName);
}

export function readFontAssetSync(fileName: string): Uint8Array | null {
  const cached = decodedFontCache.get(fileName);
  if (cached) return cached;
  if (syncDecodeFailed.has(fileName)) return null;
  const original = getOriginalFontBytes(fileName);
  if (!original) {
    syncDecodeFailed.add(fileName);
    return null;
  }
  try {
    const decoded = defaultFontDecoderRegistry.decodeSync(original);
    decodedFontCache.set(fileName, decoded);
    return decoded;
  } catch {
    // No synchronous brotli (e.g. the browser). The async preloader can still
    // decode this face — do not poison the shared cache with a failure.
    syncDecodeFailed.add(fileName);
    return null;
  }
}

export async function loadFontAsset(
  fileName: string,
): Promise<Uint8Array | null> {
  const cached = decodedFontCache.get(fileName);
  if (cached) return cached;
  const original = getOriginalFontBytes(fileName);
  if (!original) {
    return null;
  }
  try {
    const decoded = await defaultFontDecoderRegistry.decode(original);
    decodedFontCache.set(fileName, decoded);
    return decoded;
  } catch {
    // A single face failing to decode must not reject the whole preload batch
    // (Promise.all), which would prevent the post-preload layout recompute.
    return null;
  }
}
