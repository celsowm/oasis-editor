import type { EditorParagraphNode } from "@/core/model/types/nodes.js";
import type { EditorFieldChar } from "@/core/model/types/primitives.js";

/** Coordinates in one ordered story snapshot. Run index distinguishes
 * invisible markers sharing the same UTF-16 text offset. */
export interface FieldStoryPoint {
  paragraphId: string;
  paragraphIndex: number;
  runId: string;
  runIndex: number;
  offset: number;
}

export type FieldStoryPart =
  | { kind: "instruction"; point: FieldStoryPoint; raw: string }
  | { kind: "nested"; fieldIndex: number }
  | { kind: "run"; point: FieldStoryPoint };

export interface FieldStorySpan {
  /** Index into the graph, not a persistent document identifier. */
  index: number;
  parentIndex: number | null;
  begin: FieldStoryPoint;
  beginMarker: EditorFieldChar;
  separator?: FieldStoryPoint;
  end?: FieldStoryPoint;
  code: FieldStoryPart[];
  result: FieldStoryPart[];
}

export interface FieldStoryDiagnostic {
  kind: "orphan-end" | "orphan-separator" | "orphan-instruction" |
    "duplicate-separator" | "instruction-after-separator" | "unclosed-field";
  point: FieldStoryPoint;
}

export interface FieldStoryGraph {
  spans: FieldStorySpan[];
  diagnostics: FieldStoryDiagnostic[];
}

/**
 * Read-only, iterative reconstruction of complex fields in ONE story.
 * Caller supplies paragraphs in XML order; never concatenate different
 * headers, notes or text boxes. No evaluation, repair or mutation occurs.
 * Nested operands are represented in order, not flattened into outer text.
 * Time and storage are linear in the number of runs, even for deep nesting.
 */
export function buildFieldStoryGraph(paragraphs: readonly EditorParagraphNode[]): FieldStoryGraph {
  const spans: FieldStorySpan[] = [];
  const diagnostics: FieldStoryDiagnostic[] = [];
  const stack: FieldStorySpan[] = [];
  const append = (span: FieldStorySpan, part: FieldStoryPart): void => {
    (span.separator ? span.result : span.code).push(part);
  };
  const report = (kind: FieldStoryDiagnostic["kind"], point: FieldStoryPoint): void => {
    diagnostics.push({ kind, point });
  };
  for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
    let offset = 0;
    for (const [runIndex, run] of paragraph.runs.entries()) {
      const point: FieldStoryPoint = {
        paragraphId: paragraph.id, paragraphIndex, runId: run.id, runIndex, offset,
      };
      offset += run.text.length;
      const current = stack.at(-1);
      if (run.kind === "fieldChar") {
        switch (run.fieldChar.kind) {
          case "begin": {
            const span: FieldStorySpan = {
              index: spans.length, parentIndex: current?.index ?? null,
              begin: point, beginMarker: { ...run.fieldChar }, code: [], result: [],
            };
            if (current) append(current, { kind: "nested", fieldIndex: span.index });
            spans.push(span);
            stack.push(span);
            break;
          }
          case "separate":
            if (!current) report("orphan-separator", point);
            else if (current.separator) report("duplicate-separator", point);
            else current.separator = point;
            break;
          case "end":
            if (!current) report("orphan-end", point);
            else {
              current.end = point;
              stack.pop();
            }
            break;
        }
      } else if (run.kind === "fieldInstruction") {
        if (!current) report("orphan-instruction", point);
        else {
          if (current.separator) report("instruction-after-separator", point);
          append(current, { kind: "instruction", point, raw: run.fieldInstruction });
        }
      } else if (current) {
        append(current, { kind: "run", point });
      }
    }
  }
  for (const span of stack) report("unclosed-field", span.begin);
  return { spans, diagnostics };
}
