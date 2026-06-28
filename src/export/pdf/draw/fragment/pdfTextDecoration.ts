import type { EditorTextStyle } from "@/core/model.js";
import {
  isDoubleUnderlineStyle,
  isWavyUnderlineStyle,
  underlineStyleDashArray,
  underlineStyleLineWidthPx,
  WAVY_UNDERLINE_AMPLITUDE_PX,
  WAVY_UNDERLINE_WAVELENGTH_PX,
} from "@/core/textStyleMappings.js";
import { DOUBLE_UNDERLINE_OFFSET_PX } from "@/core/decorationGeometry.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { pxToPt } from "@/export/pdf/units.js";

export function drawUnderlineWithStyle(
  writer: OasisPdfWriter,
  pageIndex: number,
  x1: number,
  x2: number,
  y: number,
  stroke: string,
  underlineStyle: EditorTextStyle["underlineStyle"],
): void {
  const lineWidthPx = underlineStyleLineWidthPx(underlineStyle);

  const drawAt = (yy: number, dash?: number[]) => {
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(yy),
      x2: pxToPt(x2),
      y2: pxToPt(yy),
      stroke,
      lineWidth: pxToPt(lineWidthPx),
      dashArray: dash,
    });
  };

  if (isDoubleUnderlineStyle(underlineStyle)) {
    drawAt(y - DOUBLE_UNDERLINE_OFFSET_PX);
    drawAt(y + DOUBLE_UNDERLINE_OFFSET_PX);
    return;
  }

  if (isWavyUnderlineStyle(underlineStyle)) {
    drawWavyUnderline(writer, pageIndex, x1, x2, y, stroke, lineWidthPx);
    return;
  }

  drawAt(y, underlineStyleDashArray(underlineStyle));
}

function drawWavyUnderline(
  writer: OasisPdfWriter,
  pageIndex: number,
  x1: number,
  x2: number,
  y: number,
  stroke: string,
  lineWidthPx: number,
): void {
  let prevX = x1;
  let prevY = y;
  for (let x = x1; x <= x2; x += 1) {
    const dy =
      Math.sin(((x - x1) / WAVY_UNDERLINE_WAVELENGTH_PX) * Math.PI) *
      WAVY_UNDERLINE_AMPLITUDE_PX;
    const curY = y + dy;
    writer.drawLine(pageIndex, {
      x1: pxToPt(prevX),
      y1: pxToPt(prevY),
      x2: pxToPt(x),
      y2: pxToPt(curY),
      stroke,
      lineWidth: pxToPt(lineWidthPx),
    });
    prevX = x;
    prevY = curY;
  }
}
