import type { EditorParagraphNode } from "@/core/model.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";

/** Paint-mode projection: complete, single-paragraph fields display their
 * instruction instead of the cached result. Malformed/nested/cross-paragraph
 * spans are left untouched rather than showing a misleading code. */
export interface FieldCodeOverlay {
  start: number;
  end: number;
  text: string;
}

export function getFieldCodeOverlays(
  paragraph: EditorParagraphNode,
): FieldCodeOverlay[] {
  const graph = buildFieldStoryGraph([paragraph]);
  if (graph.diagnostics.length) return [];
  const overlays: FieldCodeOverlay[] = [];
  for (const span of graph.spans) {
    if (
      span.parentIndex !== null ||
      !span.separator ||
      !span.end ||
      span.code.some((part) => part.kind !== "instruction")
    )
      continue;
    const raw = span.code
      .map((part) => (part.kind === "instruction" ? part.raw : ""))
      .join("");
    if (!raw || raw.length > 4096 || /[\r\n]/.test(raw)) continue;
    overlays.push({
      start: span.begin.offset,
      end: span.end.offset,
      text: `{ ${raw} }`,
    });
  }
  return overlays;
}

/** Visible offsets that must be suppressed while codes are displayed. */
export function fieldCodeHiddenOffsets(
  overlays: readonly FieldCodeOverlay[],
): Set<number> {
  const hidden = new Set<number>();
  for (const overlay of overlays) {
    for (let offset = overlay.start; offset < overlay.end; offset++)
      hidden.add(offset);
  }
  return hidden;
}
