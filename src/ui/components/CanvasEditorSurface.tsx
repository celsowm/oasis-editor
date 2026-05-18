import { createEffect, createMemo, Index, Show } from "solid-js";
import type { ITextMeasurer } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { MinimalSemanticPageMirror } from "../components/MinimalSemanticMirror.js";
import {
  type EditorLayoutBlock,
  type EditorLayoutLine,
  type EditorLayoutPage,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
  getPageBodyTop,
  getPageBodyBottom,
  getPageContentWidth,
  getPageHeaderZoneTop,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveImageSrc,
} from "../../core/model.js";

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string, onUpdate: () => void): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  img.onload = onUpdate;
  imageCache.set(src, img);
  return img;
}

import { domTextMeasurer } from "../textMeasurement.js";
import { projectDocumentLayout } from "../layoutProjection.js";
import { createLayoutIdentityStabilizer } from "../layoutIdentity.js";
import { PageBreak } from "../components/PageBreak.js";
import { buildCanvasTableLayout, type CanvasTableBorderSpec } from "../canvas/CanvasTableLayout.js";

const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options) => domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple) =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};

export function CanvasEditorSurface(props: EditorSurfaceProps) {
  // Preserves object identity for unchanged pages/blocks across re-projections.
  // Without this, every state change produces brand-new page objects and every
  // CanvasPage repaints — even pages the user did not touch.
  const stabilize = createLayoutIdentityStabilizer();
  const documentLayout = createMemo(() =>
    stabilize(
      projectDocumentLayout(
        props.state().document,
        undefined,
        props.measuredBlockHeights?.(),
        props.measuredParagraphLayouts?.(),
        { layoutMode: props.layoutMode ?? "wordParity", measurer: canvasTextMeasurer },
      ),
    ),
  );

  return (
    <div class="oasis-editor-paper-stack oasis-editor-canvas-stack" style={{ position: "relative" }}>
      <Index each={documentLayout().pages}>
        {(page, index) => (
          <>
            <Show when={index > 0}>
              <PageBreak pageIndex={index} />
            </Show>
            <CanvasPage
              page={page()}
              index={index}
              state={props.state()}
              onSurfaceMouseDown={props.onSurfaceMouseDown}
              onSurfaceMouseMove={props.onSurfaceMouseMove}
              onSurfaceDblClick={props.onSurfaceDblClick}
            />
          </>
        )}
      </Index>
    </div>
  );
}

