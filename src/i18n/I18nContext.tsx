import {
  createContext,
  useContext,
  type JSX,
} from "solid-js";
import { createTranslator, type TranslateFn } from "./index.js";

/**
 * Immutable fallback translator. Components rendered outside an `I18nProvider`
 * (e.g. isolated tests) default to pt-BR. This is a fixed translator, not
 * mutable global state — per-instance providers override it.
 */
const defaultTranslator = createTranslator(() => "pt-BR");

const I18nContext = createContext<TranslateFn>(defaultTranslator);

/** Access the translator from the nearest `I18nProvider`. */
export function useI18n(): TranslateFn {
  return useContext(I18nContext);
}

export function I18nProvider(props: {
  translator: TranslateFn;
  children: JSX.Element;
}): JSX.Element {
  return (
    <I18nContext.Provider value={props.translator}>
      {props.children}
    </I18nContext.Provider>
  );
}
