import type {
  EditorBlockNode,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTableCellNode,
  EditorTextRun,
} from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import type { BookmarkBoundaryEvent } from "@/export/docx/bookmarksXml.js";
import { serializeBookmarkEvent } from "@/export/docx/bookmarksXml.js";
import type { CommentBoundaryEvent } from "@/export/docx/commentsXml.js";
import { serializeCommentRangeEvent } from "@/export/docx/commentsXml.js";
import { serializeTableXmlPreservingSource } from "@/export/docx/tableSourceXml.js";
import { assertNever } from "@/core/assertNever.js";
import { serializeParagraphProperties } from "./paragraphPropertiesXml.js";
import { serializeRunWithRelationships } from "./runXml.js";
import { serializeSdtPrXml } from "./sdtXml.js";
import { serializeRunsWithInlineSdts } from "./inlineSdtXml.js";
import { serializeDropCapFrameParagraph } from "./dropCapXml.js";
import {
  getEditorParagraphOoxmlAttributes,
  getEditorTableOoxmlSource,
  getReusableEditorParagraphXml,
  getReusableEditorTableXml,
} from "@/ooxml/word/sourceFragments.js";
import { mergeParagraphPropertiesOoxmlSource } from "./sourceParagraphPropertiesXml.js";
import { overlayEditorParagraphOnOoxmlSource } from "./sourceParagraphXml.js";

function isSplittableTextRun(run: EditorTextRun): boolean {
  return run.kind === "text" || run.kind === "sym";
}

interface BoundaryToken {
  offset: number;
  seq: number;
  xml: string;
}

/**
 * Boundary insertion is stateful so it can be used as the leaf serializer of
 * `serializeRunsWithInlineSdts`. This preserves SDT envelopes while still
 * splitting text runs at bookmark/comment offsets.
 */
function serializeRunsWithInlineSdtsAndBoundaries(
  runs: EditorTextRun[],
  tokens: BoundaryToken[],
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const sorted = [...tokens].sort(
    (a, b): number => a.offset - b.offset || a.seq - b.seq,
  );
  let eventIndex = 0;
  let position = 0;

  const serializeLeafRun = (run: EditorTextRun): string => {
    let out = "";
    const runStart = position;
    const runEnd = runStart + run.text.length;

    while (
      eventIndex < sorted.length &&
      sorted[eventIndex]!.offset <= runStart
    ) {
      out += sorted[eventIndex]!.xml;
      eventIndex += 1;
    }

    if (isSplittableTextRun(run) && run.text.length > 0) {
      let cursor = runStart;
      while (
        eventIndex < sorted.length &&
        sorted[eventIndex]!.offset < runEnd
      ) {
        const token = sorted[eventIndex]!;
        if (token.offset > cursor) {
          out += serializeRunWithRelationships(
            {
              ...run,
              text: run.text.slice(cursor - runStart, token.offset - runStart),
            },
            context,
            paragraphStyleId,
            styles,
            serializeBlocksXml,
          );
        }
        out += token.xml;
        eventIndex += 1;
        cursor = token.offset;
      }
      if (cursor < runEnd) {
        out += serializeRunWithRelationships(
          { ...run, text: run.text.slice(cursor - runStart) },
          context,
          paragraphStyleId,
          styles,
          serializeBlocksXml,
        );
      }
    } else {
      out += serializeRunWithRelationships(
        run,
        context,
        paragraphStyleId,
        styles,
        serializeBlocksXml,
      );
    }
    position = runEnd;
    return out;
  };

  let out = serializeRunsWithInlineSdts(runs, serializeLeafRun);
  while (eventIndex < sorted.length) {
    out += sorted[eventIndex]!.xml;
    eventIndex += 1;
  }
  return out;
}

function blockHasGeneratedBoundaryTokens(
  block: EditorBlockNode,
  context: DocContext,
): boolean {
  switch (block.type) {
    case "paragraph":
      return Boolean(
        context.bookmarkEventsByParagraph?.has(block.id) ||
        context.commentEventsByParagraph?.has(block.id),
      );
    case "table":
      return tableHasGeneratedBoundaryTokens(block, context);
    default:
      return assertNever(block, "block");
  }
}

function tableHasGeneratedBoundaryTokens(
  table: Extract<EditorBlockNode, { type: "table" }>,
  context: DocContext,
): boolean {
  return table.rows.some((row): boolean =>
    row.cells.some((cell): boolean =>
      cell.blocks.some((block): boolean =>
        blockHasGeneratedBoundaryTokens(block, context),
      ),
    ),
  );
}

function tableSourceNeedsCanonicalRowAlignment(
  table: Extract<EditorBlockNode, { type: "table" }>,
): boolean {
  const sourceXml = getEditorTableOoxmlSource(table)?.xml;
  return Boolean(
    sourceXml &&
    /<w:trPr(?:\s|>)[\s\S]*?<w:jc\b[^>]*\bw:val="(?:start|end)"/.test(
      sourceXml,
    ),
  );
}

