export const W_NS = "w";
export const R_NS = "r";
export const WP_NS = "wp";
export const A_NS = "a";
export const PIC_NS = "pic";

export const MAIN_NS_DECL = [
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:o="urn:schemas-microsoft-com:office:office"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
  'xmlns:v="urn:schemas-microsoft-com:vml"',
  'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:w10="urn:schemas-microsoft-com:office:word"',
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"',
  'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"',
  'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
];

let relIdCounter = 1;
export const nextRelId = (): string => `rId${relIdCounter++}`;
export const getRelIdCounter = (): number => relIdCounter;
export const resetRelIdCounter = (): void => { relIdCounter = 1; };

let bookmarkIdCounter = 100;
const bookmarkNameToId = new Map<string, number>();
export const getBookmarkId = (name: string): number => {
  if (!bookmarkNameToId.has(name)) {
    bookmarkNameToId.set(name, bookmarkIdCounter++);
  }
  return bookmarkNameToId.get(name)!;
};
export const resetBookmarkCounter = (): void => {
  bookmarkIdCounter = 100;
  bookmarkNameToId.clear();
};

export function pxToEmu(px: number): number {
  return Math.round(px * 914400 / 96);
}

export function pxToTwip(px: number): number {
  return Math.round((px / 96) * 1440);
}

export function parseDataUri(dataUri: string): { mime: string; ext: string; data: Uint8Array } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
  };

  return { mime, ext: extMap[mime] ?? "bin", data: bytes };
}
