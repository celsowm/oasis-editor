import type {
  EditorLayoutLine,
  EditorPageSettings,
  EditorState,
  EditorTextBoxData,
} from "../../core/model.js";
import { projectBlocksLayout } from "../../layoutProjection/blocksPagination.js";
import {
  getTextBoxFloatingGeometry,
  resolveFloatingObjectRect,
} from "../../layoutProjection/floatingObjects.js";
import { drawParagraph } from "./canvasParagraphPainter.js";
import { drawTable } from "./canvasTablePainter.js";
import {
  getTextBoxPadding as getPadding,
  resolveTextBoxRenderHeight,
} from "./textBoxRenderHeight.js";
import {
  drawStackedParagraph,
  resolveVerticalMode,
  withRotatedBox,
} from "./verticalText.js";

function drawTextBoxShape(
  ctx: CanvasRenderingContext2D,
  textBox: EditorTextBoxData,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const fill = textBox.shape?.fill;
  const borderColor = textBox.shape?.borderColor;
  const borderWidth = textBox.shape?.borderWidthPt ?? (borderColor ? 0.75 : 0);

  ctx.save();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
  }

  if (borderColor && borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = Math.max(1, borderWidth * (96 / 72));
    ctx.strokeRect(x, y, width, height);
  }

  ctx.restore();
}

function renderTextBoxContent(
  ctx: CanvasRenderingContext2D,
  textBox: EditorTextBoxData,
  state: EditorState,
  x: number,
  y: number,
  width: number,
  height: number,
  pageIndex: number,
  onUpdate: () => void,
): void {
  const padding = getPadding(textBox);

  const innerX = x + padding.left;
  const innerY = y + padding.top;
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = Math.max(1, height - padding.top - padding.bottom);

  const mode = resolveVerticalMode(textBox.body?.vert);

  // Stacked (East-Asian upright) text does not flow through the horizontal
  // layout engine; paint each paragraph glyph-by-glyph instead.
  if (mode === "stack") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerWidth, innerHeight);
    ctx.clip();
    let columnRight = innerX + innerWidth;
    for (const block of textBox.blocks) {
      if (block.type !== "paragraph") {
        continue;
      }
      columnRight = drawStackedParagraph(
        ctx,
        block,
        state,
        { x: innerX, y: innerY, width: innerWidth, height: innerHeight },
        columnRight,
      );
    }
    ctx.restore();
    return;
  }

  // For rotated text the content is laid out in a width/height-swapped box so
  // the long axis runs vertically once rotated.
  const rotated = mode === "rotate-cw" || mode === "rotate-ccw";
  const layoutWidth = rotated ? innerHeight : innerWidth;
  const layoutHeight = rotated ? innerWidth : innerHeight;

  const fakePageSettings = {
    width: layoutWidth,
    height: layoutHeight,
    orientation: "portrait" as const,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      header: 0,
      footer: 0,
      gutter: 0,
    },
  };

  const pages = projectBlocksLayout({
    blocks: textBox.blocks,
    pageSettings: fakePageSettings,
    maxPageHeight: layoutHeight,
    styles: state.document.styles,
    pageOffset: pageIndex,
    totalPages: undefined,
  });

  const blocks = pages[0]?.blocks ?? [];

  const paintBlocks = (originX: number, originY: number, blockWidth: number) => {
    let cursorY = originY;
    for (const block of blocks) {
      if (block.sourceBlock.type === "paragraph" && block.layout) {
        drawParagraph(
          ctx,
          block.sourceBlock,
          block.layout.lines,
          state,
          originX,
          cursorY,
          onUpdate,
        );
      } else if (block.sourceBlock.type === "table") {
        drawTable(
          ctx,
          block.sourceBlock,
          block.tableSegment,
          state,
          originX,
          cursorY,
          blockWidth,
          block.estimatedHeight,
          pageIndex,
          onUpdate,
        );
      }
      cursorY += Math.max(0, block.estimatedHeight);
    }
  };

  if (rotated) {
    withRotatedBox(
      ctx,
      { x: innerX, y: innerY, width: innerWidth, height: innerHeight },
      mode,
      (lw) => paintBlocks(0, 0, lw),
    );
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerWidth, innerHeight);
  ctx.clip();
  paintBlocks(innerX, innerY, innerWidth);
  ctx.restore();
}

export function drawFloatingTextBoxesForParagraph(options: {
  ctx: CanvasRenderingContext2D;
  paragraphLines: EditorLayoutLine[];
  state: EditorState;
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  pageIndex: number;
  onUpdate: () => void;
  layer: "behind" | "front";
}): void {
  const {
    ctx,
    paragraphLines,
    state,
    pageSettings,
    contentLeft,
    contentTop,
    contentWidth,
    paragraphTop,
    pageIndex,
    onUpdate,
    layer,
  } = options;

  for (const line of paragraphLines) {
    const slotByOffset = new Map(
      line.slots.map((slot) => [slot.offset, slot] as const),
    );

    for (const fragment of line.fragments) {
      const textBox = fragment.textBox;

      if (!textBox?.floating) {
        continue;
      }

      const isBehind = Boolean(textBox.floating.behindDoc);
      if ((layer === "behind") !== isBehind) {
        continue;
      }

      const slot = slotByOffset.get(fragment.startOffset);
      const anchorLeft = contentLeft + (slot?.left ?? 0);
      const lineTop = paragraphTop + line.top;

      const effectiveHeight = resolveTextBoxRenderHeight(
        textBox,
        state,
        pageIndex,
      );

      const rect = resolveFloatingObjectRect({
        object: getTextBoxFloatingGeometry(textBox, effectiveHeight),
        pageSettings,
        contentLeft,
        contentTop,
        contentWidth,
        paragraphTop,
        lineTop,
        anchorLeft,
      });

      drawTextBoxShape(ctx, textBox, rect.x, rect.y, rect.width, rect.height);
      renderTextBoxContent(
        ctx,
        textBox,
        state,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        pageIndex,
        onUpdate,
      );
    }
  }
}
