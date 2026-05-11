import type { EditorState, EditorParagraphNode } from "../core/model.js";
import { getParagraphs } from "../core/model.js";
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

  // Fast structural check: if any block's id at any position differs, mark
  // structureChanged. Don't try to be clever about partial reorderings.
  const prevBlockIds = prev.document.blocks.map((b) => b.id).join("|");
  const nextBlockIds = next.document.blocks.map((b) => b.id).join("|");
  let structureChanged = prevBlockIds !== nextBlockIds;

  if (!structureChanged && prev.document.sections && next.document.sections) {
    const prevSecs = prev.document.sections;
    const nextSecs = next.document.sections;
    if (prevSecs.length !== nextSecs.length) {
      structureChanged = true;
    } else {
      for (let i = 0; i < prevSecs.length; i += 1) {
        const a = prevSecs[i]!;
        const b = nextSecs[i]!;
        const aIds = [
          ...(a.header ?? []).map((x) => x.id),
          ...a.blocks.map((x) => x.id),
          ...(a.footer ?? []).map((x) => x.id),
        ].join("|");
        const bIds = [
          ...(b.header ?? []).map((x) => x.id),
          ...b.blocks.map((x) => x.id),
          ...(b.footer ?? []).map((x) => x.id),
        ].join("|");
        if (aIds !== bIds) {
          structureChanged = true;
          break;
        }
      }
    }
  } else if (Boolean(prev.document.sections) !== Boolean(next.document.sections)) {
    structureChanged = true;
  }

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
      if (Boolean(a.image) !== Boolean(b.image) ||
          (a.image?.width ?? -1) !== (b.image?.width ?? -1) ||
          (a.image?.height ?? -1) !== (b.image?.height ?? -1)) {
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
