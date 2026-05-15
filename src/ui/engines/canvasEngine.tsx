import { createEffect, createMemo, Index, Show } from "solid-js";
import type { IRenderingEngine, ITextMeasurer } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { SemanticDOMMirror } from "../components/SemanticDOMMirror.js";
import {
  type EditorLayoutBlock,
  type EditorLayoutLine,
  type EditorLayoutPage,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
  getPageBodyTop,
  getPageContentWidth,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import { domTextMeasurer } from "../textMeasurement.js";
import { projectDocumentLayout } from "../layoutProjection.js";
import { PageBreak } from "../components/PageBreak.js";

const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options) => domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple) =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};

function CanvasEditorSurface(props: EditorSurfaceProps) {
  const documentLayout = createMemo(() =>
    projectDocumentLayout(
      props.state().document,
      undefined,
      props.measuredBlockHeights?.(),
      props.measuredParagraphLayouts?.(),
      { layoutMode: props.layoutMode ?? "wordParity", measurer: canvasTextMeasurer },
    ),
  );

  return (
    <div class="oasis-editor-paper-stack oasis-editor-canvas-stack" style={{ position: "relative" }}>
      <SemanticDOMMirror {...props} measurer={canvasTextMeasurer} />
      <Index each={documentLayout().pages}>
        {(page, index) => (
          <>
            <Show when={index > 0}>
              <PageBreak pageIndex={index} />
            </Show>
            <CanvasPage page={page()} index={index} state={props.state()} />
          </>
        )}
      </Index>
    </div>
  );
}

function CanvasPage(props: { page: EditorLayoutPage; index: number; state: EditorState }) {
  let canvasRef: HTMLCanvasElement | undefined;

  createEffect(() => {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const page = props.page;
    const dpr = window.devicePixelRatio || 1;
    const width = page.pageSettings.width;
    const height = page.pageSettings.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const marginX = page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const bodyWidth = getPageContentWidth(page.pageSettings);

    renderBlockList(ctx, props.state, page.headerBlocks ?? [], marginX, 0, bodyWidth);
    renderBlockList(ctx, props.state, page.blocks, marginX, bodyTop, bodyWidth);
    if (page.bodyBottom !== undefined) {
      renderBlockList(ctx, props.state, page.footerBlocks ?? [], marginX, page.bodyBottom, bodyWidth);
    }
  });

  return (
    <div
      class="oasis-editor-paper"
      data-page-index={props.index}
      style={{
        position: "relative",
        "z-index": 1,
        width: `${props.page.pageSettings.width}px`,
        "min-height": `${props.page.pageSettings.height}px`,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

function renderBlockList(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  blocks: EditorLayoutBlock[],
  originX: number,
  originY: number,
  contentWidth: number,
) {
  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      drawParagraph(ctx, block.sourceBlock, block.layout.lines, state, originX, cursorY);
    } else if (block.sourceBlock.type === "table") {
      drawTable(ctx, block.sourceBlock, state, originX, cursorY, contentWidth, block.estimatedHeight);
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}

function drawParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  state: EditorState,
  originX: number,
  originY: number,
) {
  const paragraphStyle = resolveEffectiveParagraphStyle(paragraph.style, state.document.styles);
  for (const line of lines) {
    const listPrefix = line.index === 0 ? resolveListPrefix(paragraph) : "";
    if (listPrefix) {
      ctx.save();
      ctx.font = "400 15px Calibri";
      ctx.fillStyle = "#000000";
      const first = line.slots[0];
      const left = first ? Math.max(0, first.left - 28) : 0;
      ctx.fillText(listPrefix, originX + left, originY + line.top + line.height * 0.8);
      ctx.restore();
    }
    for (const fragment of line.fragments) {
      const styles = resolveEffectiveTextStyleForParagraph(
        fragment.styles,
        paragraph.style?.styleId,
        state.document.styles,
      );
      const fontSize = styles.fontSize ?? 15;
      const fontFamily = styles.fontFamily ?? "Calibri, sans-serif";
      const fontWeight = styles.bold ? "700" : "400";
      const fontStyle = styles.italic ? "italic" : "normal";
      ctx.save();
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = styles.color ?? "#000000";
      if (styles.highlight) {
        drawFragmentHighlight(ctx, line, fragment, originX, originY, styles.highlight);
      }
      for (const char of fragment.chars) {
        if (char.char === "\n" || char.char === "\t") continue;
        const slot = line.slots.find((candidate) => candidate.offset === char.paragraphOffset);
        if (!slot) continue;
        ctx.fillText(char.char, originX + slot.left, originY + line.top + line.height * 0.8);
      }
      if (styles.underline) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "underline");
      }
      if (styles.strike) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "strike");
      }
      ctx.restore();
    }
    if (paragraphStyle.align === "justify") {
      // The projected line slots already include justified distribution.
    }
  }
}

