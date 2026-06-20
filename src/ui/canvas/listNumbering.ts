import type { EditorDocument, EditorParagraphNode } from "@/core/model.js";
import { buildListLabels, resolveListLabel } from "@/core/model.js";

const listLabelsCache = new WeakMap<EditorDocument, Map<string, string>>();

export function resolveListPrefix(
  paragraph: EditorParagraphNode,
  document: EditorDocument,
): string {
  let labels = listLabelsCache.get(document);
  if (!labels) {
    labels = buildListLabels(document);
    listLabelsCache.set(document, labels);
  }
  return resolveListLabel(paragraph, labels);
}

export { buildListLabels };
