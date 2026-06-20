import type {
  EditorLayoutBlock,
  EditorParagraphNode,
  EditorLayoutLine,
  EditorState,
  EditorTableNode,
} from "@/core/model.js";

/**
 * The block-level painters a text box's inner content recurses into. Injected
 * into the canvas paint pipeline so `canvasTextBoxPainter` can render nested
 * paragraphs/tables without importing `canvasParagraphPainter`/
 * `canvasTablePainter` (which import back through the text-box painter), keeping
 * the painter graph acyclic. The concrete object is owned by `canvasBlockPainter`,
 * the orchestrator above this pipeline.
 *
 * Each painter takes the `painters` bundle so deeper nesting (a text box inside
 * a text box) keeps threading the same callbacks.
 */
export interface CanvasBlockPainters {
  drawParagraph(
    ctx: CanvasRenderingContext2D,
    paragraph: EditorParagraphNode,
    lines: EditorLayoutLine[],
    state: EditorState,
    originX: number,
    originY: number,
    onUpdate: () => void,
    painters: CanvasBlockPainters,
    pageIndex?: number,
  ): void;
  drawTable(
    ctx: CanvasRenderingContext2D,
    table: EditorTableNode,
    tableSegment: EditorLayoutBlock["tableSegment"] | undefined,
    state: EditorState,
    originX: number,
    originY: number,
    contentWidth: number,
    estimatedHeight: number,
    pageIndex: number,
    onUpdate: () => void,
    painters: CanvasBlockPainters,
  ): void;
}
