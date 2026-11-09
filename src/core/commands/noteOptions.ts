/**
 * Footnote / endnote options command.
 *
 * Mirrors WordCraft's `references.noteOptions` (Word's References → Footnotes →
 * Footnote & Endnote dialog): sets the document-wide number format, start
 * number, and restart rule for footnotes or endnotes. The editor models these
 * on `document.footnotes.settings` / `document.endnotes.settings`, which
 * round-trip through OOXML (`w:footnotePr` / `w:endnotePr` in settings.xml).
 *
 * This command applies a whole-document scope: it updates the note collection's
 * settings in place, leaving the selection untouched. It is a no-op (returns
 * the same state) when nothing changes.
 */
import type {
  EditorEndnoteSettings,
  EditorFootnoteNumberFormat,
  EditorFootnoteRestart,
  EditorFootnoteSettings,
  EditorState,
} from "@/core/model.js";

/** Which note collection the command targets. */
export type NoteOptionsKind = "footnote" | "endnote";

/** The options WordCraft's `references.noteOptions` accepts. */
export interface NoteOptionsInput {
  /** The note collection to update ("footnote" or "endnote"). */
  kind: NoteOptionsKind;
  /** `w:footnotePr/w:numFmt` — the number format. */
  numberFormat?: EditorFootnoteNumberFormat | null;
  /** `w:footnotePr/w:numStart` — the first number (min 1). */
  startAt?: number | null;
  /** `w:footnotePr/w:numRestart` — when numbering restarts. */
  restart?: EditorFootnoteRestart | null;
}

/** Read the current options for a note collection. */
export function getNoteOptions(
  state: EditorState,
  kind: NoteOptionsKind,
): EditorFootnoteSettings {
  if (kind === "endnote") {
    return { ...(state.document.endnotes?.settings ?? {}) };
  }
  return { ...(state.document.footnotes?.settings ?? {}) };
}

/**
 * Update the document-wide footnote or endnote options. Each field is applied
 * only when given; `null` unsets it. Returns the same state when the settings
 * do not change.
 */
export function setNoteOptions(
  state: EditorState,
  input: NoteOptionsInput,
): EditorState {
  const kind = input.kind;
  const current =
    kind === "endnote"
      ? state.document.endnotes?.settings
      : state.document.footnotes?.settings;
  const base: EditorFootnoteSettings | EditorEndnoteSettings = {
    ...(current ?? {}),
  };

  let changed = false;
  if (input.numberFormat !== undefined) {
    const next =
      input.numberFormat === null ? undefined : input.numberFormat;
    if (base.numberFormat !== next) {
      base.numberFormat = next;
      changed = true;
    }
  }
  if (input.startAt !== undefined) {
    const next =
      input.startAt === null
        ? undefined
        : Math.max(1, Math.round(input.startAt));
    if (base.startAt !== next) {
      base.startAt = next;
      changed = true;
    }
  }
  if (input.restart !== undefined) {
    const next = input.restart === null ? undefined : input.restart;
    if (base.restart !== next) {
      base.restart = next;
      changed = true;
    }
  }

  if (!changed) {
    return state;
  }

  const settings =
    Object.keys(base).length > 0 ? { ...base } : undefined;

  if (kind === "endnote") {
    const endnotes = state.document.endnotes ?? { items: {} };
    return {
      ...state,
      document: {
        ...state.document,
        endnotes: { ...endnotes, settings },
      },
    };
  }

  const footnotes = state.document.footnotes ?? { items: {} };
  return {
    ...state,
    document: {
      ...state.document,
      footnotes: { ...footnotes, settings },
    },
  };
}
