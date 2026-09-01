import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import type {
  EditorDocument,
  EditorDocumentDesign,
  EditorPageBorder,
} from "@/core/model.js";
import { registerPdfImageRun } from "@/export/pdf/images.js";

export async function drawPageBackground(
  writer: OasisPdfWriter,
  pageIndex: number,
  width: number,
  height: number,
  design?: EditorDocumentDesign,
  pageBorder?: EditorPageBorder | null,
  document?: EditorDocument,
): Promise<void> {
  writer.drawRect(pageIndex, {
    x: 0,
    y: 0,
    width,
    height,
    fill: design?.pageColor || "#ffffff",
  });
  if (pageBorder) {
    const d = pageBorder.distance ?? 12;
    const dashArray =
      pageBorder.style === "dashed"
        ? [6, 4]
        : pageBorder.style === "dotted"
          ? [1, 3]
          : undefined;
    writer.drawRect(pageIndex, {
      x: d,
      y: d,
      width: width - 2 * d,
      height: height - 2 * d,
      fill: undefined,
      stroke: pageBorder.color,
      lineWidth: pageBorder.width,
      ...(dashArray ? { dashArray } : {}),
    });
    if (pageBorder.style === "double") {
      const inner = d + pageBorder.width * 2;
      writer.drawRect(pageIndex, {
        x: inner,
        y: inner,
        width: width - 2 * inner,
        height: height - 2 * inner,
        stroke: pageBorder.color,
        lineWidth: pageBorder.width,
      });
    }
  }
  const watermark = design?.watermark;
  if (watermark?.kind === "text" && watermark.text) {
    writer.saveGraphicsState(pageIndex);
    writer.rotateAbout(
      pageIndex,
      width / 2,
      height / 2,
      watermark.rotation ?? -45,
    );
    writer.setOpacity(pageIndex, watermark.opacity ?? 0.25);
    writer.drawText(pageIndex, {
      x: width / 2,
      y: height / 2,
      text: watermark.text,
      fontSize: watermark.fontSize ?? 48,
      color: watermark.color ?? "#94a3b8",
    });
    writer.restoreGraphicsState(pageIndex);
  } else if (watermark?.kind === "image" && watermark.src && document) {
    const image = {
      src: watermark.src,
      width: 360,
      height: 180,
    };
    const resourceName = await registerPdfImageRun(writer, document, image);
    if (resourceName) {
      const scale = watermark.scale ?? 1;
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      writer.saveGraphicsState(pageIndex);
      writer.rotateAbout(
        pageIndex,
        width / 2,
        height / 2,
        watermark.rotation ?? -45,
      );
      writer.setOpacity(pageIndex, watermark.opacity ?? 0.25);
      writer.drawImage(pageIndex, {
        resourceName,
        x: (width - imageWidth) / 2,
        y: (height - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
      });
      writer.restoreGraphicsState(pageIndex);
    }
  }
}
