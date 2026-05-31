import { createEffect, createMemo, Index, Show } from "solid-js";
import type { ITextMeasurer } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import {
  type EditorDocument,
  type EditorEditingZone,
  type EditorLayoutBlock,
  type EditorLayoutLine,
  type EditorLayoutPage,
  type EditorParagraphListStyle,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
  getDocumentParagraphs,
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
import { FOOTNOTE_MARKER_GUTTER_PX } from "../layoutProjection.js";
import { findFootnoteReference } from "../../core/footnotes.js";
import { createLayoutIdentityStabilizer } from "../layoutIdentity.js";
import { PageBreak } from "../components/PageBreak.js";
import { buildCanvasTableLayout, type CanvasTableBorderSpec } from "../canvas/CanvasTableLayout.js";

const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options) => domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple) =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};

export function resolveCanvasTextRenderMetrics(
  styles: { superscript?: boolean; subscript?: boolean } | undefined,
  fontSize: number,
) {
  if (styles?.superscript) {
    return {
      fontSize: fontSize * 0.75,
      baselineOffset: -fontSize * 0.35,
    };
  }
  if (styles?.subscript) {
    return {
      fontSize: fontSize * 0.75,
      baselineOffset: fontSize * 0.2,
    };
  }
  return {
    fontSize,
    baselineOffset: 0,
  };
}

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
          // Each Index slot must be a single, stable root element. Returning a
          // Fragment (with a conditional <Show> sibling) confuses Solid's
          // reconcileArrays when the page list grows/shrinks (e.g. after
          // inserting an image that triggers re-pagination in a narrow viewport),
          // causing "Failed to execute 'insertBefore'" errors.
          <div class="oasis-editor-canvas-page-slot" style={{ position: "relative" }}>
            <Show when={index > 0}>
              <PageBreak pageIndex={index} />
            </Show>
            <CanvasPage
              page={page()}
              index={index}
              state={props.state()}
              onSurfaceMouseDown={props.onSurfaceMouseDown}
              onSurfaceClick={props.onSurfaceClick}
              onSurfaceMouseMove={props.onSurfaceMouseMove}
              onSurfaceDblClick={props.onSurfaceDblClick}
            />
          </div>
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
  onSurfaceClick?: (event: MouseEvent) => void;
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
  let lastShowParagraphMarks: boolean | undefined;
  let lastActiveZone: EditorEditingZone | undefined;
  let lastActiveFootnoteId: string | undefined;
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
    const showParagraphMarks = state.showParagraphMarks;
    const activeZone = state.activeZone ?? "main";
    const activeFootnoteId = state.activeFootnoteId;
    if (
      page === lastPaintedPage &&
      styles === lastStyles &&
      showMargins === lastShowMargins &&
      showParagraphMarks === lastShowParagraphMarks &&
      activeZone === lastActiveZone &&
      activeFootnoteId === lastActiveFootnoteId
    ) {
      return;
    }
    lastPaintedPage = page;
    lastStyles = styles;
    lastShowMargins = showMargins;
    lastShowParagraphMarks = showParagraphMarks;
    lastActiveZone = activeZone;
    lastActiveFootnoteId = activeFootnoteId;

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
    const zoneBodyBottom = page.bodyBottom ?? height;

    if (state.showMargins) {
      const contentHeight = Math.max(24, Math.floor(zoneBodyBottom - bodyTop));
      ctx.save();
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(marginX, bodyTop, bodyWidth, contentHeight);
      ctx.restore();
    }

    const inHeaderFooterMode = activeZone === "header" || activeZone === "footer";
    const bodyAlpha = inHeaderFooterMode || activeZone === "footnote" ? 0.5 : 1;
    const headerAlpha = activeZone === "main" ? 0.42 : activeZone === "header" ? 1 : 0.42;
    const footerAlpha = activeZone === "main" ? 0.42 : activeZone === "footer" ? 1 : 0.42;
    const footnoteAlpha = activeZone === "footnote" ? 1 : activeZone === "main" ? 0.86 : 0.42;

    ctx.save();
    ctx.globalAlpha = headerAlpha;
    renderBlockList(ctx, state, page.headerBlocks ?? [], marginX, headerTop, bodyWidth, page.index, () => {
      lastPaintedPage = undefined;
      rafHandle = requestAnimationFrame(paint);
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = bodyAlpha;
    renderBlockList(ctx, state, page.blocks, marginX, bodyTop, bodyWidth, page.index, () => {
      lastPaintedPage = undefined;
      rafHandle = requestAnimationFrame(paint);
    });
    ctx.restore();

    if (page.footnoteBlocks && page.footnoteBlocks.length > 0 && page.footnoteTop !== undefined) {
      ctx.save();
      ctx.globalAlpha = footnoteAlpha;
      const clipTop = page.footnoteSeparatorTop ?? page.footnoteTop;
      const clipBottom = Math.max(clipTop, footerTop);
      ctx.beginPath();
      ctx.rect(0, clipTop, width, clipBottom - clipTop);
      ctx.clip();
      if (page.footnoteSeparatorTop !== undefined) {
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginX, page.footnoteSeparatorTop + 0.5);
        ctx.lineTo(marginX + Math.min(180, bodyWidth * 0.35), page.footnoteSeparatorTop + 0.5);
        ctx.stroke();
      }
      renderFootnoteBlockList(
        ctx,
        state,
        page.footnoteBlocks,
        page.footnoteReferenceIds ?? [],
        marginX,
        page.footnoteTop,
        bodyWidth,
        page.index,
        () => {
          lastPaintedPage = undefined;
          rafHandle = requestAnimationFrame(paint);
        },
      );
      ctx.restore();
    }

    if (page.bodyBottom !== undefined) {
      ctx.save();
      ctx.globalAlpha = footerAlpha;
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
      ctx.restore();
    }

    if (activeZone === "main") {
      // Word-like idle hint: header/footer content remains visible but subdued.
      ctx.save();
      ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
      if (bodyTop > 0) {
        ctx.fillRect(0, 0, width, bodyTop);
      }
      const hasFootnotes = (page.footnoteBlocks?.length ?? 0) > 0;
      const lowerHintTop = hasFootnotes ? footerTop : zoneBodyBottom;
      if (lowerHintTop < height) {
        ctx.fillRect(0, lowerHintTop, width, height - lowerHintTop);
      }
      ctx.restore();
    } else {
      // Word-like editing mode guides for header/footer.
      ctx.save();
      ctx.strokeStyle = "rgba(71, 85, 105, 0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      const guideLeft = Math.max(0, marginX - 10);
      const guideRight = Math.min(width, marginX + bodyWidth + 10);
      ctx.beginPath();
      ctx.moveTo(guideLeft, bodyTop + 0.5);
      ctx.lineTo(guideRight, bodyTop + 0.5);
      ctx.moveTo(guideLeft, zoneBodyBottom + 0.5);
      ctx.lineTo(guideRight, zoneBodyBottom + 0.5);
      ctx.stroke();
      ctx.restore();
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
    lastShowParagraphMarks = undefined;
    // Cancel any pending RAF and repaint synchronously on next frame.
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    rafHandle = requestAnimationFrame(paint);
  });

  createEffect(() => {
    const _ = props.state.showParagraphMarks;
    lastShowParagraphMarks = undefined;
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    rafHandle = requestAnimationFrame(paint);
  });

  createEffect(() => {
    const _ = props.state.activeZone;
    const __ = props.state.activeFootnoteId;
    void __;
    lastActiveZone = undefined;
    lastActiveFootnoteId = undefined;
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
      onClick={props.onSurfaceClick}
      onMouseMove={props.onSurfaceMouseMove}
      onDblClick={props.onSurfaceDblClick}
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
  pageIndex: number,
  onUpdate: () => void,
) {
  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, state.document.styles);
      const spacingBefore = block.layout.startOffset === 0 ? (paragraphStyle.spacingBefore ?? 0) : 0;
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

function renderFootnoteBlockList(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  blocks: EditorLayoutBlock[],
  footnoteReferenceIds: string[],
  originX: number,
  originY: number,
  contentWidth: number,
  pageIndex: number,
  onUpdate: () => void,
) {
  let cursorY = originY;
  const markerDrawn = new Set<string>();
  const markerByFootnoteId = new Map(
    footnoteReferenceIds.map((footnoteId) => [
      footnoteId,
      findFootnoteReference(state.document, footnoteId)?.run.text ?? "",
    ]),
  );
  for (const block of blocks) {
    const owningFootnoteId = footnoteReferenceIds.find((footnoteId) =>
      block.blockId.startsWith(`${footnoteId}:`),
    );
    if (owningFootnoteId && !markerDrawn.has(owningFootnoteId)) {
      const marker = markerByFootnoteId.get(owningFootnoteId);
      if (marker) {
        const markerMetrics = resolveCanvasTextRenderMetrics({ superscript: true }, 11);
        ctx.save();
        ctx.font = `400 ${markerMetrics.fontSize}px Calibri, sans-serif`;
        ctx.fillStyle = "#000000";
        ctx.fillText(marker, originX, cursorY + 12 + markerMetrics.baselineOffset);
        ctx.restore();
      }
      markerDrawn.add(owningFootnoteId);
    }
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, state.document.styles);
      const spacingBefore = block.layout.startOffset === 0 ? (paragraphStyle.spacingBefore ?? 0) : 0;
      drawParagraph(
        ctx,
        block.sourceBlock,
        block.layout.lines,
        state,
        originX + FOOTNOTE_MARKER_GUTTER_PX,
        cursorY + spacingBefore,
        onUpdate,
      );
    } else if (block.sourceBlock.type === "table") {
      drawTable(
        ctx,
        block.sourceBlock,
        state,
        originX + FOOTNOTE_MARKER_GUTTER_PX,
        cursorY,
        Math.max(24, contentWidth - FOOTNOTE_MARKER_GUTTER_PX),
        block.estimatedHeight,
        pageIndex,
        onUpdate,
      );
    }
    cursorY += Math.max(0, block.estimatedHeight) + 2;
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

    const listPrefix = line.index === 0 ? resolveListPrefix(paragraph, state.document) : "";
    if (listPrefix) {
      ctx.save();
      ctx.font = "400 15px Calibri";
      ctx.fillStyle = "#000000";
      const first = line.slots[0];
      const left = first ? Math.max(0, first.left - 24) : 0;
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
      const renderMetrics = resolveCanvasTextRenderMetrics(styles, fontSize);
      ctx.save();
      ctx.font = `${fontStyle} ${fontWeight} ${renderMetrics.fontSize}px ${fontFamily}`;
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
          ctx.fillText(char.char, originX + slot.left, baselineY + renderMetrics.baselineOffset);
        }
      }
      if (styles.underline) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "underline", styles.underlineStyle ?? undefined);
      }
      if (styles.strike) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "strike");
      }
      ctx.restore();
    }

    const isLastLine = line.index === lines.length - 1;
    if (state.showParagraphMarks && isLastLine) {
      const lastSlot = line.slots[line.slots.length - 1];
      const markSlot = line.slots.find((slot) => slot.offset === line.endOffset) ?? lastSlot;
      if (markSlot) {
        ctx.save();
        ctx.font = "400 13px Calibri";
        ctx.fillStyle = "#9ca3af";
        const y = originY + line.top + line.height * 0.8;
        ctx.fillText("\u00B6", originX + markSlot.left + 2, y);
        ctx.restore();
      }
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
  underlineStyle?: string,
) {
  const slots = fragment.chars
    .map((char) => line.slots.find((slot) => slot.offset === char.paragraphOffset))
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return;
  const left = slots[0]!.left;
  const right = slots[slots.length - 1]!.left + 8;
  const y = kind === "underline" ? originY + line.top + line.height - 2 : originY + line.top + line.height * 0.52;
  const x1 = originX + left;
  const x2 = originX + right;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;

  if (kind === "underline") {
    drawUnderlineWithStyle(ctx, x1, x2, y, underlineStyle);
  } else {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUnderlineWithStyle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  underlineStyle: string | undefined,
) {
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  switch (underlineStyle) {
    case "double":
    case "wavyDouble": {
      const offset = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y - offset);
      ctx.lineTo(x2, y - offset);
      ctx.moveTo(x1, y + offset);
      ctx.lineTo(x2, y + offset);
      ctx.stroke();
      return;
    }
    case "thick":
    case "dashedHeavy":
    case "dashLongHeavy":
    case "dashDotHeavy":
    case "dashDotDotHeavy":
    case "dottedHeavy":
    case "wavyHeavy": {
      ctx.lineWidth = 2;
      break;
    }
  }

  switch (underlineStyle) {
    case "dotted":
    case "dottedHeavy":
      ctx.setLineDash([1.5, 2.5]);
      break;
    case "dash":
    case "dashedHeavy":
      ctx.setLineDash([4, 3]);
      break;
    case "dashLong":
    case "dashLongHeavy":
      ctx.setLineDash([8, 3]);
      break;
    case "dotDash":
    case "dashDotHeavy":
      ctx.setLineDash([4, 2, 1, 2]);
      break;
    case "dotDotDash":
    case "dashDotDotHeavy":
      ctx.setLineDash([4, 2, 1, 2, 1, 2]);
      break;
    case "wave":
    case "wavyHeavy": {
      drawWavyLine(ctx, x1, x2, y);
      return;
    }
  }

  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWavyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
) {
  const amplitude = 1.5;
  const wavelength = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (let x = x1; x <= x2; x += 1) {
    const dy = Math.sin(((x - x1) / wavelength) * Math.PI) * amplitude;
    ctx.lineTo(x, y + dy);
  }
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

const listOrdinalsCache = new WeakMap<EditorDocument, Map<string, number>>();

function getListOrdinals(document: EditorDocument): Map<string, number> {
  const cached = listOrdinalsCache.get(document);
  if (cached) return cached;

  const result = new Map<string, number>();
  const paragraphs = getDocumentParagraphs(document);
  // Per-level counters for ordered lists. Reset whenever the consecutive
  // ordered-list run is broken (non-list paragraph, bullet, or list kind change).
  let counters: number[] = [];
  let prevWasOrdered = false;

  for (const paragraph of paragraphs) {
    const list = paragraph.list;
    if (!list || list.kind !== "ordered") {
      counters = [];
      prevWasOrdered = false;
      continue;
    }

    const level = list.level ?? 0;
    if (!prevWasOrdered) {
      counters = [];
    }
    // Truncate deeper levels when going back up.
    if (counters.length > level + 1) {
      counters.length = level + 1;
    }
    while (counters.length <= level) {
      counters.push(0);
    }
    if (counters[level] === 0 && typeof list.startAt === "number") {
      counters[level] = list.startAt;
    } else {
      counters[level] = counters[level] + 1;
    }
    result.set(paragraph.id, counters[level]);
    prevWasOrdered = true;
  }

  listOrdinalsCache.set(document, result);
  return result;
}

function formatOrdinal(value: number, format: EditorParagraphListStyle["format"]): string {
  switch (format) {
    case "lowerLetter":
      return toAlpha(value).toLowerCase();
    case "upperLetter":
      return toAlpha(value).toUpperCase();
    case "lowerRoman":
      return toRoman(value).toLowerCase();
    case "upperRoman":
      return toRoman(value).toUpperCase();
    case "decimal":
    default:
      return String(value);
  }
}

function toAlpha(value: number): string {
  if (value <= 0) return String(value);
  let n = value;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function toRoman(value: number): string {
  if (value <= 0 || value >= 4000) return String(value);
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = value;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

// Word's default bullet glyphs cycle by depth in the built-in bullet gallery.
const BULLET_GLYPHS = ["•", "○", "▪", "•", "○", "▪"];
// Word's default ordered formats cycle by depth (1./a./i./1./a./i.).
const ORDERED_DEFAULT_FORMATS: NonNullable<EditorParagraphListStyle["format"]>[] = [
  "decimal",
  "lowerLetter",
  "lowerRoman",
  "decimal",
  "lowerLetter",
  "lowerRoman",
];

function resolveListPrefix(paragraph: EditorParagraphNode, document: EditorDocument): string {
  if (!paragraph.list) return "";
  const level = Math.max(0, paragraph.list.level ?? 0);
  if (paragraph.list.kind === "bullet") {
    return BULLET_GLYPHS[level % BULLET_GLYPHS.length];
  }
  const ordinals = getListOrdinals(document);
  const value = ordinals.get(paragraph.id);
  if (value === undefined) return "1.";
  const format =
    paragraph.list.format && paragraph.list.format !== "bullet"
      ? paragraph.list.format
      : ORDERED_DEFAULT_FORMATS[level % ORDERED_DEFAULT_FORMATS.length];
  return `${formatOrdinal(value, format)}.`;
}


