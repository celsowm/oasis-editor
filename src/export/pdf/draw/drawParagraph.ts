import type {
  EditorDocument,
  EditorLayoutLine,
  EditorParagraphNode,
} from "../../../core/model.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import { drawFragmentText } from "./drawFragment.js";
import { drawListPrefix } from "./lists.js";

export function drawParagraph(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  document: EditorDocument,
  originX: number,
  originY: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, number>,
): void {
  for (const line of lines) {
    drawListPrefix(writer, pageIndex, paragraph, line, document, originX, originY, fontRegistry, listOrdinals);
    for (const fragment of line.fragments) {
      drawFragmentText(writer, pageIndex, paragraph, line, fragment, document, originX, originY, fontRegistry);
    }
  }
}
