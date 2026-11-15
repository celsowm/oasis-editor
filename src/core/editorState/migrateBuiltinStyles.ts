import type { EditorDocument, EditorNamedStyle } from "../model.js";
import type { BuiltinStyleId } from "../model/types/styles.js";
import { semanticBuiltinStyle } from "../model/builtinStyles.js";
import { DEFAULT_EDITOR_STYLES } from "./defaultStyles.js";

/** Stable comparison of JSON-compatible definitions, ignoring semantic metadata. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}

function legacySignature(style: EditorNamedStyle): string {
  const { builtinStyle: _builtin, customStyle: _custom, ...definition } = style;
  return JSON.stringify(canonical(definition));
}

const legacy = new Map(
  Object.values(DEFAULT_EDITOR_STYLES).flatMap((style) => {
    const key = semanticBuiltinStyle(style);
    return key ? [[style.id, { key, signature: legacySignature(style) }] as const] : [];
  }),
);

/** Recover unmodified Oasis defaults in older native JSON/IndexedDB documents.
 * Imported styles are identified at the OOXML boundary instead.
 */
export function legacyBuiltinStyle(style: EditorNamedStyle): BuiltinStyleId | undefined {
  if (style.customStyle === true || style.builtinStyle !== undefined) return undefined;
  const entry = legacy.get(style.id);
  return entry?.signature === legacySignature(style) ? entry.key : undefined;
}

export function migrateBuiltinStyles(document: EditorDocument): EditorDocument {
  if (document.sourcePackage || !document.styles) return document;
  let styles: typeof document.styles | undefined;
  for (const [id, style] of Object.entries(document.styles)) {
    const key = legacyBuiltinStyle(style);
    if (!key) continue;
    styles ??= { ...document.styles };
    styles[id] = { ...style, builtinStyle: key };
  }
  return styles ? { ...document, styles } : document;
}
