import { en } from "./locales/en.js";
import { ptBR } from "./locales/pt-BR.js";

export type Locale = "en" | "pt-BR";
export type TranslationKey = keyof typeof en;

const locales: Record<Locale, Record<string, string>> = {
  en,
  "pt-BR": ptBR,
};

export type TranslateFn = (key: TranslationKey, params?: unknown[]) => string;

/**
 * Build a translator bound to a locale accessor. The accessor is read on every
 * call, so when it reads a Solid signal the translation tracks locale changes
 * reactively. No module-level mutable locale is involved.
 */
export function createTranslator(getLocale: () => Locale): TranslateFn {
  return (key, params = []) => {
    const localeStrings = locales[getLocale()] || locales["en"];
    let template = localeStrings[key] || en[key] || key;

    params.forEach((param, index) => {
      template = template.replace(`{${index}}`, String(param));
    });

    return template;
  };
}

