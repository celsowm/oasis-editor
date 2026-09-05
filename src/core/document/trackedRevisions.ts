import type {
  EditorBlockNode,
  EditorCommentAnchor,
  EditorComments,
  EditorDocument,
  EditorParagraphNode,
  EditorSection,
  EditorTableCellNode,
  EditorTableCellStyle,
  EditorTableNode,
  EditorTableRowNode,
  EditorTableRowStyle,
  EditorTableStyle,
  EditorTextRun,
  EditorTextStyle,
  EditorParagraphStyle,
} from "@/core/model.js";
import {
  getDocumentSectionsCanonical,
  getParagraphText,
} from "@/core/model.js";
import {
  cloneEndnotes,
  cloneFootnotes,
  cloneSection,
} from "@/core/cloneState.js";
import {
  cloneParagraphStyle,
  cloneStyle,
} from "@/core/textStyle/textStyleMutations.js";

export type EditorTrackedRevisionAction = "accept" | "reject";
export type EditorTrackedRevisionView = "final" | "original";

export type EditorTrackedRevisionIssueKind =
  | "revision-not-found"
  | "numbering-original-unavailable"
  | "structural-removal-unavailable"
  | "cell-merge-original-unavailable"
  | "table-property-exception-original-unavailable";

export interface EditorTrackedRevisionIssue {
  kind: EditorTrackedRevisionIssueKind;
  revisionId?: string;
  path: string;
  message: string;
}

export interface EditorTrackedRevisionResolutionResult {
  document: EditorDocument;
  changed: boolean;
  complete: boolean;
  resolvedRevisionIds: string[];
  unresolved: EditorTrackedRevisionIssue[];
}

interface ResolutionContext {
  action: EditorTrackedRevisionAction;
  revisionId?: string;
  changed: boolean;
  matched: boolean;
  resolvedRevisionIds: Set<string>;
  unresolved: EditorTrackedRevisionIssue[];
  unresolvedKeys: Set<string>;
  paragraphOffsetTransforms: Map<string, ParagraphOffsetTransform>;
  paragraphRelocations: Map<string, AnchorRelocation | null>;
}

interface ParagraphOffsetSegment {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  kept: boolean;
}

interface ParagraphOffsetTransform {
  segments: ParagraphOffsetSegment[];
  oldLength: number;
  newLength: number;
}

interface AnchorRelocation {
  paragraphId: string;
  /** Offset in the already-transformed target paragraph. */
  offset: number;
}

function matchesRevision(
  context: ResolutionContext,
  revisionId: string,
): boolean {
  return context.revisionId === undefined || context.revisionId === revisionId;
}

function markMatched(context: ResolutionContext): void {
  context.matched = true;
}

function markResolved(context: ResolutionContext, revisionId: string): void {
  context.matched = true;
  context.changed = true;
  context.resolvedRevisionIds.add(revisionId);
}

function pushIssue(
  context: ResolutionContext,
  issue: EditorTrackedRevisionIssue,
): void {
  context.matched = true;
  const key = `${issue.kind}:${issue.revisionId ?? ""}:${issue.path}`;
  if (context.unresolvedKeys.has(key)) return;
  context.unresolvedKeys.add(key);
  context.unresolved.push(issue);
}

function collectParagraphsDeep(
  blocks: EditorBlockNode[],
): EditorParagraphNode[] {
  const paragraphs: EditorParagraphNode[] = [];
  const collectBlocks = (story: EditorBlockNode[]): void => {
    for (const block of story) {
      if (block.type === "paragraph") {
        paragraphs.push(block);
        for (const run of block.runs) {
          if (run.kind === "textBox") collectBlocks(run.textBox.blocks);
        }
        continue;
      }
      for (const row of block.rows) {
        for (const cell of row.cells) collectBlocks(cell.blocks);
      }
    }
  };
  collectBlocks(blocks);
  return paragraphs;
}

