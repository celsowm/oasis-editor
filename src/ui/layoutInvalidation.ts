import type { EditorState, EditorParagraphNode } from "../core/model.js";
import { getDocumentSectionsCanonical, getParagraphs } from "../core/model.js";
import type { LayoutInvalidation } from "../app/controllers/useEditorLayout.js";

/**
 * Cheap diff between two editor states. Produces an explicit
 * `LayoutInvalidation` hint for the layout controller, so the layout effect
 * never has to walk every paragraph in the document on every keystroke.
 */
export function computeLayoutInvalidationFromTransaction(
  prev: EditorState,
  next: EditorState,
): LayoutInvalidation {
  if (prev === next || prev.document === next.document) {
    return {};
  }

  // Fast structural check in canonical order: section-by-section including
  // header/body/footer block ids.
  const serializeSections = (state: EditorState): string =>
    getDocumentSectionsCanonical(state.document)
      .map((section) =>
        [
          ...(section.header ?? []).map((block) => block.id),
          ...section.blocks.map((block) => block.id),
          ...(section.footer ?? []).map((block) => block.id),
        ].join("|"),
      )
      .join("||");

  const structureChanged = serializeSections(prev) !== serializeSections(next);

  if (structureChanged) {
    return { dirtyAll: true, structureChanged: true };
  }

  // Same block shape: compare paragraphs by id, find ones whose run text
  // or shape changed. This is the typing/backspace fast path.
  const prevParas = getParagraphs(prev);
  const nextParas = getParagraphs(next);
  const prevById = new Map<string, EditorParagraphNode>();
  for (const p of prevParas) prevById.set(p.id, p);

  const dirtyParagraphIds: string[] = [];
  for (const np of nextParas) {
    const pp = prevById.get(np.id);
    if (!pp) {
      dirtyParagraphIds.push(np.id);
      continue;
    }
    if (pp === np) {
      // Reference equality: nothing changed.
      continue;
    }
    if (pp.runs.length !== np.runs.length) {
      dirtyParagraphIds.push(np.id);
      continue;
    }
    let changed = false;
    for (let i = 0; i < pp.runs.length; i += 1) {
      const a = pp.runs[i]!;
      const b = np.runs[i]!;
      if (a === b) continue;
      if (a.id !== b.id || a.text !== b.text) {
        changed = true;
        break;
      }
      if (
        Boolean(a.image) !== Boolean(b.image) ||
        (a.image?.width ?? -1) !== (b.image?.width ?? -1) ||
        (a.image?.height ?? -1) !== (b.image?.height ?? -1)
      ) {
        changed = true;
        break;
      }
    }
    if (changed) {
      dirtyParagraphIds.push(np.id);
    }
  }

  return { dirtyParagraphIds };
}
