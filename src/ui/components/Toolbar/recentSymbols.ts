import { SYMBOL_CATEGORIES, type SymbolEntry } from "./symbolCatalog.js";

const MAX_RECENT_SYMBOLS = 12;
let recentSymbols: SymbolEntry[] = [];

export function getRecentSymbols(): readonly SymbolEntry[] {
  return recentSymbols;
}

export function rememberSymbol(character: string): void {
  const existing = SYMBOL_CATEGORIES.flatMap(
    (category): readonly SymbolEntry[] => category.entries,
  ).find((entry): boolean => entry.character === character);
  const entry =
    existing ??
    ({
      character,
      codePoint: `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
    } satisfies SymbolEntry);
  recentSymbols = [
    entry,
    ...recentSymbols.filter(
      (recent): boolean => recent.character !== character,
    ),
  ].slice(0, MAX_RECENT_SYMBOLS);
}
