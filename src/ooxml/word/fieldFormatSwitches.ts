/**
 * General Word field formatting switches (`\*`, `\#`, `\@`) shared by the
 * field families. This is a strict, bounded grammar: a recognized switch with
 * an unsupported argument or a duplicate fails closed. Unknown switches are
 * returned untouched so a command-specific parser can still qualify or
 * preserve them. Nothing here evaluates external content.
 */
import type { FieldInstructionToken } from "./fieldInstruction.js";
import { supportsTemporalPicture } from "@/core/format/temporalFieldFormat.js";
import { supportsNumericPicture } from "@/core/format/fieldResultFormat.js";

export type TextFormatSwitch =
  "MERGEFORMAT" | "CHARFORMAT" | "Caps" | "FirstCap" | "Upper" | "Lower";
export type NumberFormatSwitch =
  | "alphabetic"
  | "ALPHABETIC"
  | "Arabic"
  | "ArabicDash"
  | "CardText"
  | "DollarText"
  | "Hex"
  | "OrdText"
  | "Ordinal"
  | "roman"
  | "ROMAN";
export type { FormatSwitchName } from "@/core/format/fieldResultFormat.js";
import type { FormatSwitchName } from "@/core/format/fieldResultFormat.js";

export interface FieldFormatSwitchProfile {
  /** `\*` MERGEFORMAT, CHARFORMAT and capitalization words. */
  text?: boolean;
  /** `\*` number words (ArabicDash only with `arabicDash`). */
  number?: boolean;
  arabicDash?: boolean;
  /** `\#` numeric picture. */
  numericPicture?: boolean;
  /** `\@` date/time picture. */
  datePicture?: boolean;
}

/** Per-command capabilities. A switch documented for one family is never
 * silently available in another (e.g. `ArabicDash` is PAGE only). */
export const FIELD_FORMAT_SWITCH_PROFILES: Readonly<
  Record<string, FieldFormatSwitchProfile>
> = {
  PAGE: { text: true, number: true, arabicDash: true },
  NUMPAGES: { text: true, number: true },
  SECTION: { text: true, number: true },
  SECTIONPAGES: { text: true, number: true },
  DATE: { text: true, datePicture: true },
  TIME: { text: true, datePicture: true },
  CREATEDATE: { text: true, datePicture: true },
  SAVEDATE: { text: true, datePicture: true },
  PRINTDATE: { text: true, datePicture: true },
  REF: { text: true, numericPicture: true },
  PAGEREF: { text: true },
  SEQ: { text: true, number: true },
  IF: { text: true },
  MERGEFIELD: { text: true },
  COMPARE: { text: true },
};

export interface FieldFormatSwitches {
  mergeFormat?: true;
  charFormat?: true;
  capitalization?: FormatSwitchName;
  numericPicture?: string;
  datePicture?: string;
}

export interface ParsedFieldFormatSwitches {
  switches: FieldFormatSwitches;
  /** Tokens that are not general formatting switches, in original order. */
  remaining: readonly FieldInstructionToken[];
}

const maxPictureLength = 256;
const textNames: ReadonlySet<string> = new Set([
  "MERGEFORMAT",
  "CHARFORMAT",
  "Caps",
  "FirstCap",
  "Upper",
  "Lower",
]);
const numberNames: ReadonlySet<string> = new Set([
  "alphabetic",
  "ALPHABETIC",
  "Arabic",
  "CardText",
  "DollarText",
  "Hex",
  "OrdText",
  "Ordinal",
  "roman",
  "ROMAN",
]);

function pictureArgument(
  token: FieldInstructionToken | undefined,
  validator: (value: string) => boolean,
): string | undefined {
  if (!token || (token.kind !== "quoted" && token.kind !== "word"))
    return undefined;
  const value = token.value;
  if (
    !value ||
    value.length > maxPictureLength ||
    [...value].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)
  )
    return undefined;
  return validator(value) ? value : undefined;
}

/** Extract general formatting switches from instruction tokens. The command
 * token (if present) is kept in `remaining` for the caller's own grammar. */
export function parseFormatSwitchesFromTokens(
  tokens: readonly FieldInstructionToken[],
  profile: FieldFormatSwitchProfile,
): ParsedFieldFormatSwitches | undefined {
  const switches: FieldFormatSwitches = {};
  const remaining: FieldInstructionToken[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind !== "switch") {
      remaining.push(token);
      continue;
    }
    const value = token.value;
    if (value === "*") {
      if (!profile.text && !profile.number) {
        remaining.push(token);
        continue;
      }
      const arg = tokens[++i];
      if (!arg || arg.kind !== "word") return undefined;
      const name = arg.value;
      if (textNames.has(name)) {
        if (!profile.text || seen.has("text")) return undefined;
        seen.add("text");
        if (name === "MERGEFORMAT") switches.mergeFormat = true;
        else if (name === "CHARFORMAT") switches.charFormat = true;
        else switches.capitalization = name as TextFormatSwitch;
      } else if (numberNames.has(name)) {
        if (!profile.number || seen.has("number")) return undefined;
        seen.add("number");
        switches.capitalization = name as NumberFormatSwitch;
      } else if (name === "ArabicDash") {
        if (!profile.arabicDash || seen.has("number")) return undefined;
        seen.add("number");
        switches.capitalization = "ArabicDash";
      } else return undefined;
    } else if (value === "#") {
      if (!profile.numericPicture) {
        remaining.push(token);
        continue;
      }
      if (seen.has("numeric")) return undefined;
      const picture = pictureArgument(tokens[++i], supportsNumericPicture);
      if (picture === undefined) return undefined;
      seen.add("numeric");
      switches.numericPicture = picture;
    } else if (value === "@") {
      if (!profile.datePicture) {
        remaining.push(token);
        continue;
      }
      if (seen.has("date")) return undefined;
      const picture = pictureArgument(tokens[++i], supportsTemporalPicture);
      if (picture === undefined) return undefined;
      seen.add("date");
      switches.datePicture = picture;
    } else {
      // Command-specific switch: retained for the family's own parser.
      remaining.push(token);
    }
  }
  return { switches, remaining };
}

/** Convenience for a whole instruction. A missing/unknown command uses an
 * empty profile, so recognized switches are left untouched rather than
 * coerced into a family that does not own them. */
export function parseFieldFormatSwitches(
  tokens: readonly FieldInstructionToken[],
  command: string | null,
): ParsedFieldFormatSwitches | undefined {
  const profile = command
    ? FIELD_FORMAT_SWITCH_PROFILES[command.toUpperCase()]
    : undefined;
  if (!profile) return { switches: {}, remaining: tokens };
  return parseFormatSwitchesFromTokens(tokens, profile);
}

/** Canonical, deterministic serialization of qualified switches. */
export function serializeFieldFormatSwitches(
  switches: FieldFormatSwitches,
): string {
  let out = "";
  if (switches.mergeFormat) out += " \\* MERGEFORMAT";
  if (switches.charFormat) out += " \\* CHARFORMAT";
  if (switches.capitalization) out += ` \\* ${switches.capitalization}`;
  if (switches.numericPicture !== undefined)
    out += ` \\# "${switches.numericPicture}"`;
  if (switches.datePicture !== undefined)
    out += ` \\@ "${switches.datePicture}"`;
  return out;
}
