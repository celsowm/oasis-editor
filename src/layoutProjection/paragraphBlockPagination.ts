import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTextBoxData,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import {
  applyMeasuredLineGeometry,
  applyWidowOrphanControl,
  createParagraphSegmentLayout,
  EMPTY_PROJECTION_CONTEXT,
  estimateParagraphBlockHeight,
  getEffectiveParagraphStyle,
  getParagraphMeasuredHeight,
  getParagraphSegmentFitHeight,
  getParagraphSegmentHeight,
  getProjectedParagraphBlockHeight,
  isMeasuredLayoutCurrent,
  projectParagraphLayout,
  projectParagraphLayoutWithExclusions,
  shouldCollapseContextualSpacing,
} from "./paragraphPagination.js";
import { estimateTableBlockHeight } from "./tablePagination.js";
import type { PaginationTrack, TrackLayoutParams } from "./paginationTrack.js";
import { collectParagraphFloatingExclusions } from "./floatingObjects.js";
import { paginateSegments } from "./paginationSegmentEngine.js";

const TEXT_BOX_AUTOFIT_SAFETY_PX = 2;
/** Subpixel slack so floating-point rounding doesn't push a just-fitting line to the next page. */
const PARAGRAPH_FIT_HEIGHT_TOLERANCE_PX = 1.5;

function registerParagraphFloatingExclusions(options: {
  track: PaginationTrack;
  layout: ReturnType<typeof projectParagraphLayout>;
  blockTop: number;
  params: TrackLayoutParams;
  resolveTextBoxHeight: (textBox: EditorTextBoxData) => number;
}): void {
  const exclusions = collectParagraphFloatingExclusions({
    fragments: options.layout.fragments,
    preliminaryLines: options.layout.lines,
    pageSettings: options.params.pageSettings,
    contentWidth: options.params.contentWidth,
    resolveTextBoxHeight: options.resolveTextBoxHeight,
  });
  options.track.floatingExclusions.push(
    ...exclusions.map((exclusion) => ({
      ...exclusion,
      y: exclusion.y + options.blockTop,
    })),
  );
}

function estimateTextBoxAutoFitHeight(
  textBox: EditorTextBoxData,
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  pageIndex: number | undefined,
  totalPages: number | undefined,
  defaultTabStop: number | undefined,
): number {
  if (!textBox.body?.autoFit) {
    return textBox.height;
  }

  const padding = {
    left: textBox.body?.paddingLeft ?? 0,
    top: textBox.body?.paddingTop ?? 0,
    right: textBox.body?.paddingRight ?? 0,
    bottom: textBox.body?.paddingBottom ?? 0,
  };

  const innerWidth = Math.max(1, textBox.width - padding.left - padding.right);

  const contentHeight = textBox.blocks.reduce((sum, block) => {
    if (block.type === "paragraph") {
      const layout = projectParagraphLayout(
        block,
        pageIndex,
        totalPages,
        styles,
        innerWidth,
        measurer,
        defaultTabStop,
      );

      return sum + getProjectedParagraphBlockHeight(block, layout, styles);
    }

    if (block.type === "table") {
      return (
        sum +
        estimateTableBlockHeight(
          block,
          styles,
          innerWidth,
          measurer,
          defaultTabStop,
        )
      );
    }

    return sum;
  }, 0);

  return Math.max(
    1,
    Math.ceil(
      contentHeight + padding.top + padding.bottom + TEXT_BOX_AUTOFIT_SAFETY_PX,
    ),
  );
}

/**
 * Lays a single paragraph block into the track, splitting it across page
 * breaks as needed (keep-lines-together, keep-with-next, widow/orphan control
 * and contextual-spacing collapse). Extracted from projectColumnTrackLayout.
 */