function recordRemovedParagraphRelocations(
  before: EditorTableNode,
  after: EditorTableNode,
  context: ResolutionContext,
): void {
  const oldParagraphs = collectParagraphsDeep([before]);
  const newParagraphs = collectParagraphsDeep([after]);
  const newById = new Map(
    newParagraphs.map((paragraph) => [paragraph.id, paragraph]),
  );

  for (let index = 0; index < oldParagraphs.length; index += 1) {
    const paragraph = oldParagraphs[index]!;
    if (
      newById.has(paragraph.id) ||
      context.paragraphRelocations.has(paragraph.id)
    ) {
      continue;
    }

    let relocation: AnchorRelocation | null = null;
    for (let previous = index - 1; previous >= 0; previous -= 1) {
      const candidate = newById.get(oldParagraphs[previous]!.id);
      if (candidate) {
        relocation = {
          paragraphId: candidate.id,
          offset: getParagraphText(candidate).length,
        };
        break;
      }
    }
    if (!relocation) {
      for (
        let following = index + 1;
        following < oldParagraphs.length;
        following += 1
      ) {
        const candidate = newById.get(oldParagraphs[following]!.id);
        if (candidate) {
          relocation = { paragraphId: candidate.id, offset: 0 };
          break;
        }
      }
    }
    context.paragraphRelocations.set(paragraph.id, relocation);
  }
}

function stripTextPropertyRevision(
  style: EditorTextStyle | undefined,
): EditorTextStyle | undefined {
  const next = cloneStyle(style);
  if (!next) return undefined;
  delete next.propertyRevision;
  return Object.keys(next).length > 0 ? next : undefined;
}

function stripParagraphPropertyRevision(
  style: EditorParagraphStyle | undefined,
): EditorParagraphStyle | undefined {
  const next = cloneParagraphStyle(style);
  if (!next) return undefined;
  delete next.propertyRevision;
  return Object.keys(next).length > 0 ? next : undefined;
}

function resolveTextStyle(
  style: EditorTextStyle | undefined,
  path: string,
  context: ResolutionContext,
): EditorTextStyle | undefined {
  const revision = style?.propertyRevision;
  if (!revision || !matchesRevision(context, revision.id)) return style;
  markResolved(context, revision.id);
  if (context.action === "accept") {
    return stripTextPropertyRevision(style);
  }
  return stripTextPropertyRevision(revision.previous);
}

function resolveParagraphStyle(
  style: EditorParagraphStyle | undefined,
  path: string,
  context: ResolutionContext,
): EditorParagraphStyle | undefined {
  const revision = style?.propertyRevision;
  if (!revision || !matchesRevision(context, revision.id)) return style;
  markResolved(context, revision.id);
  if (context.action === "accept") {
    return stripParagraphPropertyRevision(style);
  }
  return stripParagraphPropertyRevision(revision.previous);
}

function resolveTableStyle(
  style: EditorTableStyle | undefined,
  path: string,
  context: ResolutionContext,
): EditorTableStyle | undefined {
  const revision = style?.revision;
  if (!revision || !matchesRevision(context, revision.id)) return style;
  markResolved(context, revision.id);
  const next = structuredClone(
    context.action === "accept" ? style : revision.previous,
  );
  delete next.revision;
  return next;
}

function resolveRowPropertyStyle(
  style: EditorTableRowStyle | undefined,
  path: string,
  context: ResolutionContext,
): EditorTableRowStyle | undefined {
  const revision = style?.propertyRevision;
  if (!revision || !matchesRevision(context, revision.id)) return style;
  markResolved(context, revision.id);
  const structuralRevision = style.revision
    ? structuredClone(style.revision)
    : undefined;
  const next = structuredClone(
    context.action === "accept" ? style : revision.previous,
  );
  delete next.propertyRevision;
  if (structuralRevision) next.revision = structuralRevision;
  return next;
}

function resolveCellPropertyStyle(
  style: EditorTableCellStyle | undefined,
  path: string,
  context: ResolutionContext,
): EditorTableCellStyle | undefined {
  const revision = style?.propertyRevision;
  if (!revision || !matchesRevision(context, revision.id)) return style;
  markResolved(context, revision.id);
  const structuralRevision = style.revision
    ? structuredClone(style.revision)
    : undefined;
  const next = structuredClone(
    context.action === "accept" ? style : revision.previous,
  );
  delete next.propertyRevision;
  if (structuralRevision) next.revision = structuralRevision;
  return next;
}

function shouldKeepRun(
  run: EditorTextRun,
  path: string,
  context: ResolutionContext,
): boolean {
  const revision = run.revision;
  if (!revision || !matchesRevision(context, revision.id)) return true;
  markResolved(context, revision.id);
  return context.action === "accept"
    ? revision.type === "insert"
    : revision.type === "delete";
}

