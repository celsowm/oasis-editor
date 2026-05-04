import { Locale, TranslationKeys, enUS, ptBR } from "./translations.js";

export interface II18nService {
  setLocale(locale: Locale): void;
  getLocale(): Locale;
  t<K extends keyof TranslationKeys>(
    section: K,
    key: keyof TranslationKeys[K],
    ...args: any[]
  ): string;
  subscribe(listener: (locale: Locale) => void): () => void;
}

export class I18nService implements II18nService {
  private currentLocale: Locale = "en-US";
  private translations: Record<Locale, TranslationKeys> = {
    "en-US": enUS,
    "pt-BR": ptBR,
  };
  private listeners = new Set<(locale: Locale) => void>();

  constructor() {
    const saved = localStorage.getItem("oasis-locale") as Locale;
    if (saved && (saved === "en-US" || saved === "pt-BR")) {
      this.currentLocale = saved;
    }
  }

  setLocale(locale: Locale): void {
    if (this.currentLocale === locale) return;
    this.currentLocale = locale;
    localStorage.setItem("oasis-locale", locale);
    this.notify();
  }

  getLocale(): Locale {
    return this.currentLocale;
  }

  t<K extends keyof TranslationKeys>(
    section: K,
    key: keyof TranslationKeys[K],
    ...args: any[]
  ): string {
    const sectionData = this.translations[this.currentLocale][section];
    let template = (sectionData as any)[key] as string;

    if (!template) {
      console.warn(`Translation missing for ${section}.${String(key)} in ${this.currentLocale}`);
      return String(key);
    }

    // Basic interpolation: {0}, {1}, etc.
    if (args.length > 0) {
      args.forEach((arg, i) => {
        template = template.replace(`{${i}}`, String(arg));
      });
    }

    return template;
  }

  subscribe(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentLocale);
    }
  }
}
