import type { EditorImageRunData } from "../model.js";

export function parseInlineImage(
  element: Element,
): EditorImageRunData | undefined {
  if (element.tagName !== "IMG") {
    return undefined;
  }

  const img = element as HTMLImageElement;
  const src = img.getAttribute("src")?.trim() ?? "";
  if (!src) {
    return undefined;
  }

  const widthAttr = img.getAttribute("width")?.trim() ?? "";
  const heightAttr = img.getAttribute("height")?.trim() ?? "";
  const widthStyle = img.style.width.trim();
  const heightStyle = img.style.height.trim();
  const widthFromStyle = widthStyle.endsWith("px")
    ? Number.parseFloat(widthStyle)
    : Number.NaN;
  const heightFromStyle = heightStyle.endsWith("px")
    ? Number.parseFloat(heightStyle)
    : Number.NaN;
  const widthFromAttr = Number.parseFloat(widthAttr);
  const heightFromAttr = Number.parseFloat(heightAttr);

  const width = Number.isFinite(widthFromStyle)
    ? widthFromStyle
    : Number.isFinite(widthFromAttr)
      ? widthFromAttr
      : 100;
  const height = Number.isFinite(heightFromStyle)
    ? heightFromStyle
    : Number.isFinite(heightFromAttr)
      ? heightFromAttr
      : 100;
  const altAttr = img.getAttribute("alt");

  const image: EditorImageRunData = {
    src,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };

  if (altAttr !== null) {
    image.alt = altAttr;
  }

  return image;
}
