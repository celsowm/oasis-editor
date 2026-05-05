import { en } from "./locales/en.js";
import { ptBR } from "./locales/pt-BR.js";

export type Locale = "en" | "pt-BR";
export type TranslationKey = keyof typeof en;

const locales: Record<Locale, Record<string, string>> = {
  en,
  "pt-BR": ptBR,
};

let currentLocale: Locale = "pt-BR";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey, params: any[] = []): string {
  const localeStrings = locales[currentLocale] || locales["en"];
  let template = localeStrings[key] || en[key] || key;

  params.forEach((param, index) => {
    template = template.replace(`{${index}}`, String(param));
  });

  return template;
}