function drawFragmentHighlight(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
) {
  const slots = fragment.chars
    .map((char) => line.slots.find((slot) => slot.offset === char.paragraphOffset))
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return;
  const left = slots[0]!.left;
  const right = slots[slots.length - 1]!.left + 8;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  ctx.fillRect(originX + left, originY + line.top + 2, Math.max(0, right - left), Math.max(2, line.height - 4));
  ctx.restore();
}

function drawTextDecoration(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  kind: "underline" | "strike",
) {
  const slots = fragment.chars
    .map((char) => line.slots.find((slot) => slot.offset === char.paragraphOffset))
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return;
  const left = slots[0]!.left;
  const right = slots[slots.length - 1]!.left + 8;
  const y = kind === "underline" ? originY + line.top + line.height - 2 : originY + line.top + line.height * 0.52;
  ctx.beginPath();
  ctx.moveTo(originX + left, y);
  ctx.lineTo(originX + right, y);
  ctx.lineWidth = 1;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.stroke();
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  table: EditorTableNode,
  state: EditorState,
  originX: number,
  originY: number,
  contentWidth: number,
  estimatedHeight: number,
) {
  const tableWidth = resolveTableWidth(table, contentWidth);
  const rowCount = Math.max(1, table.rows.length);
  const rowHeight = estimatedHeight > 0 ? estimatedHeight / rowCount : 28;
  let y = originY;
  for (const row of table.rows) {
    const columns = Math.max(1, row.cells.length);
    const cellWidth = tableWidth / columns;
    let x = originX;
    for (const cell of row.cells) {
      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const width = cellWidth * colSpan;
      if (cell.style?.shading) {
        ctx.fillStyle = cell.style.shading;
        ctx.fillRect(x, y, width, rowHeight);
      }
      ctx.strokeStyle = "#6f6f6f";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, rowHeight);
      drawTableCellText(ctx, cell.blocks, state, x + 6, y + 4);
      x += width;
    }
    y += rowHeight;
  }
}

function drawTableCellText(
  ctx: CanvasRenderingContext2D,
  blocks: EditorParagraphNode[],
  state: EditorState,
  x: number,
  y: number,
) {
  let offsetY = 0;
  for (const paragraph of blocks) {
    const text = paragraph.runs.map((run) => run.text).join("");
    const style = resolveEffectiveTextStyleForParagraph(undefined, paragraph.style?.styleId, state.document.styles);
    const fontSize = style.fontSize ?? 15;
    const fontFamily = style.fontFamily ?? "Calibri, sans-serif";
    const fontWeight = style.bold ? "700" : "400";
    const fontStyle = style.italic ? "italic" : "normal";
    ctx.save();
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = style.color ?? "#000000";
    ctx.fillText(text, x, y + offsetY + fontSize);
    ctx.restore();
    offsetY += Math.max(fontSize + 4, 18);
  }
}

function resolveTableWidth(table: EditorTableNode, contentWidth: number): number {
  const raw = table.style?.width;
  if (typeof raw === "number") return Math.max(24, raw);
  if (typeof raw === "string" && raw.trim().endsWith("%")) {
    const value = Number.parseFloat(raw.trim().slice(0, -1));
    if (Number.isFinite(value)) return Math.max(24, contentWidth * (value / 100));
  }
  return contentWidth;
}

function resolveListPrefix(paragraph: EditorParagraphNode): string {
  if (!paragraph.list) return "";
  if (paragraph.list.kind === "bullet") return "•";
  return "1.";
}

export const canvasEngine: IRenderingEngine = {
  id: "canvas",
  measurer: canvasTextMeasurer,
  visualPrimary: true,
  SurfaceComponent: CanvasEditorSurface,
};
