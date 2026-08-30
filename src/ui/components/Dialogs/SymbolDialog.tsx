import { For, Show, createMemo, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/public/Button.js";
import { Dialog } from "./Dialog.js";
import {
  SYMBOL_CATEGORIES,
  COMMON_SYMBOLS,
  type SymbolEntry,
} from "../Toolbar/symbolCatalog.js";
import { getRecentSymbols, rememberSymbol } from "../Toolbar/recentSymbols.js";

export interface SymbolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (symbol: string, fontFamily: string) => void;
}

const FONT_OPTIONS = [
  "Segoe UI Symbol",
  "Arial Unicode MS",
  "Cambria Math",
  "Times New Roman",
] as const;

export function SymbolDialog(props: SymbolDialogProps): JSX.Element {
  const t = useI18n();
  const [category, setCategory] = createSignal("common");
  const [selected, setSelected] = createSignal<SymbolEntry>(COMMON_SYMBOLS[0]!);
  const [font, setFont] = createSignal<string>(FONT_OPTIONS[0]);
  const [codeInput, setCodeInput] = createSignal(COMMON_SYMBOLS[0]!.codePoint);
  const recentSymbols = createMemo((): readonly SymbolEntry[] => {
    props.isOpen;
    return getRecentSymbols();
  });

  const visibleEntries = createMemo((): readonly SymbolEntry[] => {
    if (category() === "all") {
      return SYMBOL_CATEGORIES.flatMap(
        (symbolCategory): readonly SymbolEntry[] => symbolCategory.entries,
      );
    }
    return (
      SYMBOL_CATEGORIES.find(
        (symbolCategory): boolean => symbolCategory.id === category(),
      )?.entries ?? COMMON_SYMBOLS
    );
  });

  const selectEntry = (entry: SymbolEntry): void => {
    setSelected(entry);
    setCodeInput(entry.codePoint);
  };

  const selectCodePoint = (value: string): void => {
    setCodeInput(value);
    const normalized = value.trim().toUpperCase().replace(/^U\+/, "");
    const parsed = Number.parseInt(normalized, 16);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0x10ffff) return;
    const character = String.fromCodePoint(parsed);
    setSelected({
      character,
      codePoint: `U+${parsed.toString(16).toUpperCase().padStart(4, "0")}`,
    });
  };

  const insertSelected = (): void => {
    const character = selected().character;
    if (!character) return;
    rememberSymbol(character);
    props.onInsert(character, font());
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.symbol.title")}
      onClose={props.onClose}
      class="oasis-editor-symbol-dialog"
      bodyClass="oasis-editor-symbol-dialog-body"
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={props.onClose}
            data-testid="editor-symbol-dialog-cancel"
          >
            {t("generic.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={insertSelected}
            data-testid="editor-symbol-dialog-insert"
          >
            {t("dialog.symbol.insert")}
          </Button>
        </>
      }
    >
      <div class="oasis-editor-symbol-dialog-controls">
        <label class="oasis-editor-symbol-dialog-field">
          <span>{t("dialog.symbol.font")}</span>
          <select
            value={font()}
            data-testid="editor-symbol-dialog-font"
            onChange={(event): void => {
              setFont(event.currentTarget.value);
            }}
          >
            <For each={FONT_OPTIONS}>
              {(option): JSX.Element => (
                <option value={option}>{option}</option>
              )}
            </For>
          </select>
        </label>
        <label class="oasis-editor-symbol-dialog-field">
          <span>{t("dialog.symbol.subset")}</span>
          <select
            value={category()}
            data-testid="editor-symbol-dialog-category"
            onChange={(event): void => {
              setCategory(event.currentTarget.value);
            }}
          >
            <option value="all">{t("symbols.category.all")}</option>
            <For each={SYMBOL_CATEGORIES}>
              {(symbolCategory): JSX.Element => (
                <option value={symbolCategory.id}>
                  {t(symbolCategory.labelKey)}
                </option>
              )}
            </For>
          </select>
        </label>
      </div>

      <div class="oasis-editor-symbol-dialog-layout">
        <div
          class="oasis-editor-symbol-dialog-grid"
          role="grid"
          aria-label={t("dialog.symbol.title")}
        >
          <Show when={recentSymbols().length > 0}>
            <div class="oasis-editor-symbol-dialog-recent">
              <span>{t("dialog.symbol.recent")}</span>
              <div class="oasis-editor-symbol-dialog-recent-list">
                <For each={recentSymbols()}>
                  {(entry): JSX.Element => (
                    <button
                      type="button"
                      class="oasis-editor-symbol-dialog-tile"
                      title={`${entry.character} (${entry.codePoint})`}
                      aria-label={`${entry.character} (${entry.codePoint})`}
                      onClick={(): void => selectEntry(entry)}
                    >
                      {entry.character}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>
          <For each={visibleEntries()}>
            {(entry): JSX.Element => (
              <button
                type="button"
                class="oasis-editor-symbol-dialog-tile"
                classList={{
                  "oasis-editor-symbol-dialog-tile-active":
                    selected().character === entry.character,
                }}
                role="gridcell"
                title={`${entry.character} (${entry.codePoint})`}
                aria-label={`${entry.character} (${entry.codePoint})`}
                data-testid={`editor-symbol-dialog-${entry.codePoint.replace(/[^A-Z0-9]/g, "-")}`}
                onClick={(): void => selectEntry(entry)}
                onDblClick={insertSelected}
              >
                {entry.character}
              </button>
            )}
          </For>
        </div>

        <aside class="oasis-editor-symbol-dialog-preview">
          <span class="oasis-editor-symbol-dialog-preview-label">
            {t("dialog.symbol.preview")}
          </span>
          <span
            class="oasis-editor-symbol-dialog-preview-character"
            style={{ "font-family": font() }}
            data-testid="editor-symbol-dialog-preview"
          >
            {selected().character}
          </span>
          <label class="oasis-editor-symbol-dialog-field">
            <span>{t("dialog.symbol.code")}</span>
            <input
              value={codeInput()}
              spellcheck={false}
              data-testid="editor-symbol-dialog-code"
              onInput={(event): void =>
                selectCodePoint(event.currentTarget.value)
              }
            />
          </label>
          <p class="oasis-editor-symbol-dialog-help">
            {t("dialog.symbol.doubleClickHelp")}
          </p>
        </aside>
      </div>
    </Dialog>
  );
}
