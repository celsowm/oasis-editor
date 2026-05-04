import { createContext, useContext, JSX, createSignal, onMount, onCleanup } from "solid-js";
import { II18nService } from "../core/utils/I18nService.js";
import { Locale } from "../core/utils/translations.js";

const I18nContext = createContext<II18nService>();

export function I18nProvider(props: { service: II18nService; children: JSX.Element }) {
  return (
    <I18nContext.Provider value={props.service}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const service = useContext(I18nContext);
  if (!service) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  const [locale, setLocale] = createSignal(service.getLocale());

  onMount(() => {
    const cleanup = service.subscribe((newLocale) => setLocale(newLocale));
    onCleanup(cleanup);
  });

  return {
    t: (section: any, key: any, ...args: any[]) => service.t(section, key, ...args),
    locale,
    setLocale: (l: Locale) => service.setLocale(l),
  };
}