function CanvasPage(props: {
  page: EditorLayoutPage;
  index: number;
  state: EditorState;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
}) {
  let canvasRef: HTMLCanvasElement | undefined;
  // Skip repaints when neither the projected page nor the document styles
  // (which drive resolved text rendering) actually changed. The Solid
  // reactive system would otherwise re-run this effect for every page on
  // every keystroke.
  let lastPaintedPage: EditorLayoutPage | undefined;
  let lastStyles: unknown;
  let lastShowMargins: boolean | undefined;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastDpr = 0;
  let rafHandle: number | null = null;

  const paint = () => {
    rafHandle = null;
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const page = props.page;
    const state = props.state;
    const styles = state.document.styles;
    const showMargins = state.showMargins;
    if (page === lastPaintedPage && styles === lastStyles && showMargins === lastShowMargins) {
      return;
    }
    lastPaintedPage = page;
    lastStyles = styles;
    lastShowMargins = showMargins;

    const dpr = window.devicePixelRatio || 1;
    const width = page.pageSettings.width;
    const height = page.pageSettings.height;
    if (lastWidth !== width || lastHeight !== height || lastDpr !== dpr) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      lastWidth = width;
      lastHeight = height;
      lastDpr = dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const marginX = page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const headerTop = page.headerTop ?? getPageHeaderZoneTop(page.pageSettings);
    const footerTop = page.footerTop ?? page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const bodyWidth = getPageContentWidth(page.pageSettings);

    if (state.showMargins) {
      const footerZoneTop = page.bodyBottom ?? height;
      const contentHeight = Math.max(24, Math.floor(footerZoneTop - bodyTop));
      ctx.save();
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(marginX, bodyTop, bodyWidth, contentHeight);
      ctx.restore();
    }

    renderBlockList(ctx, state, page.headerBlocks ?? [], marginX, headerTop, bodyWidth, page.index, () => {
      lastPaintedPage = undefined;
      rafHandle = requestAnimationFrame(paint);
    });
    renderBlockList(ctx, state, page.blocks, marginX, bodyTop, bodyWidth, page.index, () => {
      lastPaintedPage = undefined;
      rafHandle = requestAnimationFrame(paint);
    });
    if (page.bodyBottom !== undefined) {
      renderBlockList(
        ctx,
        state,
        page.footerBlocks ?? [],
        marginX,
        footerTop,
        bodyWidth,
        page.index,
        () => {
          lastPaintedPage = undefined;
          rafHandle = requestAnimationFrame(paint);
        },
      );
    }
  };

  createEffect(() => {
    // Track reactive dependencies eagerly, then defer the actual paint to a
    // single requestAnimationFrame so multiple synchronous state updates
    // coalesce into one repaint per page.
    props.page;
    props.state.document;
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(paint);
  });

  // showMargins toggle doesn't change page/styles, so we need a dedicated
  // effect that forces an immediate repaint bypassing the RAF deduplication.
  createEffect(() => {
    // Reading showMargins here creates the reactive dependency.
    const _ = props.state.showMargins;
    // Reset the cache so paint() does not short-circuit.
    lastShowMargins = undefined;
    // Cancel any pending RAF and repaint synchronously on next frame.
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    rafHandle = requestAnimationFrame(paint);
  });

  return (
    <div
      class="oasis-editor-paper"
      data-renderer="canvas"
      data-page-index={props.index}
      data-testid="editor-page"
      style={{
        position: "relative",
        "z-index": 1,
        width: `${props.page.pageSettings.width}px`,
        "min-height": `${props.page.pageSettings.height}px`,
      }}
      onMouseDown={props.onSurfaceMouseDown}
      onMouseMove={props.onSurfaceMouseMove}
      onDblClick={props.onSurfaceDblClick}
    >
      <canvas ref={canvasRef} />
      <MinimalSemanticPageMirror page={props.page} />
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
  pageIndex: number,
  onUpdate: () => void,
) {
  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, state.document.styles);
      const spacingBefore = (block.layout.startOffset === 0 && cursorY > originY) ? (paragraphStyle.spacingBefore ?? 0) : 0;
      drawParagraph(ctx, block.sourceBlock, block.layout.lines, state, originX, cursorY + spacingBefore, onUpdate);
    } else if (block.sourceBlock.type === "table") {
      drawTable(
        ctx,
        block.sourceBlock,
        state,
        originX,
        cursorY,
        contentWidth,
        block.estimatedHeight,
        pageIndex,
        onUpdate,
      );
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
  onUpdate: () => void,
) {
  resolveEffectiveParagraphStyle(paragraph.style, state.document.styles);
  for (const line of lines) {
    // Build a slot index ONCE per line. The previous code did
    // `line.slots.find(...)` per character, which was O(N²) per line and the
    // dominant cost when typing into long paragraphs.
    const slotByOffset = new Map<number, (typeof line.slots)[number]>();
    for (const slot of line.slots) {
      slotByOffset.set(slot.offset, slot);
    }
    const baselineY = originY + line.top + line.height * 0.8;

    const listPrefix = line.index === 0 ? resolveListPrefix(paragraph) : "";
    if (listPrefix) {
      ctx.save();
      ctx.font = "400 15px Calibri";
      ctx.fillStyle = "#000000";
      const first = line.slots[0];
      const left = first ? Math.max(0, first.left - 28) : 0;
      ctx.fillText(listPrefix, originX + left, baselineY);
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
      if (fragment.image) {
        const slot = slotByOffset.get(fragment.startOffset);
        if (slot) {
          const src = resolveImageSrc(state.document, fragment.image.src);
          const img = getCachedImage(src, onUpdate);
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(
              img,
              originX + slot.left,
              originY + line.top + line.height - fragment.image.height,
              fragment.image.width,
              fragment.image.height,
            );
          }
        }
      } else {
        for (const char of fragment.chars) {
          if (char.char === "\n" || char.char === "\t") continue;
          const slot = slotByOffset.get(char.paragraphOffset);
          if (!slot) continue;
          ctx.fillText(char.char, originX + slot.left, baselineY);
        }
      }
      if (styles.underline) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "underline");
      }
      if (styles.strike) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "strike");
      }
      ctx.restore();
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
  pageIndex: number,
  onUpdate: () => void,
) {
  const tableLayout = buildCanvasTableLayout({
    table,
    state,
    pageIndex,
    layoutMode: resolveCanvasLayoutMode(),
    originX,
    originY,
    contentWidth,
    estimatedHeight,
  });
  for (const cell of tableLayout.cells) {
    if (cell.shading) {
      ctx.fillStyle = cell.shading;
      ctx.fillRect(cell.left, cell.top, cell.width, cell.height);
    }
    drawCellBorders(ctx, cell.left, cell.top, cell.width, cell.height, cell.borders);
    for (const paragraphLayout of cell.paragraphs) {
      drawParagraph(
        ctx,
        paragraphLayout.paragraph,
        paragraphLayout.lines,
        state,
        paragraphLayout.originX,
        paragraphLayout.originY,
        onUpdate,
      );
    }
  }
  if (tableLayout.unsupported.length > 0 && (import.meta as any)?.env?.DEV) {
    console.warn("[oasis-editor] canvas table unsupported features", {
      tableId: table.id,
      reasons: tableLayout.unsupported,
    });
  }
}

function drawCellBorders(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  borders: {
    top: CanvasTableBorderSpec;
    right: CanvasTableBorderSpec;
    bottom: CanvasTableBorderSpec;
    left: CanvasTableBorderSpec;
  },
) {
  const right = left + width;
  const bottom = top + height;
  const drawEdge = (
    border: CanvasTableBorderSpec,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    if (border.type === "none" || border.width <= 0) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;
    if (border.type === "dashed") {
      ctx.setLineDash([5, 3]);
    } else if (border.type === "dotted") {
      ctx.setLineDash([1, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  drawEdge(borders.top, left, top, right, top);
  drawEdge(borders.right, right, top, right, bottom);
  drawEdge(borders.bottom, left, bottom, right, bottom);
  drawEdge(borders.left, left, top, left, bottom);
}

function resolveCanvasLayoutMode(): "fast" | "wordParity" {
  const viteEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
  if (viteEnv.VITE_OASIS_WORD_PARITY_STRICT === "1") {
    return "wordParity";
  }
  return "wordParity";
}

function resolveListPrefix(paragraph: EditorParagraphNode): string {
  if (!paragraph.list) return "";
  if (paragraph.list.kind === "bullet") return "•";
  return "1.";
}



