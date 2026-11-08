import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import {
  getDocumentSectionsCanonical,
  getParagraphLength,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { createEditorParagraph } from "@/core/editorState.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { deleteSelectionRange, getFocusParagraph, withSelection } from "@/core/selection/rangeEditing.js";
import { sliceRuns } from "@/core/document/paragraphRuns.js";
import { insertClipboardParagraphsAtSelection } from "@/core/commands/clipboard.js";
import { importHtmlToEditorDocument } from "@/import/html/importHtmlToEditorDocument.js";

/**
 * Inserts an HTML fragment at the caret, replacing the current selection.
 * A single document-state transaction preserves table blocks and nested tables.
 */
export function insertHtmlAtSelection(state: EditorState, html: string): EditorState {
  if (!html.trim()) return state;
  const imported = importHtmlToEditorDocument(html);
  const incoming = getDocumentSectionsCanonical(imported)[0]?.blocks ?? [];
  if (incoming.length === 0) return state;

  // Preserve the editor's existing inline paste behavior for paragraph-only
  // fragments, including caret positioning and surrounding text styles.
  if (incoming.every((block) => block.type === "paragraph")) {
    const paragraphs = incoming as EditorParagraphNode[];
    return insertClipboardParagraphsAtSelection(
      state,
      paragraphs.map((paragraph) => ({
        runs: paragraph.runs.map((run) => ({
          text: run.text,
          styles: run.styles,
          ...(run.kind === "image" ? { image: run.image } : {}),
        })),
        style: paragraph.style,
        list: paragraph.list,
      })),
    );
  }

  const collapsed = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, offset } = getFocusParagraph(collapsed);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const fresh = createEditorParagraph("");
  const before: EditorParagraphNode = {
    ...paragraph,
    runs: beforeRuns.length ? beforeRuns : createEditorParagraph("").runs,
  };
  const after: EditorParagraphNode = {
    ...paragraph,
    id: fresh.id,
    runs: afterRuns.length ? afterRuns : fresh.runs,
  };
  const replacement: EditorBlockNode[] = [
    ...(offset > 0 ? [before] : []),
    ...incoming,
    ...(afterRuns.length || incoming[incoming.length - 1]?.type === "table"
      ? [after] : []),
  ];

  let found = false;
  const insertIn = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    let changed = false;
    const next = blocks.flatMap((block): EditorBlockNode[] => {
      if (block.type === "paragraph" && block.id === paragraph.id) {
        found = true;
        changed = true;
        return replacement;
      }
      if (block.type !== "table") return [block];
      let tableChanged = false;
      const rows = block.rows.map((row) => {
        let rowChanged = false;
        const cells = row.cells.map((cell) => {
          const newBlocks = insertIn(cell.blocks);
          if (newBlocks === cell.blocks) return cell;
          rowChanged = true;
          return { ...cell, blocks: newBlocks };
        });
        if (!rowChanged) return row;
        tableChanged = true;
        return { ...row, cells };
      });
      if (!tableChanged) return [block];
      changed = true;
      return [{ ...block, rows }];
    });
    return changed ? next : blocks;
  };

  const zone = collapsed.activeZone ?? "main";
  let nextDocument: EditorDocument = collapsed.document;
  if (zone === "footnote" && collapsed.activeFootnoteId &&
      collapsed.document.footnotes?.items[collapsed.activeFootnoteId]) {
    const footnotes = collapsed.document.footnotes;
    const item = footnotes.items[collapsed.activeFootnoteId]!;
    const blocks = insertIn(item.blocks);
    if (found) {
      nextDocument = {
        ...collapsed.document,
        footnotes: {
          ...footnotes,
          items: {
            ...footnotes.items,
            [collapsed.activeFootnoteId]: { ...item, blocks },
          },
        },
      };
    }
  } else {
    const sections = getDocumentSectionsCanonical(collapsed.document);
    const index = Math.max(0, Math.min(collapsed.activeSectionIndex ?? 0, sections.length - 1));
    const section = sections[index];
    if (!section) return state;
    const field = zone === "header" ? "header" : zone === "footer" ? "footer" : "blocks";
    const newBlocks = insertIn(section[field] ?? []);
    if (found) {
      const nextSections = [...sections];
      nextSections[index] = { ...section, [field]: newBlocks };
      nextDocument = { ...collapsed.document, sections: nextSections };
    }
  }
  if (!found) return state;

  const last = incoming[incoming.length - 1]!;
  const caret = last.type === "paragraph" && !afterRuns.length
    ? paragraphOffsetToPosition(last, getParagraphLength(last))
    : paragraphOffsetToPosition(after, 0);

  return { ...collapsed, document: nextDocument, selection: withSelection(caret) };
}
