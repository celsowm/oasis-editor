import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import { getSelectedObjectRun } from "@/core/commands/selectedObjectRun.js";
import type { EditorDocument, EditorSelection } from "@/core/model.js";
import type { EssentialsFeatureGate } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

/**
 * Commands that do not mutate document content must remain usable in read-only
 * mode, including access to copying, searching, exports, and view options.
 */
const READ_ONLY_SAFE_COMMANDS: ReadonlySet<OasisBuiltinCommand> = new Set([
  "copy",
  "selectAll",
  "selectWord",
  "selectSentence",
  "selectParagraph",
  "selectCollapse",
  "nextRevision",
  "previousRevision",
  "nextComment",
  "previousComment",
  "toggleCommentsPanel",
  "find",
  "replace",
  "print",
  "exportDocx",
  "exportPdf",
  "toggleShowMargins",
  "toggleShowParagraphMarks",
  "togglePreciseFonts",
  "toggleRevisionMarkup",
  "setReviewDisplayMode",
  // Context detectors drive contextual tabs and never mutate the document.
  "imageContext",
  "tableContext",
  // Table gridlines are a view option (not a document change).
  "toggleTableGridlines",
  // Data carrier for the styles gallery; executing it is a no-op.
  "documentStyles",
]);

/**
 * Character formatting applies `styles.*` to every run touched by the
 * selection. An inline image or text box is stored as an object-replacement
 * run, so while it is selected those commands would write invisible run styles
 * onto the object, dirty the document and push a pointless history entry. Word disables
 * the Font group for object selections; paragraph-scoped commands (alignment,
 * lists, paragraph style) and the Picture Format tab stay available.
 */
const RUN_FORMATTING_COMMANDS: ReadonlySet<OasisBuiltinCommand> = new Set([
  "bold",
  "italic",
  "underline",
  "doubleUnderline",
  "wordUnderline",
  "strike",
  "doubleStrike",
  "smallCaps",
  "allCaps",
  "hidden",
  "noProof",
  "webHidden",
  "specVanish",
  "contextualAlternates",
  "characterBorder",
  "shadow",
  "emboss",
  "engrave",
  "outline",
  "superscript",
  "subscript",
  "setFontFamily",
  "setFontSize",
  "increaseFontSize",
  "decreaseFontSize",
  "growFont1",
  "shrinkFont1",
  "changeTextCase",
  "clearFormatting",
  "setColor",
  "setHighlight",
  "setTextShading",
  "setCharacterStyleId",
  "setUnderlineStyle",
  "applyUnderlineStyle",
  "setUnderlineColor",
  "setCharacterScale",
  "setCharacterSpacing",
  "setRunSnapToGrid",
  "setFitText",
  "setBaselineShift",
  "setEmphasisMark",
  "setTextEffect",
  "setKerning",
  "setLigatures",
  "setNumberSpacing",
  "setNumberForm",
  "setStylisticSet",
]);

// The live editor state is a proxy whose identity never changes, so the cache
// is keyed by the immutable document/selection snapshots it reads.
const objectSelectionCache = new WeakMap<
  EditorDocument,
  WeakMap<EditorSelection, boolean>
>();

/** True when the selection is exactly one inline image or text-box run. */
function isInlineObjectSelected(
  options: CreateEditorEssentialsPluginOptions,
): boolean {
  const state = options.state?.();
  if (!state) return false;
  const document = state.document;
  const selection = state.selection;
  if (!document || !selection) return false;
  let bySelection = objectSelectionCache.get(document);
  if (!bySelection) {
    bySelection = new WeakMap<EditorSelection, boolean>();
    objectSelectionCache.set(document, bySelection);
  }
  const cached = bySelection.get(selection);
  if (cached !== undefined) return cached;
  const selected =
    getSelectedObjectRun(
      state,
      (run): boolean => run.kind === "image" || run.kind === "textBox",
    ) !== null;
  bySelection.set(selection, selected);
  return selected;
}

export function buildEssentialsGate(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsFeatureGate {
  return {
    isCommandEnabled: (commandName: OasisBuiltinCommand): boolean => {
      if (commandName === "openSymbolDialog") return true;
      if (commandName === "openEquationDialog") return true;
      if (
        RUN_FORMATTING_COMMANDS.has(commandName) &&
        isInlineObjectSelected(options)
      ) {
        return false;
      }
      return (
        (READ_ONLY_SAFE_COMMANDS.has(commandName) || !options.isReadOnly()) &&
        (commandName !== "insertFootnote" ||
          options.commandsController.canInsertFootnoteCommand())
      );
    },
  };
}