function resolveRun(
  run: EditorTextRun,
  path: string,
  context: ResolutionContext,
): EditorTextRun | null {
  if (
    run.revisionRangeMarker &&
    matchesRevision(context, run.revisionRangeMarker.id)
  ) {
    markResolved(context, run.revisionRangeMarker.id);
    return null;
  }

  if (!shouldKeepRun(run, path, context)) return null;

  let next = run;
  if (run.revision && matchesRevision(context, run.revision.id)) {
    next = { ...next, revision: undefined };
  }

  const styles = resolveTextStyle(next.styles, `${path}.styles`, context);
  if (styles !== next.styles) {
    next = { ...next, styles };
  }

  if (next.kind === "textBox") {
    const blocks = transformBlocks(
      next.textBox.blocks,
      `${path}.textBox.blocks`,
      context,
    );
    if (blocks !== next.textBox.blocks) {
      next = {
        ...next,
        textBox: { ...next.textBox, blocks },
      };
    }
  }

  return next;
}

function transformParagraph(
  paragraph: EditorParagraphNode,
  path: string,
  context: ResolutionContext,
): EditorParagraphNode {
  const nextRuns: EditorTextRun[] = [];
  const segments: ParagraphOffsetSegment[] = [];
  let oldCursor = 0;
  let newCursor = 0;

  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const nextRun = resolveRun(run, `${path}.runs[${index}]`, context);
    if (!nextRun && run.kind === "textBox") {
      for (const nested of collectParagraphsDeep(run.textBox.blocks)) {
        if (!context.paragraphRelocations.has(nested.id)) {
          context.paragraphRelocations.set(nested.id, {
            paragraphId: paragraph.id,
            offset: newCursor,
          });
        }
      }
    }
    const length = run.text.length;
    segments.push({
      oldStart: oldCursor,
      oldEnd: oldCursor + length,
      newStart: newCursor,
      kept: nextRun !== null,
    });
    oldCursor += length;
    if (nextRun) {
      nextRuns.push(nextRun);
      newCursor += nextRun.text.length;
    }
  }

  if (oldCursor !== newCursor) {
    context.paragraphOffsetTransforms.set(paragraph.id, {
      segments,
      oldLength: oldCursor,
      newLength: newCursor,
    });
  }

  let next: EditorParagraphNode =
    nextRuns.length === paragraph.runs.length &&
    nextRuns.every((run, index) => run === paragraph.runs[index])
      ? paragraph
      : { ...paragraph, runs: nextRuns };

  const style = resolveParagraphStyle(next.style, `${path}.style`, context);
  if (style !== next.style) next = { ...next, style };

  const numberingRevision = next.numberingRevision;
  if (numberingRevision && matchesRevision(context, numberingRevision.id)) {
    markMatched(context);
    if (context.action === "accept") {
      markResolved(context, numberingRevision.id);
      next = { ...next, numberingRevision: undefined };
    } else {
      pushIssue(context, {
        kind: "numbering-original-unavailable",
        revisionId: numberingRevision.id,
        path: `${path}.numberingRevision`,
        message:
          "w:numberingChange only stores the previous rendered-number cache; it cannot reconstruct the previous numId/ilvl safely.",
      });
    }
  }

  return next;
}

function rawRevisionId(xml: string): string | undefined {
  return /\bw:id\s*=\s*["']([^"']+)["']/.exec(xml)?.[1];
}

function resolveRowStructuralRevision(
  row: EditorTableRowNode,
  path: string,
  context: ResolutionContext,
): EditorTableRowNode {
  const revision = row.style?.revision;
  if (!revision || !matchesRevision(context, revision.id)) return row;
  markMatched(context);

  if (context.action === "reject" && revision.type === "merge") {
    pushIssue(context, {
      kind: "cell-merge-original-unavailable",
      revisionId: revision.id,
      path,
      message:
        "The original table structure for this merge revision is not reconstructed by the core resolver yet.",
    });
    return row;
  }

  markResolved(context, revision.id);
  return {
    ...row,
    style: row.style ? { ...row.style, revision: undefined } : row.style,
  };
}

