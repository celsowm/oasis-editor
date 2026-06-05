import { createSignal } from "solid-js";
import type { EditorState, EditorRevision } from "../../core/model.js";
import { getParagraphs } from "../../core/model.js";
import type { RevisionBox } from "../../ui/editorUiTypes.js";

export interface UseEditorRevisionProps {
  state: () => EditorState;
  surfaceRef: () => HTMLDivElement | null;
}

export function createEditorRevisionController(deps: UseEditorRevisionProps) {
  const [hoveredRevision, setHoveredRevision] =
    createSignal<RevisionBox | null>(null);

  const handleRevisionMouseEnter = (revisionId: string, event: MouseEvent) => {
    const paragraphs = getParagraphs(deps.state());
    let foundRevision: EditorRevision | undefined;
    for (const p of paragraphs) {
      for (const run of p.runs) {
        if (run.revision?.id === revisionId) {
          foundRevision = run.revision;
          break;
        }
      }
      if (foundRevision) break;
    }

    if (!foundRevision) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const surfaceRect = deps.surfaceRef()?.getBoundingClientRect();

    if (!surfaceRect) return;

    setHoveredRevision({
      revisionId: foundRevision.id,
      author: foundRevision.author,
      date: foundRevision.date,
      type: foundRevision.type,
      left: rect.left - surfaceRect.left,
      top: rect.top - surfaceRect.top,
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
