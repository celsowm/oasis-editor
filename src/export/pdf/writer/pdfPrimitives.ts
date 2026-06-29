/**
 * Pure, stateless helpers for emitting PDF syntax: number/color formatting,
 * string encoding (WinAnsi + UTF-16BE hex), stream-object bodies, and the
 * ToUnicode CMap builder. None of these touch writer state, so they are shared
 * freely by the content stream, font table, image table and serializer.
 */
import type { OasisPdfFontResource, OasisPdfTextOptions } from "./pdfTypes.js";
import { parseHexColorToRgb255 } from "@/core/color.js";

export const PDF_HEADER = "%PDF-1.4\n% Oasis PDF\n";

export const DEFAULT_PDF_FONT_RESOURCES: OasisPdfFontResource[] = [
  { kind: "base14", resourceName: "F1", baseFont: "Helvetica" },
  { kind: "base14", resourceName: "F2", baseFont: "Helvetica-Bold" },
  { kind: "base14", resourceName: "F3", baseFont: "Helvetica-Oblique" },
  { kind: "base14", resourceName: "F4", baseFont: "Helvetica-BoldOblique" },
];

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number(value.toFixed(3)).toString();
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte): string => byte.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

export function toHex16(value: number): string {
  return Math.max(0, value)
    .toString(16)
    .padStart(4, "0")
    .slice(-4)
    .toUpperCase();
}

export function colorToRgb(
  color: string | undefined,
  fallback: [number, number, number],
): [number, number, number] {
  if (!color) {
    return fallback;
  }

  const rgb = parseHexColorToRgb255(color);
  if (!rgb) {
    return fallback;
  }

  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

export function colorCommand(
  color: string | undefined,
  operator: "rg" | "RG",
  fallback: [number, number, number],
): string {
  const [r, g, b] = colorToRgb(color, fallback);
  return `${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} ${operator}`;
}

export function resolveFontName(
  options: Pick<OasisPdfTextOptions, "bold" | "italic" | "fontResourceName">,
): string {
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

export function fontResourceObjectBody(resource: OasisPdfFontResource): string {
  switch (resource.kind) {
    case "base14":
      return `<< /Type /Font /Subtype /Type1 /BaseFont /${resource.baseFont} /Encoding /WinAnsiEncoding >>`;
    case "unicode":
      return "<< /Type /Font /Subtype /Type0 /BaseFont /OasisPending /Encoding /Identity-H >>";
  }
}

export function sanitizePdfName(
  value: string | undefined,
  fallback: string,
): string {
  const normalized = (
    value && value.trim().length > 0 ? value : fallback
  ).replaceAll(" ", "_");
  return normalized.replace(/[^A-Za-z0-9_.+-]/g, "");
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
  if (
    (codePoint >= 0x20 && codePoint <= 0x7e) ||
    (codePoint >= 0xa0 && codePoint <= 0xff)
  ) {
    return codePoint;
  }
  return WIN_ANSI_OVERRIDES.get(codePoint) ?? 0x3f;
}

export function encodePdfHexString(value: string): string {
  return Array.from(value)
    .map((char): string =>
      encodeWinAnsiByte(char).toString(16).padStart(2, "0").toUpperCase(),
    )
    .join("");
}

export function encodePdfUtf16Hex(codePoints: number[]): string {
  const values: number[] = [];
  for (let value of codePoints) {
    if (value > 0xffff) {
      value -= 0x10000;
      values.push(((value >>> 10) & 0x3ff) | 0xd800);
      values.push((value & 0x3ff) | 0xdc00);
    } else {
      values.push(value);
    }
  }
  return values.map(toHex16).join("");
}

export function buildToUnicodeCMap(unicode: number[][]): string {
  const entries = unicode
    .map((codePoints): string => `<${encodePdfUtf16Hex(codePoints)}>`)
    .filter((entry): boolean => entry !== "<>");
  if (entries.length === 0) {
    entries.push("<0000>");
  }

  const ranges: string[] = [];
  const chunkSize = 256;
  for (let start = 0; start < entries.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, entries.length);
    ranges.push(
      `<${toHex16(start)}> <${toHex16(end - 1)}> [${entries.slice(start, end).join(" ")}]`,
    );
  }

  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo <<",
    "  /Registry (Adobe)",
    "  /Ordering (UCS)",
    "  /Supplement 0",
    ">> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000><ffff>",
    "endcodespacerange",
    `${ranges.length} beginbfrange`,
    ranges.join("\n"),
    "endbfrange",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
    "",
  ].join("\n");
}

export function streamObjectBody(stream: string, extraDictionary = ""): string {
  const dictionary = extraDictionary
    ? ` /${extraDictionary.trim().replace(/^\/+/, "")}`
    : "";
  return `<< /Length ${byteLength(stream)}${dictionary} >>\nstream\n${stream}endstream`;
}

export function asciiHexStreamObjectBody(
  bytes: Uint8Array,
  extraDictionary = "",
): string {
  const stream = `${bytesToHex(bytes)}>`;
  const dictionary = extraDictionary
    ? ` /${extraDictionary.trim().replace(/^\/+/, "")}`
    : "";
  return `<< /Length ${byteLength(stream)} /Filter /ASCIIHexDecode${dictionary} >>\nstream\n${stream}\nendstream`;
}

export function asciiHexImageStreamObjectBody(
  bytes: Uint8Array,
  dictionaryEntries: string[],
): string {
  const stream = `${bytesToHex(bytes)}>`;
  return [
    `<< /Length ${byteLength(stream)}`,
    " /Filter [/ASCIIHexDecode /DCTDecode]",
    ` ${dictionaryEntries.join(" ")}`,
    " >>",
    "stream",
    stream,
    "endstream",
  ].join("\n");
}

export function encodeGlyphHex(glyphId: number): string {
  return toHex16(glyphId);
}

export function textMarkerComment(value: string): string {
  const codePoints = Array.from(value).map(
    (char): number => char.codePointAt(0) ?? 0xfffd,
  );
  return `% OasisText ${encodePdfUtf16Hex(codePoints)}`;
}