function restoreVerticalCellMerge(
  cell: EditorTableCellNode,
): EditorTableCellNode | undefined {
  const state = cell.mergeRevisionState;
  if (
    state?.orientation === "vertical" &&
    state.currentCellCount === 1 &&
    state.previousCells.length === 1
  ) {
    return structuredClone(state.previousCells[0]!);
  }

  const revision = cell.style?.revision;
  if (revision?.type === "merge" && revision.previous?.vMerge === "continue") {
    return {
      ...cell,
      blocks: [],
      rowSpan: undefined,
      vMerge: "continue",
      style: cell.style ? { ...cell.style, revision: undefined } : cell.style,
      mergeRevisionState: undefined,
    };
  }
  return undefined;
}

function resolveCellStructuralRevision(
  cell: EditorTableCellNode,
  path: string,
  context: ResolutionContext,
): EditorTableCellNode {
  const revision = cell.style?.revision;
  const mergeStateMatches =
    cell.mergeRevisionState &&
    matchesRevision(context, cell.mergeRevisionState.revisionId);

  if (revision && matchesRevision(context, revision.id)) {
    markMatched(context);
    if (context.action === "reject" && revision.type === "merge") {
      const restored = restoreVerticalCellMerge(cell);
      if (!restored) {
        pushIssue(context, {
          kind: "cell-merge-original-unavailable",
          revisionId: revision.id,
          path,
          message:
            "The previous merge topology lacks an exact semantic snapshot for safe restoration.",
        });
        return cell;
      }
      markResolved(context, revision.id);
      return restored;
    }

    markResolved(context, revision.id);
    return {
      ...cell,
      style: cell.style ? { ...cell.style, revision: undefined } : cell.style,
      ...(revision.type === "merge" ? { mergeRevisionState: undefined } : {}),
    };
  }

  if (mergeStateMatches) {
    const revisionId = cell.mergeRevisionState!.revisionId;
    markMatched(context);
    if (context.action === "accept") {
      markResolved(context, revisionId);
      return { ...cell, mergeRevisionState: undefined };
    }
    const restored = restoreVerticalCellMerge(cell);
    if (restored) {
      markResolved(context, revisionId);
      return restored;
    }
    pushIssue(context, {
      kind: "cell-merge-original-unavailable",
      revisionId,
      path: `${path}.mergeRevisionState`,
      message:
        "The preserved merge snapshot is not a supported exact vertical-cell restoration.",
    });
  }

  return cell;
}

function transformCell(
  cell: EditorTableCellNode,
  path: string,
  context: ResolutionContext,
): EditorTableCellNode {
  let next = resolveCellStructuralRevision(cell, path, context);
  const style = resolveCellPropertyStyle(next.style, `${path}.style`, context);
  if (style !== next.style) next = { ...next, style };
  const blocks = transformBlocks(next.blocks, `${path}.blocks`, context);
  if (blocks !== next.blocks) next = { ...next, blocks };
  return next;
}

function transformRow(
  row: EditorTableRowNode,
  path: string,
  context: ResolutionContext,
): EditorTableRowNode {
  let next = resolveRowStructuralRevision(row, path, context);
  const style = resolveRowPropertyStyle(next.style, `${path}.style`, context);
  if (style !== next.style) next = { ...next, style };

  const propertyExceptionsRevision = next.propertyExceptionsRevision;
  if (
    propertyExceptionsRevision &&
    matchesRevision(context, propertyExceptionsRevision.id)
  ) {
    markResolved(context, propertyExceptionsRevision.id);
    next = {
      ...next,
      propertyExceptions:
        context.action === "accept"
          ? next.propertyExceptions
          : structuredClone(propertyExceptionsRevision.previous),
      propertyExceptionsRevision: undefined,
      tblPrExChangeXml: undefined,
    };
  } else if (next.tblPrExChangeXml && !propertyExceptionsRevision) {
    const revisionId = rawRevisionId(next.tblPrExChangeXml);
    if (revisionId && matchesRevision(context, revisionId)) {
      markMatched(context);
      if (context.action === "accept") {
        markResolved(context, revisionId);
        next = { ...next, tblPrExChangeXml: undefined };
      } else {
        pushIssue(context, {
          kind: "table-property-exception-original-unavailable",
          revisionId,
          path: `${path}.tblPrExChangeXml`,
          message:
            "The imported w:tblPrExChange has no decodable previous w:tblPrEx snapshot.",
        });
      }
    }
  }

  const cells: EditorTableCellNode[] = [];
  let cellsChanged = false;
  for (let index = 0; index < next.cells.length; index += 1) {
    const cell = next.cells[index]!;
    const revision = cell.style?.revision;
    const remove =
      revision &&
      matchesRevision(context, revision.id) &&
      ((context.action === "accept" && revision.type === "delete") ||
        (context.action === "reject" && revision.type === "insert"));
    if (remove) {
      markResolved(context, revision.id);
      cellsChanged = true;
      continue;
    }
    const transformed = transformCell(cell, `${path}.cells[${index}]`, context);
    cells.push(transformed);
    if (transformed !== cell) cellsChanged = true;
  }
  if (cellsChanged) next = { ...next, cells };
  return next;
}

