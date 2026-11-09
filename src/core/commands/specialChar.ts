/**
 * Special-character insertion commands (WordCraft's `text.nbsp` /
 * `text.emDash` / `text.ellipsis` / `text.copyright` / `text.registered` /
 * `text.trademark` / `text.nbHyphen` / `text.optionalHyphen`, Word's
 * Insert > Symbols gallery). Each inserts a single Unicode character at the
 * selection via the text-editing engine, exactly like WordCraft's `ins_char`
 * does (`type_text` + selection resolve).
 */
import type { EditorState } from "@/core/model.js";
import { insertTextAtSelection } from "./textEditing.js";

/** The Unicode characters the special-character commands insert. */
export const SPECIAL_CHARACTERS = {
  nbsp: "\u{00A0}", // Nonbreaking space (text.nbsp)
  nbHyphen: "\u{2011}", // Nonbreaking hyphen (text.nbHyphen)
  optionalHyphen: "\u{00AD}", // Optional hyphen / soft hyphen (text.optionalHyphen)
  emDash: "\u{2014}", // Em dash (text.emDash)
  ellipsis: "\u{2026}", // Ellipsis (text.ellipsis)
  copyright: "\u{00A9}", // Copyright sign (text.copyright)
  registered: "\u{00AE}", // Registered sign (text.registered)
  trademark: "\u{2122}", // Trademark sign (text.trademark)
} as const;

export type SpecialCharacterKind = keyof typeof SPECIAL_CHARACTERS;

/**
 * Insert a single special character at the selection. A no-op (same state)
 * when the character is empty.
 */
export function insertSpecialCharacter(
  state: EditorState,
  kind: SpecialCharacterKind,
): EditorState {
  return insertTextAtSelection(state, SPECIAL_CHARACTERS[kind]);
}
