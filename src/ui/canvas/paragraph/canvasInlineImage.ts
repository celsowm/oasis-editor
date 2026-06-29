import type {
  EditorImageRunData,
  EditorLayoutLine,
  EditorPageSettings,
  EditorState, EditorCaretSlot } from "@/core/model.js";
import { resolveImageSrc } from "@/core/model.js";
import {
  getImageFloatingGeometry,
  resolveFloatingObjectRect,
} from "@/layoutProjection/floatingObjects.js";
import { DEG_TO_RAD } from "../canvasBorders.js";
import { getCachedCanvasImage } from "../canvasImageCache.js";
import { resolveInlineObjectRect } from "../canvasInlineReaders.js";

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 1 ? 1 : value;
}

/**
 * Draw an inline image fragment, honoring crop (`a:srcRect`), rotation
 * (`a:xfrm/@rot`) and horizontal/vertical flips.
 */
export function drawImageFragment(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
  image: EditorImageRunData,
  x: number,
  y: number,
): void {
  const { width, height, crop, fillMode, rotation, flipH, flipV } = image;
  const hasTransform = Boolean(rotation) || Boolean(flipH) || Boolean(flipV);

  if (fillMode === "tile") {
    const pattern = ctx.createPattern(img, "repeat");
    if (!pattern) {
      ctx.drawImage(img, x, y, width, height);
      return;
    }
    ctx.save();
    if (hasTransform) {
      ctx.translate(x + width / 2, y + height / 2);
      if (rotation) ctx.rotate(rotation * DEG_TO_RAD);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    ctx.translate(x, y);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (crop) {
    const left = clamp01(crop.left ?? 0);
    const top = clamp01(crop.top ?? 0);
    const right = clamp01(crop.right ?? 0);
    const bottom = clamp01(crop.bottom ?? 0);
    if (left + right < 1 && top + bottom < 1) {
      sx = left * img.naturalWidth;
      sy = top * img.naturalHeight;
      sw = (1 - left - right) * img.naturalWidth;
      sh = (1 - top - bottom) * img.naturalHeight;
    }
  }

  if (!hasTransform) {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
    return;
  }

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  if (rotation) ctx.rotate(rotation * DEG_TO_RAD);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/**
 * Draws the floating images anchored within a paragraph (behind or front layer).
 */
export function drawFloatingImagesForParagraph(options: {
  ctx: CanvasRenderingContext2D;
  paragraphLines: EditorLayoutLine[];
  state: EditorState;
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  onUpdate: () => void;
  layer: "behind" | "front";
}): void {
  const {
    ctx,
    paragraphLines,
    state,
    pageSettings,
    contentLeft,
    contentTop,
    contentWidth,
    paragraphTop,
    onUpdate,
    layer,
  } = options;

  for (const line of paragraphLines) {
    const slotByOffset = new Map(
      line.slots.map((slot): readonly [number, EditorCaretSlot] => [slot.offset, slot] as const),
    );
    for (const fragment of line.fragments) {
      const image = fragment.image;
      if (!image?.floating) continue;
      const isBehind = Boolean(image.floating.behindDoc);
      if ((layer === "behind") !== isBehind) continue;
      const slot = slotByOffset.get(fragment.startOffset);
      const anchorLeft = contentLeft + (slot?.left ?? 0);
      const lineTop = paragraphTop + line.top;
      const rect = resolveFloatingObjectRect({
        object: getImageFloatingGeometry(image),
        pageSettings,
        contentLeft,
        contentTop,
        contentWidth,
        paragraphTop,
        lineTop,
        anchorLeft,
      });
      const src = resolveImageSrc(state.document, image.src);
      const img = getCachedCanvasImage(src, onUpdate);
      if (img.complete && img.naturalWidth > 0) {
        drawImageFragment(ctx, img, image, rect.x, rect.y);
      }
    }
  }
}

export function drawInlineImageFragment(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  state: EditorState,
  originX: number,
  originY: number,
  onUpdate: () => void,
): boolean {
  if (!fragment.image || fragment.image.floating) return false;
  const slotByOffset = new Map(
    line.slots.map((slot): readonly [number, EditorCaretSlot] => [slot.offset, slot] as const),
  );
  const slot = slotByOffset.get(fragment.startOffset);
  if (!slot) return false;
  const src = resolveImageSrc(state.document, fragment.image.src);
  const img = getCachedCanvasImage(src, onUpdate);
  if (img.complete && img.naturalWidth > 0) {
    const rect = resolveInlineObjectRect({
      originLeft: originX,
      originTop: originY,
      lineTop: line.top,
      lineHeight: line.height,
      slotLeft: slot.left,
      objectWidth: fragment.image.width,
      objectHeight: fragment.image.height,
    });
    drawImageFragment(ctx, img, fragment.image, rect.left, rect.top);
  }
  return true;
}
