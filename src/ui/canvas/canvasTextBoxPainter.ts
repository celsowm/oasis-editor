import type {
  EditorLayoutLine,
  EditorPageSettings,
  EditorState,
  EditorTextBoxData,
} from "../../core/model.js";
import { projectBlocksLayout } from "../../layoutProjection/blocksPagination.js";
import { drawParagraph } from "./canvasParagraphPainter.js";
import { drawTable } from "./canvasTablePainter.js";

const EMU_PER_PX = 9525;

function emuToPx(value: number | undefined): number {
  return value === undefined ? 0 : value / EMU_PER_PX;
}

function clampFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function resolveAlignedOffset(
  align: string | undefined,
  containerSize: number,
  boxSize: number,
): number | null {
  switch (align) {
    case "left":
    case "top":
      return 0;
    case "center":
    case "ctr":
      return (containerSize - boxSize) / 2;
    case "right":
    case "bottom":
      return containerSize - boxSize;
    default:
      return null;
  }
}

export interface FloatingTextBoxRectContext {
  textBox: EditorTextBoxData;
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  lineTop: number;
  anchorLeft: number;
}

export function resolveFloatingTextBoxRect(
  context: FloatingTextBoxRectContext,
): { x: number; y: number; width: number; height: number } {
  const {
    textBox,
    pageSettings,
    contentLeft,
    contentTop,
    contentWidth,
    paragraphTop,
    lineTop,
    anchorLeft,
  } = context;

  const width = Math.max(1, textBox.width);
  const height = Math.max(1, textBox.height);
  const floating = textBox.floating;

  const h = floating?.positionH;
  const hRelativeFrom = h?.relativeFrom ?? "column";

  let hBase = contentLeft;
  let hContainerWidth = contentWidth;

  if (hRelativeFrom === "page") {
    hBase = 0;
    hContainerWidth = pageSettings.width;
  } else if (hRelativeFrom === "character") {
    hBase = anchorLeft;
    hContainerWidth = Math.max(1, pageSettings.width - anchorLeft);
  } else if (hRelativeFrom === "margin" || hRelativeFrom === "column") {
    hBase = contentLeft;
    hContainerWidth = contentWidth;
  }

  const alignedX = resolveAlignedOffset(h?.align, hContainerWidth, width);
  const x =
    hBase +
    (alignedX !== null ? alignedX : emuToPx(h?.offset));

  const v = floating?.positionV;
  const vRelativeFrom = v?.relativeFrom ?? "paragraph";

  let vBase = paragraphTop;
  let vContainerHeight = pageSettings.height;

  if (vRelativeFrom === "page") {
    vBase = 0;
    vContainerHeight = pageSettings.height;
  } else if (vRelativeFrom === "margin") {
    vBase = contentTop;
    vContainerHeight = Math.max(1, pageSettings.height - contentTop);
  } else if (vRelativeFrom === "line") {
    vBase = lineTop;
    vContainerHeight = Math.max(1, pageSettings.height - lineTop);
  } else if (vRelativeFrom === "paragraph") {
    vBase = paragraphTop;
    vContainerHeight = Math.max(1, pageSettings.height - paragraphTop);
  }

  const alignedY = resolveAlignedOffset(v?.align, vContainerHeight, height);
  const y =
    vBase +
    (alignedY !== null ? alignedY : emuToPx(v?.offset));

  return {
    x: clampFinite(x, contentLeft),
    y: clampFinite(y, paragraphTop),
    width,
    height,
  };
}

function getPadding(textBox: EditorTextBoxData) {
  return {
    left: textBox.body?.paddingLeft ?? 0,
    top: textBox.body?.paddingTop ?? 0,
    right: textBox.body?.paddingRight ?? 0,
    bottom: textBox.body?.paddingBottom ?? 0,
  };
}

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

  const fakePageSettings = {
    width: innerWidth,
    height: innerHeight,
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
    maxPageHeight: innerHeight,
    styles: state.document.styles,
    pageOffset: pageIndex,
    totalPages: undefined,
  });

  const blocks = pages[0]?.blocks ?? [];

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerWidth, innerHeight);
  ctx.clip();

  let cursorY = innerY;

  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      drawParagraph(
        ctx,
        block.sourceBlock,
        block.layout.lines,
        state,
        innerX,
        cursorY,
        onUpdate,
      );
    } else if (block.sourceBlock.type === "table") {
      drawTable(
        ctx,
        block.sourceBlock,
        block.tableSegment,
        state,
        innerX,
        cursorY,
        innerWidth,
        block.estimatedHeight,
        pageIndex,
        onUpdate,
      );
    }

    cursorY += Math.max(0, block.estimatedHeight);
  }

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

      const rect = resolveFloatingTextBoxRect({
        textBox,
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
