import type { BuiltinStyleId, EditorNamedStyle } from "./types/styles.js";

interface BuiltinStyleDefinition {
  type: "paragraph" | "character";
  names: readonly string[];
}

/** Known OOXML identities. Localized aliases aid import only; never rename styles. */
export const BUILTIN_STYLES: Record<BuiltinStyleId, BuiltinStyleDefinition> = {
  normal: { type: "paragraph", names: ["Normal"] },
  heading1: { type: "paragraph", names: ["Heading 1", "Título 1"] },
  heading2: { type: "paragraph", names: ["Heading 2", "Título 2"] },
  heading3: { type: "paragraph", names: ["Heading 3", "Título 3"] },
  heading4: { type: "paragraph", names: ["Heading 4", "Título 4"] },
  heading5: { type: "paragraph", names: ["Heading 5", "Título 5"] },
  heading6: { type: "paragraph", names: ["Heading 6", "Título 6"] },
  heading7: { type: "paragraph", names: ["Heading 7", "Título 7"] },
  heading8: { type: "paragraph", names: ["Heading 8", "Título 8"] },
  heading9: { type: "paragraph", names: ["Heading 9", "Título 9"] },
  title: { type: "paragraph", names: ["Title", "Título"] },
  subtitle: { type: "paragraph", names: ["Subtitle", "Subtítulo"] },
  caption: { type: "paragraph", names: ["Caption", "Legenda"] },
  quote: { type: "paragraph", names: ["Quote", "Citação"] },
  emphasis: { type: "character", names: ["Emphasis", "Ênfase"] },
  strong: { type: "character", names: ["Strong", "Forte"] },
  header: { type: "paragraph", names: ["Header", "Cabeçalho"] },
  footer: { type: "paragraph", names: ["Footer", "Rodapé"] },
  footnoteText: { type: "paragraph", names: ["Footnote Text", "Texto de nota de rodapé"] },
  footnoteReference: { type: "character", names: ["Footnote Reference", "Referência de nota de rodapé"] },
};

const normalize = (value: string): string =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[\s_-]+/g, "");

export function isBuiltinStyleId(value: unknown): value is BuiltinStyleId {
  return typeof value === "string" && Object.hasOwn(BUILTIN_STYLES, value);
}

/** An explicit custom style always wins. Require both ID and name to agree. */
export function identifyImportedBuiltinStyle(
  style: Pick<EditorNamedStyle, "id" | "name" | "type" | "customStyle">,
): BuiltinStyleId | undefined {
  if (style.customStyle === true || style.type === "table") return undefined;
  const id = normalize(style.id);
  const name = normalize(style.name);
  for (const key of Object.keys(BUILTIN_STYLES) as BuiltinStyleId[]) {
    const entry = BUILTIN_STYLES[key];
    if (entry.type !== style.type) continue;
    const names = entry.names.map(normalize);
    if ((id === normalize(key) || names.includes(id)) && names.includes(name)) return key;
  }
  return undefined;
}

export function semanticBuiltinStyle(style: EditorNamedStyle): BuiltinStyleId | undefined {
  return style.customStyle !== true &&
    isBuiltinStyleId(style.builtinStyle) &&
    BUILTIN_STYLES[style.builtinStyle].type === style.type
    ? style.builtinStyle
    : undefined;
}