function recomputeVerticalMergeRowSpans(
  table: EditorTableNode,
): EditorTableNode {
  let changed = false;
  const rows = table.rows.map((row, rowIndex) => {
    let rowChanged = false;
    const cells = row.cells.map((cell, cellIndex) => {
      let rowSpan: number | undefined;
      if (cell.vMerge === "restart") {
        rowSpan = 1;
        for (
          let nextRowIndex = rowIndex + 1;
          nextRowIndex < table.rows.length;
          nextRowIndex += 1
        ) {
          const nextCell = table.rows[nextRowIndex]!.cells[cellIndex];
          if (!nextCell || nextCell.vMerge !== "continue") break;
          rowSpan += 1;
        }
      }
      if (cell.rowSpan === rowSpan) return cell;
      rowChanged = true;
      return { ...cell, rowSpan };
    });
    if (!rowChanged) return row;
    changed = true;
    return { ...row, cells };
  });
  return changed ? { ...table, rows } : table;
}

function transformTable(
  table: EditorTableNode,
  path: string,
  context: ResolutionContext,
): EditorTableNode {
  let next = table;
  const style = resolveTableStyle(next.style, `${path}.style`, context);
  if (style !== next.style) next = { ...next, style };

  const gridRevision = next.gridRevision;
  if (gridRevision && matchesRevision(context, gridRevision.id)) {
    markResolved(context, gridRevision.id);
    if (context.action === "accept") {
      next = { ...next, gridRevision: undefined };
    } else {
      next = {
        ...next,
        gridCols: [...gridRevision.previous],
        gridRevision: undefined,
      };
    }
  }

  const rows: EditorTableRowNode[] = [];
  let rowsChanged = false;
  for (let index = 0; index < next.rows.length; index += 1) {
    const row = next.rows[index]!;
    const revision = row.style?.revision;
    const remove =
      revision &&
      matchesRevision(context, revision.id) &&
      ((context.action === "accept" && revision.type === "delete") ||
        (context.action === "reject" && revision.type === "insert"));
    if (remove) {
      markResolved(context, revision.id);
      rowsChanged = true;
      continue;
    }
    const transformed = transformRow(row, `${path}.rows[${index}]`, context);
    rows.push(transformed);
    if (transformed !== row) rowsChanged = true;
  }
  if (rowsChanged) next = { ...next, rows };
  if (rowsChanged) {
    next = recomputeVerticalMergeRowSpans(next);
    recordRemovedParagraphRelocations(table, next, context);
  }
  return next;
}

function transformBlocks(
  blocks: EditorBlockNode[],
  path: string,
  context: ResolutionContext,
): EditorBlockNode[] {
  let changed = false;
  const next = blocks.map((block, index): EditorBlockNode => {
    const blockPath = `${path}[${index}]`;
    const transformed =
      block.type === "paragraph"
        ? transformParagraph(block, blockPath, context)
        : transformTable(block, blockPath, context);
    if (transformed !== block) changed = true;
    return transformed;
  });
  return changed ? next : blocks;
}

const SECTION_STORY_KEYS = [
  "header",
  "firstPageHeader",
  "evenPageHeader",
  "footer",
  "firstPageFooter",
  "evenPageFooter",
] as const;

function applySectionPropertyRevisions(
  sections: EditorSection[],
  context: ResolutionContext,
): void {
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index]!;
    const revision = section.propertyRevision;
    if (!revision || !matchesRevision(context, revision.id)) continue;
    markResolved(context, revision.id);
    if (context.action === "accept") {
      sections[index] = { ...section, propertyRevision: undefined };
      continue;
    }

    const previous = structuredClone(revision.previous);
    sections[index] = {
      ...section,
      pageSettings: previous.pageSettings,
      pageBorder: previous.pageBorder,
      pageNumbering: previous.pageNumbering,
      verticalAlignment: previous.verticalAlignment,
      bidi: previous.bidi,
      propertyRevision: undefined,
    };

    const nextSection = sections[index + 1];
    if (nextSection) {
      sections[index + 1] = {
        ...nextSection,
        breakType: previous.nextBreakType,
      };
    }
  }
}