function serializeTableCellBlockXml(
  block: EditorBlockNode,
  cell: EditorTableCellNode,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  if (block.type === "paragraph") {
    return serializeParagraphXml(block, context, styles, {
      align: cell.style?.horizontalAlign,
    });
  }
  return serializeSingleBlockXml(block, context, styles);
}

function serializeSingleBlockXml(
  block: EditorBlockNode,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  switch (block.type) {
    case "paragraph":
      return serializeParagraphXml(block, context, styles);
    case "table": {
      const pageBreakXml = block.style?.pageBreakBefore
        ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
        : "";
      const reusableTableXml = tableSourceNeedsCanonicalRowAlignment(block)
        ? undefined
        : getReusableEditorTableXml(block, {
            hasBoundaryTokens: tableHasGeneratedBoundaryTokens(block, context),
          });
      return (
        pageBreakXml +
        (reusableTableXml ??
          serializeTableXmlPreservingSource(block, (cellBlock, cell): string =>
            serializeTableCellBlockXml(cellBlock, cell, context, styles),
          ))
      );
    }
    default:
      return assertNever(block, "block");
  }
}

export function serializeBlocksXml(
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  let out = "";
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i]!;
    const wrapper = block.sdtWrappers?.[0];
    if (!wrapper) {
      out += serializeSingleBlockXml(block, context, styles);
      i += 1;
      continue;
    }
    const group: EditorBlockNode[] = [];
    let j = i;
    while (
      j < blocks.length &&
      blocks[j]!.sdtWrappers?.[0]?.groupId === wrapper.groupId
    ) {
      const rest = blocks[j]!.sdtWrappers!.slice(1);
      group.push({
        ...blocks[j]!,
        sdtWrappers: rest.length > 0 ? rest : undefined,
      } as EditorBlockNode);
      j += 1;
    }
    const inner = serializeBlocksXml(group, context, styles);
    out +=
      `<w:sdt>${serializeSdtPrXml(wrapper.sdtPr)}${wrapper.sdtEndPrXml ?? ""}` +
      `<w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
    i = j;
  }
  return out;
}

export function serializeParagraphXml(
  paragraph: EditorParagraphNode,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  overrides?: { align?: EditorParagraphStyle["align"] },
): string {
  const runs =
    paragraph.runs.length > 0
      ? paragraph.runs
      : [{ id: "", text: "", kind: "text" as const }];
  const dropCapFrame = paragraph.dropCap
    ? serializeDropCapFrameParagraph(paragraph.dropCap)
    : "";
  const bookmarkEvents = context.bookmarkEventsByParagraph?.get(paragraph.id);
  const commentEvents = context.commentEventsByParagraph?.get(paragraph.id);
  const boundaryTokens: BoundaryToken[] = [
    ...(bookmarkEvents ?? []).map(
      (
        e: BookmarkBoundaryEvent,
      ): { offset: number; seq: number; xml: string } => ({
        offset: e.offset,
        seq: e.seq,
        xml: serializeBookmarkEvent(e),
      }),
    ),
    ...(commentEvents ?? []).map(
      (
        e: CommentBoundaryEvent,
      ): { offset: number; seq: number; xml: string } => ({
        offset: e.offset,
        seq: e.seq,
        xml: serializeCommentRangeEvent(e),
      }),
    ),
  ];

  const reusableParagraphXml = getReusableEditorParagraphXml(paragraph, {
    hasOverrides: Boolean(overrides),
    hasBoundaryTokens: boundaryTokens.length > 0,
  });
  if (reusableParagraphXml) return reusableParagraphXml;

  const serializeCanonicalRun = (run: EditorTextRun): string =>
    serializeRunWithRelationships(
      run,
      context,
      paragraph.style?.styleId,
      styles,
      serializeBlocksXml,
    );

  const serializedRunXml =
    boundaryTokens.length === 0
      ? (runs as EditorTextRun[]).map(serializeCanonicalRun)
      : undefined;
  const runsXml =
    boundaryTokens.length === 0
      ? serializeRunsWithInlineSdts(
          runs as EditorTextRun[],
          serializeCanonicalRun,
        )
      : serializeRunsWithInlineSdtsAndBoundaries(
          runs as EditorTextRun[],
          boundaryTokens,
          context,
          paragraph.style?.styleId,
          styles,
        );
  const sourceAttributes = getEditorParagraphOoxmlAttributes(paragraph);
  const paragraphAttributes = sourceAttributes ? ` ${sourceAttributes}` : "";
  const generatedParagraphProperties = serializeParagraphProperties(
    paragraph,
    context.numberingInfo,
    styles,
    overrides,
  );
  const paragraphProperties = mergeParagraphPropertiesOoxmlSource(
    paragraph,
    generatedParagraphProperties,
    Boolean(overrides),
  );

  if (serializedRunXml) {
    const overlaidParagraphXml = overlayEditorParagraphOnOoxmlSource(
      paragraph,
      paragraphProperties,
      serializedRunXml,
      {
        hasOverrides: Boolean(overrides),
        hasBoundaryTokens: false,
      },
    );
    if (overlaidParagraphXml) return overlaidParagraphXml;
  }

  return `${dropCapFrame}<w:p${paragraphAttributes}>${paragraphProperties}${runsXml}</w:p>`;
}
