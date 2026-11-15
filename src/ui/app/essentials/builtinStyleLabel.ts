import type { EditorNamedStyle } from "@/core/model.js";
import type { BuiltinStyleId } from "@/core/model/types/styles.js";
import { semanticBuiltinStyle } from "@/core/model/builtinStyles.js";
import { legacyBuiltinStyle } from "@/core/editorState/migrateBuiltinStyles.js";
import type { TranslateFn, TranslationKey } from "@/i18n/index.js";

const labels: Record<BuiltinStyleId, TranslationKey> = {
  normal: "toolbar.style.builtin.normal",
  heading1: "toolbar.style.builtin.heading1",
  heading2: "toolbar.style.builtin.heading2",
  heading3: "toolbar.style.builtin.heading3",
  heading4: "toolbar.style.builtin.heading4",
  heading5: "toolbar.style.builtin.heading5",
  heading6: "toolbar.style.builtin.heading6",
  heading7: "toolbar.style.builtin.heading7",
  heading8: "toolbar.style.builtin.heading8",
  heading9: "toolbar.style.builtin.heading9",
  title: "toolbar.style.builtin.title",
  subtitle: "toolbar.style.builtin.subtitle",
  caption: "toolbar.style.builtin.caption",
  quote: "toolbar.style.builtin.quote",
  emphasis: "toolbar.style.builtin.emphasis",
  strong: "toolbar.style.builtin.strong",
  header: "toolbar.style.builtin.header",
  footer: "toolbar.style.builtin.footer",
  footnoteText: "toolbar.style.builtin.footnoteText",
  footnoteReference: "toolbar.style.builtin.footnoteReference",
};

/** Resolve display metadata, never rewrite the document's stored name. */
export function builtinStyleLabel(style: EditorNamedStyle, allowLegacy = true): TranslationKey | undefined {
  const key = semanticBuiltinStyle(style) ?? (allowLegacy ? legacyBuiltinStyle(style) : undefined);
  return key ? labels[key] : undefined;
}

export function resolveStyleDisplayName(style: EditorNamedStyle, t: TranslateFn, allowLegacy = true): string {
  const key = builtinStyleLabel(style, allowLegacy);
  return key ? t(key) : style.name;
}
