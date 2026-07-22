 yimport type { EditorDocument, EditorImageRunData } from "@/core/model.js";
import { lineDashPatternPt } from "@/core/lineDash.js";
import { registerPdfImageRun } from "@/export/pdf/images.js";
import type { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";

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
  writer.drawImage(pageIndex, {
    resourceName,
    x,
    y,
    width,
    height,
    rotation: image.rotation,
    crop: image.crop,
  });

  const border = image.border;
  if (!border) {
    return;
  }
  const rotation = image.rotation;
  if (rotation) {
    writer.saveGraphicsState(pageIndex);
    writer.rotateAbout(pageIndex, x + width / 2, y + height / 2, rotation);
  }
  const dashArray = lineDashPatternPt(border.dash);
  writer.drawRect(pageIndex, {
    x,
    y,
    width,
    height,
    stroke: border.color,
    lineWidth: border.widthPt ?? 1,
    ...(dashArray.length > 0 ? { dashArray } : {}),
  });
  if (rotation) {
    writer.restoreGraphicsState(pageIndex);
  }
}
