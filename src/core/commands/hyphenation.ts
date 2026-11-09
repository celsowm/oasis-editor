/**
 * Document hyphenation settings authoring commands.
 *
 * WordCraft's `layout.hyphenation` toggles automatic hyphenation and its
 * companion options, which Word stores on the document settings part
 * (`w:autoHyphenation`, `w:hyphenationZone`, `w:consecutiveHyphenLimit`,
 * `w:doNotHyphenateCaps`). The editor models these on `document.settings` and
 * threads them to the composer so words can break at line ends with a rendered
 * trailing hyphen. This module exposes them as authoring commands so the Layout
 * ribbon can drive automatic hyphenation.
 */
import type { EditorState } from "@/core/model.js";

/** The hyphenation options WordCraft's `layout.hyphenation` accepts. */
export interface HyphenationSettingsInput {
  /** `w:autoHyphenation` — master switch (toggles when omitted by the caller). */
  value?: boolean;
  /** `w:hyphenationZone` — min trailing gap (points) before hyphenating. */
  zone?: number;
  /** `w:doNotHyphenateCaps` — hyphenate words in capitals. */
  caps?: boolean;
  /** `w:consecutiveHyphenLimit` — max consecutive hyphenated lines (0 = none). */
  limit?: number;
}

/** Read the document's automatic hyphenation master switch. */
export function isAutoHyphenationEnabled(state: EditorState): boolean {
  return state.document.settings?.autoHyphenation === true;
}

/** Read the document's hyphenation options (`undefined` fields are unset). */
export function getHyphenationSettings(state: EditorState): {
  value: boolean;
  zone?: number;
  caps?: boolean;
  limit?: number;
} {
  const settings = state.document.settings;
  return {
    value: settings?.autoHyphenation === true,
    zone: settings?.hyphenationZone,
    caps: settings?.doNotHyphenateCaps,
    limit: settings?.consecutiveHyphenLimit,
  };
}

/**
 * Update the document's hyphenation settings. `value` (autoHyphenation) toggles
 * when omitted; `zone`, `caps` and `limit` are applied only when given, leaving
 * the rest of the document settings untouched.
 */
export function setHyphenationSettings(
  state: EditorState,
  input: HyphenationSettingsInput,
): EditorState {
  const current = state.document.settings;
  const nextSettings = {
    ...(current ?? {}),
    ...(input.value !== undefined
      ? { autoHyphenation: input.value }
      : current?.autoHyphenation !== undefined
        ? { autoHyphenation: current.autoHyphenation }
        : {}),
    ...(input.zone !== undefined
      ? { hyphenationZone: input.zone }
      : current?.hyphenationZone !== undefined
        ? { hyphenationZone: current.hyphenationZone }
        : {}),
    ...(input.caps !== undefined
      ? { doNotHyphenateCaps: input.caps }
      : current?.doNotHyphenateCaps !== undefined
        ? { doNotHyphenateCaps: current.doNotHyphenateCaps }
        : {}),
    ...(input.limit !== undefined
      ? { consecutiveHyphenLimit: input.limit }
      : current?.consecutiveHyphenLimit !== undefined
        ? { consecutiveHyphenLimit: current.consecutiveHyphenLimit }
        : {}),
  };
  return {
    ...state,
    document: { ...state.document, settings: nextSettings },
  };
}
