import type { TranslationKey } from "@/i18n/index.js";

export interface SymbolEntry {
  character: string;
  codePoint: string;
}

export interface SymbolCategory {
  id: string;
  labelKey: TranslationKey;
  entries: readonly SymbolEntry[];
}

const entries = (characters: string): readonly SymbolEntry[] =>
  Array.from(characters).map(
    (character): SymbolEntry => ({
      character,
      codePoint: `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
    }),
  );

export const SYMBOL_CATEGORIES: readonly SymbolCategory[] = [
  {
    id: "common",
    labelKey: "symbols.category.common",
    entries: entries("©®™§¶†‡•…—–°µ¿¡"),
  },
  {
    id: "math",
    labelKey: "symbols.category.math",
    entries: entries("±×÷≠≤≥≈∞√∑∏∂∆∫πΩ"),
  },
  {
    id: "arrows",
    labelKey: "symbols.category.arrows",
    entries: entries("←→↑↓↔↕⇒⇐⇔↗↘↙↖"),
  },
  {
    id: "currency",
    labelKey: "symbols.category.currency",
    entries: entries("¢€£¥₽₹₿"),
  },
  {
    id: "greek",
    labelKey: "symbols.category.greek",
    entries: entries("αβγδεθλμσφωΑΒΓΔΘΛΜΣΦΩ"),
  },
  {
    id: "numbers",
    labelKey: "symbols.category.numbers",
    entries: entries("①②③④⑤⑥⑦⑧⑨⑩½⅓¼¾²³ⁿ№"),
  },
] as const;

export const COMMON_SYMBOLS = SYMBOL_CATEGORIES.slice(0, 3).flatMap(
  (category): readonly SymbolEntry[] => category.entries,
);

export const NUMBER_SYMBOLS = SYMBOL_CATEGORIES.find(
  (category): boolean => category.id === "numbers",
)!.entries;

export const EQUATION_TEMPLATES: readonly SymbolEntry[] = [
  { character: "a² + b² = c²", codePoint: "Pythagorean theorem" },
  { character: "E = mc²", codePoint: "Mass–energy equivalence" },
  { character: "A = πr²", codePoint: "Circle area" },
  {
    character: "x = (−b ± √(b² − 4ac)) / 2a",
    codePoint: "Quadratic formula",
  },
] as const;

export function getSymbolCategory(id: string): SymbolCategory | undefined {
  return SYMBOL_CATEGORIES.find((category): boolean => category.id === id);
}
