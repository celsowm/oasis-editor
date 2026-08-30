import type { EditorDocument, EditorImageRunData } from "@/core/model.js";
import { lineDashPatternPt } from "@/core/lineDash.js";
import { registerPdfImageRun } from "@/export/pdf/images.js";
import type { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import type { OasisPdfPathSegment } from "@/export/pdf/writer/pdfTypes.js";
import { getPresetPathSegments } from "@/layoutProjection/presetGeometry.js";

function transformPath(
  segments: ReturnType<typeof getPresetPathSegments>,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
): OasisPdfPathSegment[] {
  if (!rotation) return segments;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const radians = (rotation * Math.PI) / 180;
  const rotate = (px: number, py: number): { x: number; y: number } => ({
    x: cx + (px - cx) * Math.cos(radians) - (py - cy) * Math.sin(radians),
    y: cy + (px - cx) * Math.sin(radians) + (py - cy) * Math.cos(radians),
  });
  return segments.map((segment): OasisPdfPathSegment => {
    if (segment.type === "close") return segment;
    if (segment.type === "cubic") {
      const p1 = rotate(segment.x1, segment.y1);
      const p2 = rotate(segment.x2, segment.y2);
      const p = rotate(segment.x, segment.y);
      return {
        type: "cubic",
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        x: p.x,
        y: p.y,
      };
    }
    const p = rotate(segment.x, segment.y);
    return { type: segment.type, x: p.x, y: p.y };
  });
}

/**
 * Draws one image — inline or floating — onto a page: the XObject itself, then
 * its picture outline (`pic:spPr/a:ln`) if it has one. Shared by both call
 * sites so the two can never drift on border handling.
 *
 * The rect passed in is the displayed box, in points. Crop never changes it:
 * `drawImage` already clips the (enlarged) source to this same box, so the
 * outline hugs what the reader sees. Rotation is applied around the box centre,
 * mirroring `paintTextBox`.
 */
export async function drawImageObject(
  writer: OasisPdfWriter,
  pageIndex: number,
  document: EditorDocument,
  image: EditorImageRunData,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  const resourceName = await registerPdfImageRun(writer, document, image);
  if (!resourceName) {
    return;
  }
  const sourceWidth = image.intrinsicWidth ?? image.width;
  const sourceHeight = image.intrinsicHeight ?? image.height;
  const sourceRatio = sourceWidth / Math.max(1, sourceHeight);
  const frameRatio = width / Math.max(1, height);
  let drawX = x;
  let drawY = y;
  let drawWidth = width;
  let drawHeight = height;
  if (image.cropFit === "fit" && sourceRatio > 0) {
    if (sourceRatio > frameRatio) {
      drawHeight = width / sourceRatio;
      drawY += (height - drawHeight) / 2;
    } else {
      drawWidth = height * sourceRatio;
      drawX += (width - drawWidth) / 2;
    }
  }

  const effectiveCrop =
    image.cropFit === "fill" && !image.crop
      ? ((): EditorImageRunData["crop"] => {
          if (sourceRatio > frameRatio) {
            const visible = frameRatio / sourceRatio;
            const trim = Math.max(0, (1 - visible) / 2);
            return { left: trim, right: trim };
          }
          if (sourceRatio < frameRatio) {
            const visible = sourceRatio / frameRatio;
            const trim = Math.max(0, (1 - visible) / 2);
            return { top: trim, bottom: trim };
          }
          return undefined;
        })()
      : image.crop;

  const shape = image.cropShape?.preset;
  const shapePath = shape
    ? transformPath(
        getPresetPathSegments(shape, x, y, width, height),
        x,
        y,
        width,
        height,
        image.rotation ?? 0,
      )
    : null;
  // Fit places the complete source inside the frame. When the frame is
  // rotated, the content must rotate around the frame centre as it does on
  // canvas; passing the smaller fit rectangle's rotation to drawImage would
  // incorrectly rotate around that rectangle's own centre.
  const rotateFitAroundFrame =
    image.cropFit === "fit" && Boolean(image.rotation);
  if (shapePath) {
    writer.saveGraphicsState(pageIndex);
    writer.clipPath(pageIndex, shapePath);
  }
  if (rotateFitAroundFrame) {
    writer.saveGraphicsState(pageIndex);
    writer.rotateAbout(
      pageIndex,
      x + width / 2,
      y + height / 2,
      image.rotation ?? 0,
    );
  }
  writer.drawImage(pageIndex, {
    resourceName,
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
    rotation: rotateFitAroundFrame ? undefined : image.rotation,
    crop: effectiveCrop,
  });
  if (rotateFitAroundFrame) writer.restoreGraphicsState(pageIndex);
  if (shapePath) writer.restoreGraphicsState(pageIndex);

  const border = image.border;
  if (!border) {
    return;
  }
  const rotation = image.rotation;
  if (rotation && !shapePath) {
    writer.saveGraphicsState(pageIndex);
    writer.rotateAbout(pageIndex, x + width / 2, y + height / 2, rotation);
  }
  const dashArray = lineDashPatternPt(border.dash);
  if (shapePath) {
    writer.drawPath(pageIndex, {
      segments: shapePath,
      stroke: border.color,
      lineWidth: border.widthPt ?? 1,
    });
  } else {
    writer.drawRect(pageIndex, {
      x,
      y,
      width,
      height,
      stroke: border.color,
      lineWidth: border.widthPt ?? 1,
      ...(dashArray.length > 0 ? { dashArray } : {}),
    });
  }
  if (rotation && !shapePath) {
    writer.restoreGraphicsState(pageIndex);
  }
}