export function paginateParagraphBlock(
  track: PaginationTrack,
  params: TrackLayoutParams,
  sourceBlock: EditorParagraphNode,
  nextBlock: EditorBlockNode | undefined,
  index: number,
): void {
  const {
    pageSettings,
    contentWidth,
    measurer,
    styles,
    totalPages,
    defaultTabStop,
    measuredHeights,
    measuredParagraphLayouts,
  } = params;

  const pageIndex = track.pageIndex;
  const resolveTextBoxHeight = (textBox: EditorTextBoxData) =>
    estimateTextBoxAutoFitHeight(
      textBox,
      styles,
      measurer,
      pageIndex,
      totalPages,
      defaultTabStop,
    );
  const projectedParagraphLayout = projectParagraphLayoutWithExclusions(
    sourceBlock,
    pageSettings,
    contentWidth,
    measurer,
    pageIndex,
    totalPages,
    styles,
    defaultTabStop,
    resolveTextBoxHeight,
    track.floatingExclusions.map((exclusion) => ({
      ...exclusion,
      y: exclusion.y - track.height,
    })),
    params.projectionContext ?? EMPTY_PROJECTION_CONTEXT,
  );
  const measuredParagraphLayout = measuredParagraphLayouts?.[sourceBlock.id];
  const paragraphLayout =
    measuredParagraphLayout &&
    isMeasuredLayoutCurrent(projectedParagraphLayout, measuredParagraphLayout)
      ? applyMeasuredLineGeometry(
          projectedParagraphLayout,
          measuredParagraphLayout,
        )
      : projectedParagraphLayout;
  let collapseWithPrevious = false;
  let contextualAdjustedPreviousBlock: EditorLayoutBlock | undefined;
  let contextualAdjustedAmount = 0;
  let paragraphTotalHeight =
    measuredHeights?.[sourceBlock.id] ??
    getProjectedParagraphBlockHeight(sourceBlock, paragraphLayout, styles);
  const paragraphStyle = getEffectiveParagraphStyle(sourceBlock, styles);
  const nextBlockHeight =
    nextBlock?.type === "paragraph"
      ? (measuredHeights?.[nextBlock.id] ??
        estimateParagraphBlockHeight(
          nextBlock,
          styles,
          contentWidth,
          measurer,
          {
            allowSpacingBefore: !shouldCollapseContextualSpacing(
              sourceBlock,
              nextBlock,
              styles,
            ),
          },
          defaultTabStop,
        ))
      : nextBlock
        ? (measuredHeights?.[nextBlock.id] ??
          estimateTableBlockHeight(
            nextBlock,
            styles,
            contentWidth,
            measurer,
            defaultTabStop,
          ))
        : 0;
  if (
    paragraphStyle.keepWithNext &&
    track.blocks.length > 0 &&
    track.height + paragraphTotalHeight + nextBlockHeight >
      track.currentMaxHeight &&
    paragraphTotalHeight + nextBlockHeight <= track.currentMaxHeight
  ) {
    track.flush();
  }

  const previousBlock = track.blocks.at(-1);
  const previousParagraph =
    previousBlock?.blockType === "paragraph" &&
    previousBlock.sourceBlock?.type === "paragraph"
      ? previousBlock.sourceBlock
      : undefined;
  collapseWithPrevious =
    track.blocks.length > 0 &&
    shouldCollapseContextualSpacing(previousParagraph, sourceBlock, styles);
  if (collapseWithPrevious && previousBlock && previousParagraph) {
    const previousStyle = getEffectiveParagraphStyle(previousParagraph, styles);
    const collapsedSpacingAfter = previousStyle.spacingAfter ?? 0;
    if (collapsedSpacingAfter > 0) {
      previousBlock.estimatedHeight = Math.max(
        0,
        previousBlock.estimatedHeight - collapsedSpacingAfter,
      );
      track.height = Math.max(0, track.height - collapsedSpacingAfter);
      contextualAdjustedPreviousBlock = previousBlock;
      contextualAdjustedAmount = collapsedSpacingAfter;
    }
    paragraphTotalHeight =
      measuredHeights?.[sourceBlock.id] ??
      getProjectedParagraphBlockHeight(
        sourceBlock,
        paragraphLayout,
        styles,
        false,
      );
  }

  if (
    paragraphStyle.keepLinesTogether &&
    paragraphTotalHeight <= track.currentMaxHeight
  ) {
    if (
      track.blocks.length > 0 &&
      track.height + paragraphTotalHeight > track.currentMaxHeight
    ) {
      track.flush();
    }
    const segmentId = `${sourceBlock.id}:segment:0`;
    const rawMeasuredHeight = getParagraphMeasuredHeight(
      measuredHeights,
      sourceBlock.id,
      segmentId,
      true,
      paragraphTotalHeight,
    );
    const hasMeasuredHeight =
      measuredHeights?.[segmentId] !== undefined ||
      measuredHeights?.[sourceBlock.id] !== undefined;
    const measuredHeight =
      collapseWithPrevious && hasMeasuredHeight
        ? Math.max(0, rawMeasuredHeight - (paragraphStyle.spacingBefore ?? 0))
        : rawMeasuredHeight;
    track.blocks.push({
      blockId: segmentId,
      sourceBlockId: sourceBlock.id,
      blockType: sourceBlock.type,
      paragraphId: sourceBlock.id,
      globalIndex: index,
      estimatedHeight: measuredHeight,
      layout: paragraphLayout,
      sourceBlock,
    });
    track.height += measuredHeight;
    registerParagraphFloatingExclusions({
      track,
      layout: paragraphLayout,
      blockTop:
        track.height - measuredHeight + (paragraphStyle.spacingBefore ?? 0),
      params,
      resolveTextBoxHeight,
    });
    return;
  }

  let startLineIndex = 0;

  // Build a segment block given the resolved line range and height. Closed over
  // collapseWithPrevious / measuredHeights because both can change between
  // segment iterations (collapseWithPrevious is reset on flush).
  const buildSegmentBlock = (
    originalStart: number,
    lineEndIndex: number,
    segmentHeight: number,
    segmentId: string,
  ): EditorLayoutBlock => {
    const segmentLayout = createParagraphSegmentLayout(
      paragraphLayout,
      originalStart,
      lineEndIndex,
    );
    const isWholeParagraphSegment =
      originalStart === 0 && lineEndIndex === paragraphLayout.lines.length;
    const rawMeasuredHeight = getParagraphMeasuredHeight(
      measuredHeights,
      sourceBlock.id,
      segmentId,
      isWholeParagraphSegment,
      segmentHeight,
    );
    const hasMeasuredHeight =
      measuredHeights?.[segmentId] !== undefined ||
      (isWholeParagraphSegment &&
        measuredHeights?.[sourceBlock.id] !== undefined);
    const measuredHeight =
      collapseWithPrevious && originalStart === 0 && hasMeasuredHeight
        ? Math.max(0, rawMeasuredHeight - (paragraphStyle.spacingBefore ?? 0))
        : rawMeasuredHeight;
    return {
      blockId: segmentId,
      sourceBlockId: sourceBlock.id,
      blockType: sourceBlock.type,
      paragraphId: sourceBlock.id,
      globalIndex: index,
      estimatedHeight: measuredHeight,
      layout: segmentLayout,
      sourceBlock,
    };
  };

  paginateSegments(track, sourceBlock.id, {
    hasMore: () => startLineIndex < paragraphLayout.lines.length,

    fit(segmentId, remaining): EditorLayoutBlock | null {
      const originalStart = startLineIndex;
      let lineEndIndex = originalStart;
      let segmentHeight = 0;

      while (lineEndIndex < paragraphLayout.lines.length) {
        const candidateLines = paragraphLayout.lines.slice(
          originalStart,
          lineEndIndex + 1,
        );
        const candidateHeight = getParagraphSegmentHeight(
          sourceBlock,
          candidateLines,
          originalStart === 0,
          lineEndIndex === paragraphLayout.lines.length - 1,
          styles,
          !collapseWithPrevious,
        );
        const candidateFitHeight = getParagraphSegmentFitHeight(
          sourceBlock,
          candidateHeight,
          lineEndIndex === paragraphLayout.lines.length - 1,
          styles,
        );
        if (
          candidateFitHeight > remaining + PARAGRAPH_FIT_HEIGHT_TOLERANCE_PX &&
          lineEndIndex === originalStart &&
          track.blocks.length > 0
        ) {
          break;
        }
        if (
          candidateFitHeight > remaining + PARAGRAPH_FIT_HEIGHT_TOLERANCE_PX &&
          lineEndIndex > originalStart
        ) {
          break;
        }
        segmentHeight = candidateHeight;
        lineEndIndex += 1;
      }

      if (lineEndIndex === originalStart) return null;

      if (lineEndIndex < paragraphLayout.lines.length) {
        const widowOrphanAdjusted = applyWidowOrphanControl(
          sourceBlock,
          paragraphLayout.lines,
          originalStart,
          lineEndIndex,
          styles,
          !collapseWithPrevious,
          true,
          track.blocks.length > 0,
        );
        lineEndIndex = widowOrphanAdjusted.endLineIndexExclusive;
        segmentHeight = widowOrphanAdjusted.height;
        if (lineEndIndex === originalStart) return null;
      }

      const block = buildSegmentBlock(
        originalStart,
        lineEndIndex,
        segmentHeight,
        segmentId,
      );
      startLineIndex = lineEndIndex;
      return block;
    },

    force(segmentId): EditorLayoutBlock {
      const originalStart = startLineIndex;
      const lineEndIndex = Math.min(
        paragraphLayout.lines.length,
        originalStart + 1,
      );
      const segmentHeight = getParagraphSegmentHeight(
        sourceBlock,
        paragraphLayout.lines.slice(originalStart, lineEndIndex),
        originalStart === 0,
        lineEndIndex === paragraphLayout.lines.length,
        styles,
        !collapseWithPrevious,
      );
      const block = buildSegmentBlock(
        originalStart,
        lineEndIndex,
        segmentHeight,
        segmentId,
      );
      startLineIndex = lineEndIndex;
      return block;
    },

    onBeforeFlush() {
      if (contextualAdjustedPreviousBlock && contextualAdjustedAmount > 0) {
        contextualAdjustedPreviousBlock.estimatedHeight +=
          contextualAdjustedAmount;
        track.height += contextualAdjustedAmount;
        contextualAdjustedPreviousBlock = undefined;
        contextualAdjustedAmount = 0;
      }
      collapseWithPrevious = false;
    },

    onAfterPush(block, si) {
      if (si === 0) {
        registerParagraphFloatingExclusions({
          track,
          layout: block.layout!,
          blockTop:
            track.height -
            block.estimatedHeight +
            (paragraphStyle.spacingBefore ?? 0),
          params,
          resolveTextBoxHeight,
        });
      }
    },
  });
}
