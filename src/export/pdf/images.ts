import type { EditorDocument, EditorImageRunData } from "@/core/model.js";
import { resolveImageSrc } from "@/core/model.js";
import { OasisPdfWriter } from "./OasisPdfWriter.js";

interface PreparedPdfImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const imageResourceCache = new WeakMap<
  OasisPdfWriter,
  Map<string, Promise<string | null>>
>();

function parseDataUrl(
  src: string,
): { mediaType: string; data: Uint8Array } | null {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(src);
  if (!match) {
    return null;
  }
  const mediaType = match[1]!.toLowerCase();
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  if (!isBase64) {
    return {
      mediaType,
      data: new TextEncoder().encode(decodeURIComponent(payload)),
    };
  }
  const binary =
    typeof atob === "function"
      ? atob(payload)
      : Buffer.from(payload, "base64").toString("binary");
  return {
    mediaType,
    data: Uint8Array.from(binary, (char): number => char.charCodeAt(0)),
  };
}

async function fetchAsDataUrl(src: string): Promise<string | null> {
  if (typeof fetch !== "function") {
    return null;
  }
  const response = await fetch(src);
  if (!response.ok) {
    return null;
  }
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const binary = Array.from(bytes, (byte): string => String.fromCharCode(byte)).join(
    "",
  );
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:${blob.type || "application/octet-stream"};base64,${base64}`;
}

async function loadBrowserImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") {
    return null;
  }
  return await new Promise((resolve): void => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = (): void => resolve(image);
    image.onerror = (): void => resolve(null);
    image.src = src;
  });
}

function rasterizeImageToJpegDataUrl(image: HTMLImageElement): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function preparePdfImage(
  src: string,
  fallbackWidth: number,
  fallbackHeight: number,
): Promise<PreparedPdfImage | null> {
  let resolvedSrc = src;
  if (!resolvedSrc.startsWith("data:")) {
    resolvedSrc = (await fetchAsDataUrl(resolvedSrc)) ?? resolvedSrc;
  }

  let parsed = parseDataUrl(resolvedSrc);
  if (!parsed) {
    return null;
  }

  // The PDF image XObject's /Width and /Height must equal the real pixel
  // resolution of the embedded stream, not the on-page display size (which is
  // applied separately via the drawImage transform). Decode the bitmap so we
  // can report its natural dimensions; without a DOM we fall back to the
  // caller-provided display dimensions.
  const image =
    typeof Image !== "undefined" ? await loadBrowserImage(resolvedSrc) : null;
  const hasNaturalSize =
    image != null && image.naturalWidth > 0 && image.naturalHeight > 0;

  if (parsed.mediaType !== "image/jpeg" && parsed.mediaType !== "image/jpg") {
    if (!hasNaturalSize) {
      return null;
    }
    const jpegDataUrl = rasterizeImageToJpegDataUrl(image);
    parsed = jpegDataUrl ? parseDataUrl(jpegDataUrl) : null;
    if (!parsed) {
      return null;
    }
  }

  const width = hasNaturalSize ? image.naturalWidth : fallbackWidth;
  const height = hasNaturalSize ? image.naturalHeight : fallbackHeight;

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    data: parsed.data,
  };
}

export async function registerPdfImageRun(
  writer: OasisPdfWriter,
  document: EditorDocument,
  image: EditorImageRunData,
): Promise<string | null> {
  const resolvedSrc = resolveImageSrc(document, image.src);
  if (!resolvedSrc) {
    return null;
  }

  let perWriter = imageResourceCache.get(writer);
  if (!perWriter) {
    perWriter = new Map();
    imageResourceCache.set(writer, perWriter);
  }

  const cached = perWriter.get(resolvedSrc);
  if (cached) {
    return cached;
  }

  const preparedPromise = preparePdfImage(
    resolvedSrc,
    image.width,
    image.height,
  ).then((prepared): string | null => {
    if (!prepared) {
      return null;
    }
    return writer.registerImageResource({
      width: prepared.width,
      height: prepared.height,
      data: prepared.data,
      filter: "DCTDecode",
    });
  });
  perWriter.set(resolvedSrc, preparedPromise);
  return preparedPromise;
}
