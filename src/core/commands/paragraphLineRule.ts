/**
 * Paragraph line-rule command.
 *
 * Word's Line spacing rule (in the Paragraph › Indents and Spacing dialog) is
 * the OOXML `w:spacing/@w:lineRule` attribute: `auto` (the default, a
 * multiplier), `exact` (a fixed height that clips oversized glyphs) or
 * `atLeast` (a minimum height). This command sets the rule on every selected
 * paragraph; the numeric `lineHeight` is interpreted according to the rule on
 * import/export.
 *
 * The rule defaults to `auto` and is omitted on export when absent. Passing a
 * rule removes/stores the key and leaves `lineHeight` untouched so the two
 * stay decoupled. A no-op (returns the same state) when nothing can change,
 * and the selection is preserved by paragraph offset.
 */
import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { normalizeSelection } from "@/core/selection.js";

/** Valid `w:lineRule` values. */
export type ParagraphLineRule = "auto" | "exact" | "atLeast";

const VALID_RULES: ReadonlySet<string> = new Set([
  "auto",
  "exact",
  "atLeast",
]);

/**
 * Set the line rule (`lineRule`) of every selected paragraph. Pass `"auto"`,
 * `"exact"` or `"atLeast"` to store it, or `null` to clear the key (defaults
 * to `auto` and is omitted on export). Returns the same state when nothing
 * changes.
 */
export function setParagraphLineRule(
  state: EditorState,
  rule: ParagraphLineRule | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  let changed = false;
  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return paragraph;
      }
      const current = paragraph.style?.lineRule;
      const next = (() => {
        if (rule === null || rule === "auto") return undefined;
        if (!VALID_RULES.has(rule)) return current;
        return rule;
      })();
      if (current === next) {
        return paragraph;
      }
      changed = true;
      const style =
        next === undefined
          ? (() => {
              const { lineRule: _drop, ...rest } = paragraph.style ?? {};
              void _drop;
              return Object.keys(rest).length > 0 ? rest : undefined;
            })()
          : { ...(paragraph.style ?? {}), lineRule: next };
      return {
        ...cloneParagraph(paragraph),
        style,
      };
    },
  );

  if (!changed) {
    return state;
  }

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}
