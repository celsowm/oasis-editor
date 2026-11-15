import { DEFAULT_EDITOR_STYLES } from "@/core/editorState/defaultStyles.js";
import type { EditorNamedStyle } from "@/core/model.js";
import type { TranslationKey } from "@/i18n/index.js";

const labels: Partial<Record<string, TranslationKey>> = {
  normal: "toolbar.style.builtin.normal",
  heading1: "toolbar.style.builtin.heading1",
  heading2: "toolbar.style.builtin.heading2",
  heading3: "toolbar.style.builtin.heading3",
  header: "toolbar.style.builtin.header",
  footer: "toolbar.style.builtin.footer",
  Caption: "toolbar.style.builtin.caption",
  footnoteText: "toolbar.style.builtin.footnoteText",
  footnoteReference: "toolbar.style.builtin.footnoteReference",
};

/** Only identify canonical native definitions, not arbitrary imported names or IDs. */
export function builtinStyleLabel(style: EditorNamedStyle): TranslationKey | undefined {
  return DEFAULT_EDITOR_STYLES[style.id] === style ? labels[style.id] : undefined;
}
