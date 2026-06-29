import type {
  EditorParagraphNode,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
} from "@/core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTableCellFormatting,
} from "@/core/model.js";
import { DEFAULT_FONT_SIZE_PX } from "@/core/units.js";
import { NO_WRAP_MEASURE_WIDTH_PX } from "@/core/layoutConstants.js";
import { projectParagraphLayout } from "@/layoutProjection/index.js";
import { resolveCachedTableCellParagraph } from "@/layoutProjection/tableCellParagraphCache.js";
import { shouldCollapseContextualSpacing } from "@/layoutProjection/paragraphPagination.js";
import {
  estimateStackedParagraphHeight,
  resolveVerticalMode,
  type VerticalRenderMode,
} from "../verticalText.js";
import type {
  buildTableCellLayout,
  TableCellLayoutEntry,
} from "@/core/tableLayout.js";
import type {
  CanvasTableBorderSpec,
  CanvasUnsupportedReason,
} from "./types.js";
import {
  resolveBorder,
  resolveCellPadding,
  parseDimensionToPx,
  fitImagesToCellWidth,
  applyFitTextScale,
} from "./tableCellGeometry.js";

const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;

function resolveCellVerticalMode(
  cell: EditorTableCellNode,
): VerticalRenderMode {
  const direction =
    cell.style?.textDirection ?? cell.blocks[0]?.style?.textDirection ?? null;
  return resolveVerticalMode(direction);
}

function hasNestedTable(_cell: EditorTableCellNode): boolean {
  return false;
}

/** Horizontal extent of a single laid-out line, from its first to last caret. */
function lineNaturalWidth(
  line: ReturnType<typeof projectParagraphLayout>["lines"][number],
): number {
  if (line.slots.length < 2) return 0;
  return line.slots[line.slots.length - 1]!.left - line.slots[0]!.left;
}

export interface PreparedCell {
  rowIndex: number;
  cellIndex: number;
  cell: EditorTableCellNode;
  visualCol: number;
  colSpan: number;
  rowSpan: number;
  width: number;
  padding: { top: number; right: number; bottom: number; left: number };
  borders: {
    top: CanvasTableBorderSpec;
    right: CanvasTableBorderSpec;
    bottom: CanvasTableBorderSpec;
    left: CanvasTableBorderSpec;
    topLeftToBottomRight?: CanvasTableBorderSpec;
    topRightToBottomLeft?: CanvasTableBorderSpec;
  };
  contentWidthPx: number;
  projectedParagraphs: Array<{
    paragraph: EditorParagraphNode;
    lines: ReturnType<typeof projectParagraphLayout>["lines"];
    height: number;
    spacingBefore: number;
    spacingAfter: number;
  }>;
  contentNaturalHeightPx: number;
  verticalMode: VerticalRenderMode;
}

