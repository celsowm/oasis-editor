import type { EditorTextBoxData, EditorTextRun } from "./types/nodes.js";
import type {
  EditorFieldChar,
  EditorFieldData,
  EditorImageRunData,
  EditorFootnoteReferenceData,
  EditorEndnoteReferenceData,
} from "./types/primitives.js";
import { assertNever } from "../assertNever.js";

/**
 * Discriminant of an {@link EditorTextRun}. `EditorTextRun` is a discriminated
 * union keyed on `kind`; `getRunKind`/`visitRun` are thin helpers over it so
 * dispatch stays in one place and adding a variant is a compile error (O1).
 */
export type RunKind = EditorTextRun["kind"];

/** The union member for a given run kind. */
export type RunOfKind<K extends RunKind> = Extract<EditorTextRun, { kind: K }>;

/** Returns a run's discriminant. */
export function getRunKind(run: EditorTextRun): RunKind {
  return run.kind;
}

/** True for runs that carry an inline object replacement (image or text box). */
export function isInlineObjectRun(run: EditorTextRun): boolean {
  return run.kind === "image" || run.kind === "textBox";
}

// Narrowing accessors: read a kind-specific field as `T | undefined`, replacing
// the old optional-field reads (`run.image`, …) without forcing every call site
// into a `switch`. The union still rejects invalid combinations at construction.

export function getRunImage(run: EditorTextRun): EditorImageRunData | undefined {
  return run.kind === "image" ? run.image : undefined;
}

export function getRunTextBox(
  run: EditorTextRun,
): EditorTextBoxData | undefined {
  return run.kind === "textBox" ? run.textBox : undefined;
}

export function getRunField(run: EditorTextRun): EditorFieldData | undefined {
  return run.kind === "field" ? run.field : undefined;
}

export function getRunFieldChar(
  run: EditorTextRun,
): EditorFieldChar | undefined {
  return run.kind === "fieldChar" ? run.fieldChar : undefined;
}

export function getRunFieldInstruction(
  run: EditorTextRun,
): string | undefined {
  return run.kind === "fieldInstruction" ? run.fieldInstruction : undefined;
}

export function getRunFootnoteReference(
  run: EditorTextRun,
): EditorFootnoteReferenceData | undefined {
  return run.kind === "footnoteReference" ? run.footnoteReference : undefined;
}

export function getRunEndnoteReference(
  run: EditorTextRun,
): EditorEndnoteReferenceData | undefined {
  return run.kind === "endnoteReference" ? run.endnoteReference : undefined;
}

export function getRunSym(
  run: EditorTextRun,
): { font: string; char: string } | undefined {
  return run.kind === "sym" ? run.sym : undefined;
}

export interface RunVisitor<R> {
  text(run: RunOfKind<"text">): R;
  image(run: RunOfKind<"image">): R;
  textBox(run: RunOfKind<"textBox">): R;
  field(run: RunOfKind<"field">): R;
  fieldChar(run: RunOfKind<"fieldChar">): R;
  fieldInstruction(run: RunOfKind<"fieldInstruction">): R;
  footnoteReference(run: RunOfKind<"footnoteReference">): R;
  endnoteReference(run: RunOfKind<"endnoteReference">): R;
  sym(run: RunOfKind<"sym">): R;
}

/**
 * Exhaustive dispatch over a run's kind, narrowing the run to the matching union
 * member inside each visitor method. Adding a `RunKind` variant forces every
 * `RunVisitor` to grow the matching method (compile error otherwise).
 */
export function visitRun<R>(run: EditorTextRun, visitor: RunVisitor<R>): R {
  switch (run.kind) {
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
      return assertNever(run, "run kind");
  }
}
