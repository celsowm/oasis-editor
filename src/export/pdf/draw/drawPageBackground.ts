import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";

export function drawPageBackground(
  writer: OasisPdfWriter,
  pageIndex: number,
  width: number,
  height: number,
): void {
  writer.drawRect(pageIndex, {
    x: 0,
    y: 0,
    width,
    height,
    fill: "#ffffff",
  });
}