export function prepareCells(options: {
  table: EditorTableNode;
  sourceTable: EditorTableNode;
  tableEntries: ReturnType<typeof buildTableCellLayout>;
  columnOffsets: number[];
  cellSpacingPx: number;
  visualColumnCount: number;
  effectiveRowStyles: EditorTableNode["rows"][number]["style"][];
  state: EditorState;
  pageIndex: number;
}): { prepared: PreparedCell[]; unsupported: CanvasUnsupportedReason[] } {
  const {
    table,
    sourceTable,
    tableEntries,
    columnOffsets,
    cellSpacingPx,
    visualColumnCount,
    effectiveRowStyles,
    state,
    pageIndex,
  } = options;

  const unsupported: CanvasUnsupportedReason[] = [];
  const cellEntriesByKey = new Map(
    tableEntries.map(
      (entry): readonly [`${number}:${number}`, TableCellLayoutEntry] =>
        [`${entry.rowIndex}:${entry.cellIndex}`, entry] as const,
    ),
  );
  const prepared: PreparedCell[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex]!;
    if (effectiveRowStyles[rowIndex]?.hidden) continue;
    if (effectiveRowStyles[rowIndex]?.revision?.type === "delete") continue;

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const sourceCell = row.cells[cellIndex]!;
      if (sourceCell.style?.revision?.type === "delete") continue;

      const entry = cellEntriesByKey.get(`${rowIndex}:${cellIndex}`);
      if (!entry) continue;

      const formatting = resolveEffectiveTableCellFormatting({
        table: sourceTable,
        rowIndex,
        cellIndex,
        visualColumnIndex: entry.visualColumnIndex,
        columnCount: visualColumnCount,
        styles: state.document.styles,
      });
      const cell: EditorTableCellNode = {
        ...sourceCell,
        style: formatting.cellStyle,
        blocks: sourceCell.blocks.map(
          (paragraph): EditorParagraphNode =>
            resolveCachedTableCellParagraph(
              paragraph,
              formatting,
              state.document.styles,
            ),
        ),
      };
      const effectiveRow = formatting.rowStyle;
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      if (rowSpan > 1) unsupported.push("unsupported:v-span");
      if (cell.vMerge === "continue" || cell.vMerge === "restart")
        unsupported.push("unsupported:v-merge");
      if (hasNestedTable(cell)) unsupported.push("unsupported:nested-table");

      const visualCol = entry.visualColumnIndex;
      const colSpan = Math.max(1, entry.colSpan);
      const width = Math.max(
        1,
        (columnOffsets[visualCol + colSpan] ?? 0) -
          (columnOffsets[visualCol] ?? 0) -
          cellSpacingPx,
      );

      const padding = resolveCellPadding(cell);
      const logicalLeft = table.style?.bidiVisual
        ? cell.style?.borderEnd
        : cell.style?.borderStart;
      const logicalRight = table.style?.bidiVisual
        ? cell.style?.borderStart
        : cell.style?.borderEnd;
      const borders = {
        top: resolveBorder(cell.style?.borderTop),
        right: resolveBorder(cell.style?.borderRight ?? logicalRight),
        bottom: resolveBorder(cell.style?.borderBottom),
        left: resolveBorder(cell.style?.borderLeft ?? logicalLeft),
        ...(cell.style?.borderTopLeftToBottomRight
          ? {
              topLeftToBottomRight: resolveBorder(
                cell.style.borderTopLeftToBottomRight,
              ),
            }
          : {}),
        ...(cell.style?.borderTopRightToBottomLeft
          ? {
              topRightToBottomLeft: resolveBorder(
                cell.style.borderTopRightToBottomLeft,
              ),
            }
          : {}),
      };

      const contentWidthPx = Math.max(
        MIN_TABLE_CELL_CONTENT_WIDTH_PX,
        width -
          borders.left.width -
          borders.right.width -
          padding.left -
          padding.right,
      );

      const verticalMode = resolveCellVerticalMode(cell);
      const isRotated =
        verticalMode === "rotate-cw" || verticalMode === "rotate-ccw";
      const isStacked = verticalMode === "stack";
      const isFitText = !!cell.style?.fitText && !isRotated && !isStacked;

      const explicitRowHeightPx = parseDimensionToPx(effectiveRow.height);
      const hasExplicitRowHeight =
        explicitRowHeightPx !== null && explicitRowHeightPx > 0;
      const wrapWidth =
        isRotated || cell.style?.noWrap
          ? isRotated && hasExplicitRowHeight
            ? Math.max(
                MIN_TABLE_CELL_CONTENT_WIDTH_PX,
                explicitRowHeightPx -
                  borders.top.width -
                  borders.bottom.width -
                  padding.top -
                  padding.bottom,
              )
            : NO_WRAP_MEASURE_WIDTH_PX
          : contentWidthPx;

      const projectedParagraphs: PreparedCell["projectedParagraphs"] = [];
      let contentNaturalHeightPx = 0;

      for (const original of cell.blocks) {
        let paragraph = fitImagesToCellWidth(original, contentWidthPx);

        if (isFitText) {
          const noWrapProjected = projectParagraphLayout(
            paragraph,
            pageIndex,
            undefined,
            state.document.styles,
            NO_WRAP_MEASURE_WIDTH_PX,
            undefined,
            state.document.settings?.defaultTabStop,
          );
          const naturalWidth =
            noWrapProjected.lines.length > 0
              ? lineNaturalWidth(noWrapProjected.lines[0]!)
              : 0;
          if (naturalWidth > 0 && contentWidthPx > 0) {
            const scalePercent = Math.max(
              1,
              Math.min(600, (contentWidthPx / naturalWidth) * 100),
            );
            paragraph = applyFitTextScale(paragraph, scalePercent);
          }
        }

        const paragraphStyle = resolveEffectiveParagraphStyle(
          paragraph.style,
          state.document.styles,
        );
        const spacingBefore = paragraphStyle.spacingBefore ?? 0;
        const spacingAfter = paragraphStyle.spacingAfter ?? 0;

        if (isStacked) {
          const stackLength = estimateStackedParagraphHeight(paragraph, state);
          projectedParagraphs.push({
            paragraph,
            lines: [],
            height: stackLength,
            spacingBefore,
            spacingAfter,
          });
          const paragraphStyleSize =
            paragraph.runs[0]?.styles?.fontSize ?? DEFAULT_FONT_SIZE_PX;
          contentNaturalHeightPx = Math.max(
            contentNaturalHeightPx,
            hasExplicitRowHeight ? paragraphStyleSize * 1.25 : stackLength,
          );
          continue;
        }

        const projected = projectParagraphLayout(
          paragraph,
          pageIndex,
          undefined,
          state.document.styles,
          wrapWidth,
          undefined,
          state.document.settings?.defaultTabStop,
        );
        const linesBottom =
          projected.lines.length > 0
            ? Math.max(
                ...projected.lines.map(
                  (line): number => line.top + line.height,
                ),
              )
            : 1;
        let effectiveSpacingBefore = spacingBefore;
        if (!isRotated && projectedParagraphs.length > 0) {
          const previous = projectedParagraphs[projectedParagraphs.length - 1]!;
          if (
            state.document.settings?.allowSpaceOfSameStyleInTable &&
            shouldCollapseContextualSpacing(
              previous.paragraph,
              paragraph,
              state.document.styles,
            )
          ) {
            const removedAfter = previous.spacingAfter;
            previous.height = Math.max(1, previous.height - removedAfter);
            previous.spacingAfter = 0;
            contentNaturalHeightPx = Math.max(
              0,
              contentNaturalHeightPx - removedAfter,
            );
            effectiveSpacingBefore = 0;
          } else {
            const collapsed = Math.min(previous.spacingAfter, spacingBefore);
            if (collapsed > 0) {
              if (previous.spacingAfter >= spacingBefore) {
                effectiveSpacingBefore = 0;
              } else {
                const previousHeight = previous.height;
                previous.height = Math.max(1, previous.height - collapsed);
                contentNaturalHeightPx = Math.max(
                  0,
                  contentNaturalHeightPx - (previousHeight - previous.height),
                );
              }
            }
          }
        }
        const paragraphHeight = Math.max(
          1,
          effectiveSpacingBefore + linesBottom + spacingAfter,
        );
        projectedParagraphs.push({
          paragraph,
          lines: projected.lines,
          height: paragraphHeight,
          spacingBefore: effectiveSpacingBefore,
          spacingAfter,
        });
        if (isRotated) {
          const lineThickness =
            projected.lines.length > 0
              ? Math.max(...projected.lines.map((line): number => line.height))
              : paragraphHeight;
          const flowLength = projected.lines.length
            ? Math.max(
                ...projected.lines.map((line): number => {
                  const last = line.slots[line.slots.length - 1];
                  return last ? last.left : 0;
                }),
              )
            : paragraphHeight;
          contentNaturalHeightPx = Math.max(
            contentNaturalHeightPx,
            hasExplicitRowHeight
              ? lineThickness
              : Math.max(lineThickness, flowLength),
          );
        } else {
          contentNaturalHeightPx += paragraphHeight;
        }
      }

      if (cell.style?.hideMark) {
        const allEmpty = cell.blocks.every((para): boolean =>
          para.runs.every(
            (run): boolean =>
              (run.kind === "text" || run.kind === undefined) &&
              (!run.text || run.text.length === 0),
          ),
        );
        if (allEmpty) contentNaturalHeightPx = 0;
      }

      prepared.push({
        rowIndex,
        cellIndex,
        cell,
        visualCol,
        colSpan,
        rowSpan,
        width,
        padding,
        borders,
        contentWidthPx,
        projectedParagraphs,
        contentNaturalHeightPx,
        verticalMode,
      });
    }
  }

  return { prepared, unsupported };
}
