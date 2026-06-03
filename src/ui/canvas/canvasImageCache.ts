const imageCache = new Map<string, HTMLImageElement>();

export function getCachedCanvasImage(
  src: string,
  onUpdate: () => void,
): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  img.onload = onUpdate;
  imageCache.set(src, img);
  return img;
}
