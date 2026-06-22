import { createSignal } from "solid-js";
import type {
  EditorBlockNode,
  EditorRevisionMetadata,
  EditorState,
} from "@/core/model.js";
import { getDocumentSections, getParagraphs } from "@/core/model.js";
import type { RevisionBox } from "@/ui/editorUiTypes.js";

export interface UseEditorRevisionProps {
  state: () => EditorState;
  surfaceRef: () => HTMLDivElement | null;
  /** Visual zoom factor `z`; screen-px offsets are divided by it for px-local. */
  zoomFactor?: () => number;
}

export function createEditorRevisionController(deps: UseEditorRevisionProps) {
  const [hoveredRevision, setHoveredRevision] =
    createSignal<RevisionBox | null>(null);

  const handleRevisionMouseEnter = (revisionId: string, event: MouseEvent) => {
    const paragraphs = getParagraphs(deps.state());
    let foundRevision:
      | (EditorRevisionMetadata & { type: RevisionBox["type"] })
      | undefined;
    for (const p of paragraphs) {
      for (const run of p.runs) {
        if (run.revision?.id === revisionId) {
          foundRevision = run.revision;
          break;
        }
      }
      if (foundRevision) break;
    }

    const findInBlocks = (blocks: EditorBlockNode[]): typeof foundRevision => {
      for (const block of blocks) {
        if (block.type === "paragraph") continue;
        if (block.style?.revision?.id === revisionId) {
          return block.style.revision;
        }
        if (block.gridRevision?.id === revisionId) return block.gridRevision;
        for (const row of block.rows) {
          if (row.style?.revision?.id === revisionId) return row.style.revision;
          if (row.style?.propertyRevision?.id === revisionId) {
            return row.style.propertyRevision;
          }
          for (const cell of row.cells) {
            if (cell.style?.revision?.id === revisionId) {
              return cell.style.revision;
            }
            if (cell.style?.propertyRevision?.id === revisionId) {
              return cell.style.propertyRevision;
            }
            const nested = findInBlocks(cell.blocks);
            if (nested) return nested;
          }
        }
      }
      return undefined;
    };
    if (!foundRevision) {
      for (const section of getDocumentSections(deps.state().document)) {
        for (const blocks of [
          section.blocks,
          section.header,
          section.firstPageHeader,
          section.evenPageHeader,
          section.footer,
          section.firstPageFooter,
          section.evenPageFooter,
        ]) {
          if (!blocks) continue;
          foundRevision = findInBlocks(blocks);
          if (foundRevision) break;
        }
        if (foundRevision) break;
      }
    }

    if (!foundRevision) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const surfaceRect = deps.surfaceRef()?.getBoundingClientRect();

    if (!surfaceRect) return;

    // Both rects come from getBoundingClientRect() (already scaled by `z`); the
    // overlay lives inside the scaled layer, so express the offset in px-local.
    const z = deps.zoomFactor?.() ?? 1;
    setHoveredRevision({
      revisionId: foundRevision.id,
      author: foundRevision.author,
      date: foundRevision.date,
      type: foundRevision.type,
      left: (rect.left - surfaceRect.left) / z,
      top: (rect.top - surfaceRect.top) / z,
    });
  };

  const handleRevisionMouseLeave = () => {
    setHoveredRevision(null);
  };

  return {
    hoveredRevision,
    handleRevisionMouseEnter,
    handleRevisionMouseLeave,
  };
}