function transformSectionStories(
  sections: EditorSection[],
  context: ResolutionContext,
): void {
  for (let index = 0; index < sections.length; index += 1) {
    let section = sections[index]!;
    const blocks = transformBlocks(
      section.blocks,
      `sections[${index}].blocks`,
      context,
    );
    if (blocks !== section.blocks) section = { ...section, blocks };

    for (const key of SECTION_STORY_KEYS) {
      const story = section[key];
      if (!story) continue;
      const nextStory = transformBlocks(
        story,
        `sections[${index}].${key}`,
        context,
      );
      if (nextStory !== story) section = { ...section, [key]: nextStory };
    }
    sections[index] = section;
  }
}

function transformNoteStories(
  document: EditorDocument,
  context: ResolutionContext,
): void {
  if (document.footnotes) {
    for (const [id, note] of Object.entries(document.footnotes.items)) {
      note.blocks = transformBlocks(
        note.blocks,
        `footnotes.items[${JSON.stringify(id)}].blocks`,
        context,
      );
    }
    if (document.footnotes.separator) {
      document.footnotes.separator = transformBlocks(
        document.footnotes.separator,
        "footnotes.separator",
        context,
      );
    }
    if (document.footnotes.continuationSeparator) {
      document.footnotes.continuationSeparator = transformBlocks(
        document.footnotes.continuationSeparator,
        "footnotes.continuationSeparator",
        context,
      );
    }
  }

  if (document.endnotes) {
    for (const [id, note] of Object.entries(document.endnotes.items)) {
      note.blocks = transformBlocks(
        note.blocks,
        `endnotes.items[${JSON.stringify(id)}].blocks`,
        context,
      );
    }
    if (document.endnotes.separator) {
      document.endnotes.separator = transformBlocks(
        document.endnotes.separator,
        "endnotes.separator",
        context,
      );
    }
    if (document.endnotes.continuationSeparator) {
      document.endnotes.continuationSeparator = transformBlocks(
        document.endnotes.continuationSeparator,
        "endnotes.continuationSeparator",
        context,
      );
    }
  }
}

function mapParagraphOffset(
  transform: ParagraphOffsetTransform,
  offset: number,
): number {
  const clamped = Math.max(0, Math.min(offset, transform.oldLength));
  for (const segment of transform.segments) {
    if (clamped > segment.oldEnd) continue;
    if (!segment.kept) return segment.newStart;
    return segment.newStart + Math.max(0, clamped - segment.oldStart);
  }
  return transform.newLength;
}

function transformAnchor<T extends { paragraphId: string; offset: number }>(
  anchor: T | undefined,
  transforms: Map<string, ParagraphOffsetTransform>,
  relocations: Map<string, AnchorRelocation | null>,
): T | undefined {
  if (!anchor) return undefined;

  let paragraphId = anchor.paragraphId;
  let offset = anchor.offset;
  let relocated = false;
  const seen = new Set<string>();
  while (relocations.has(paragraphId)) {
    if (seen.has(paragraphId)) return undefined;
    seen.add(paragraphId);
    const relocation = relocations.get(paragraphId);
    if (!relocation) return undefined;
    paragraphId = relocation.paragraphId;
    offset = relocation.offset;
    relocated = true;
  }

  if (!relocated) {
    const transform = transforms.get(paragraphId);
    if (transform) offset = mapParagraphOffset(transform, offset);
  }

  return paragraphId === anchor.paragraphId && offset === anchor.offset
    ? anchor
    : { ...anchor, paragraphId, offset };
}

function transformBookmarks(
  document: EditorDocument,
  transforms: Map<string, ParagraphOffsetTransform>,
  relocations: Map<string, AnchorRelocation | null>,
): void {
  if (!document.bookmarks || (transforms.size === 0 && relocations.size === 0))
    return;
  let changed = false;
  const items = { ...document.bookmarks.items };
  const order: string[] = [];
  for (const id of document.bookmarks.order) {
    const bookmark = document.bookmarks.items[id];
    if (!bookmark) continue;
    const mappedStart = transformAnchor(
      bookmark.start,
      transforms,
      relocations,
    );
    const mappedEnd = transformAnchor(bookmark.end, transforms, relocations);
    const start = mappedStart ?? (bookmark.start ? mappedEnd : undefined);
    const end = mappedEnd ?? (bookmark.end ? mappedStart : undefined);
    if (!start && !end) {
      delete items[id];
      changed = true;
      continue;
    }
    order.push(id);
    if (start !== bookmark.start || end !== bookmark.end) {
      items[id] = { ...bookmark, start, end };
      changed = true;
    }
  }
  if (changed) document.bookmarks = { ...document.bookmarks, items, order };
}

