import type { EditorTextRun } from "./types/nodes.js";
import { assertNever } from "../assertNever.js";

/**
 * Discriminated classification of an {@link EditorTextRun}.
 *
 * `EditorTextRun` is a flat bag of optional fields (`image`, `textBox`,
 * `field`, …) with no discriminant, so adding a new inline object means every
 * dispatch site has to remember to handle it (O1). `getRunKind` derives the
 * effective kind once, in the canonical precedence the DOCX serializer uses
 * (`export/docx/text/runXml.ts`), and `visitRun` turns that into an exhaustive
 * dispatch — a missing branch is a compile error.
 *
 * This is purely derived from the existing fields; it does not change the wire
 * shape. It is the safe first step before migrating `EditorTextRun` itself to a
 * discriminated union.
 */
export type RunKind =
  | "footnoteReference"
  | "endnoteReference"
  | "fieldChar"
  | "fieldInstruction"
  | "field"
  | "textBox"
  | "image"
  | "sym"
  | "text";

/**
 * Classifies a run by its highest-precedence object field. The order mirrors
 * `serializeRun` so callers that switch on the kind agree with export.
 */
export function getRunKind(run: EditorTextRun): RunKind {
  if (run.footnoteReference) return "footnoteReference";
  if (run.endnoteReference) return "endnoteReference";
  if (run.fieldChar) return "fieldChar";
  if (run.fieldInstruction !== undefined) return "fieldInstruction";
  if (run.field) return "field";
  if (run.textBox) return "textBox";
  if (run.image) return "image";
  if (run.sym) return "sym";
  return "text";
}

/** True for runs that carry an inline object replacement (image or text box). */
export function isInlineObjectRun(run: EditorTextRun): boolean {
  const kind = getRunKind(run);
  return kind === "image" || kind === "textBox";
}

export interface RunVisitor<R> {
  text(run: EditorTextRun): R;
  image(run: EditorTextRun): R;
  textBox(run: EditorTextRun): R;
  field(run: EditorTextRun): R;
  fieldChar(run: EditorTextRun): R;
  fieldInstruction(run: EditorTextRun): R;
  footnoteReference(run: EditorTextRun): R;
  endnoteReference(run: EditorTextRun): R;
  sym(run: EditorTextRun): R;
}

/**
 * Exhaustive dispatch over a run's kind. Adding a `RunKind` variant forces every
 * `RunVisitor` to grow the matching method (compile error otherwise).
 */
export function visitRun<R>(run: EditorTextRun, visitor: RunVisitor<R>): R {
  const kind = getRunKind(run);
  switch (kind) {
    case "footnoteReference":
      return visitor.footnoteReference(run);
    case "endnoteReference":
      return visitor.endnoteReference(run);
    case "fieldChar":
      return visitor.fieldChar(run);
    case "fieldInstruction":
      return visitor.fieldInstruction(run);
    case "field":
      return visitor.field(run);
    case "textBox":
      return visitor.textBox(run);
    case "image":
      return visitor.image(run);
    case "sym":
      return visitor.sym(run);
    case "text":
      return visitor.text(run);
    default:
      return assertNever(kind, "run kind");
  }
}