function transformComments(
  comments: EditorComments | undefined,
  transforms: Map<string, ParagraphOffsetTransform>,
  relocations: Map<string, AnchorRelocation | null>,
): EditorComments | undefined {
  if (!comments || (transforms.size === 0 && relocations.size === 0))
    return comments;
  let changed = false;
  const items = { ...comments.items };
  const order: string[] = [];
  for (const id of comments.order) {
    const comment = comments.items[id];
    if (!comment) continue;
    const mappedStart = transformAnchor<EditorCommentAnchor>(
      comment.start,
      transforms,
      relocations,
    );
    const mappedEnd = transformAnchor<EditorCommentAnchor>(
      comment.end,
      transforms,
      relocations,
    );
    const start = mappedStart ?? (comment.start ? mappedEnd : undefined);
    const end = mappedEnd ?? (comment.end ? mappedStart : undefined);
    if (!start && !end) {
      delete items[id];
      changed = true;
      continue;
    }
    order.push(id);
    if (start !== comment.start || end !== comment.end) {
      items[id] = { ...comment, start, end };
      changed = true;
    }
  }
  return changed ? { ...comments, items, order } : comments;
}

function resolve(
  document: EditorDocument,
  action: EditorTrackedRevisionAction,
  revisionId?: string,
): EditorTrackedRevisionResolutionResult {
  const context: ResolutionContext = {
    action,
    revisionId,
    changed: false,
    matched: false,
    resolvedRevisionIds: new Set<string>(),
    unresolved: [],
    unresolvedKeys: new Set<string>(),
    paragraphOffsetTransforms: new Map<string, ParagraphOffsetTransform>(),
    paragraphRelocations: new Map<string, AnchorRelocation | null>(),
  };

  const sections = getDocumentSectionsCanonical(document).map(cloneSection);
  const next: EditorDocument = {
    ...document,
    sections,
    footnotes: cloneFootnotes(document.footnotes),
    endnotes: cloneEndnotes(document.endnotes),
  };

  transformSectionStories(sections, context);
  transformNoteStories(next, context);
  applySectionPropertyRevisions(sections, context);
  transformBookmarks(
    next,
    context.paragraphOffsetTransforms,
    context.paragraphRelocations,
  );
  next.comments = transformComments(
    next.comments,
    context.paragraphOffsetTransforms,
    context.paragraphRelocations,
  );

  if (revisionId !== undefined && !context.matched) {
    context.unresolved.push({
      kind: "revision-not-found",
      revisionId,
      path: "document",
      message: `Tracked revision ${revisionId} was not found in the modeled document.`,
    });
  }

  return {
    document: context.changed ? next : document,
    changed: context.changed,
    complete: context.unresolved.length === 0,
    resolvedRevisionIds: [...context.resolvedRevisionIds],
    unresolved: context.unresolved,
  };
}

/** Resolve every modeled tracked change whose semantics are safe for the action. */
export function resolveAllTrackedRevisions(
  document: EditorDocument,
  action: EditorTrackedRevisionAction,
): EditorTrackedRevisionResolutionResult {
  return resolve(document, action);
}

/** Resolve one logical tracked revision id across every run/property it spans. */
export function resolveTrackedRevision(
  document: EditorDocument,
  revisionId: string,
  action: EditorTrackedRevisionAction,
): EditorTrackedRevisionResolutionResult {
  return resolve(document, action, revisionId);
}

/**
 * Build Word-style Final/Original projections without mutating the source model.
 * `complete` is false when the requested projection requires semantics that are
 * still preservation-only (currently previous numbering and destructive table
 * subtree reconstruction).
 */
export function projectTrackedRevisions(
  document: EditorDocument,
  view: EditorTrackedRevisionView,
): EditorTrackedRevisionResolutionResult {
  return resolveAllTrackedRevisions(
    document,
    view === "final" ? "accept" : "reject",
  );
}
