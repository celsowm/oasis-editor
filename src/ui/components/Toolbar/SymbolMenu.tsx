import { For, Show, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import { Menu } from "./primitives/Menu.js";
import {
  COMMON_SYMBOLS,
  EQUATION_TEMPLATES,
  NUMBER_SYMBOLS,
  type SymbolEntry,
} from "./symbolCatalog.js";
import { rememberSymbol } from "./recentSymbols.js";
import { parseLinearMath } from "@/core/math/linear.js";

type SymbolMenuView = "root" | "symbols" | "numbers" | "equations";

export function SymbolMenu(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const [view, setView] = createSignal<SymbolMenuView>("root");

  const insert = (entry: SymbolEntry): void => {
    if (view() === "equations") {
      if (
        !props.api.commands.canExecute(
          "insertEquation",
          parseLinearMath(entry.character),
        )
      )
        return;
      props.api.commands.execute(
        "insertEquation",
        parseLinearMath(entry.character),
      );
      props.api.focusEditor();
      return;
    }
    if (!props.api.commands.canExecute("insertText", entry.character)) return;
    rememberSymbol(entry.character);
    props.api.commands.execute("insertText", entry.character);
    props.api.focusEditor();
  };

  const viewTitle = (): string => {
    switch (view()) {
      case "symbols":
        return t("symbols.menu.symbol");
      case "numbers":
        return t("symbols.menu.number");
      case "equations":
        return t("symbols.menu.equation");
      default:
        return t("toolbar.symbols");
    }
  };

  const entriesForView = (): readonly SymbolEntry[] => {
    switch (view()) {
      case "symbols":
        return COMMON_SYMBOLS;
      case "numbers":
        return NUMBER_SYMBOLS;
      case "equations":
        return EQUATION_TEMPLATES;
      default:
        return [];
    }
  };

  return (
    <Menu
      icon="omega"
      label={t("toolbar.symbols")}
      testId="editor-toolbar-symbols"
      tooltip={t("toolbar.symbols")}
      ribbonSize="large"
      panelClass="oasis-editor-symbol-menu-panel"
      onOpenChange={(open): void => {
        if (open) setView("root");
      }}
    >
      <Show
        when={view() === "root"}
        fallback={
          <div class="oasis-editor-symbol-picker">
            <div class="oasis-editor-symbol-picker-header">
              <button
                type="button"
                class="oasis-editor-symbol-back"
                aria-label={t("generic.back")}
                onClick={(event): void => {
                  event.stopPropagation();
                  setView("root");
                }}
              >
                <ToolIcon name="arrow-left" />
              </button>
              <span>{viewTitle()}</span>
            </div>
            <div
              class="oasis-editor-symbol-grid"
              classList={{
                "oasis-editor-symbol-equation-grid": view() === "equations",
              }}
            >
              <For each={entriesForView()}>
                {(entry): JSX.Element => (
                  <button
                    type="button"
                    class="oasis-editor-symbol-tile"
                    title={`${entry.character} (${entry.codePoint})`}
                    aria-label={`${entry.character} (${entry.codePoint})`}
                    data-testid={`editor-symbol-${entry.codePoint.replace(/[^A-Z0-9]/g, "-")}`}
                    onClick={(): void => insert(entry)}
                  >
                    {entry.character}
                  </button>
                )}
              </For>
            </div>
            <button
              type="button"
              class="oasis-editor-symbol-more"
              data-testid="editor-toolbar-more-symbols"
              onClick={(): void => {
                if (props.api.commands.canExecute("openSymbolDialog")) {
                  props.api.commands.execute("openSymbolDialog");
                }
              }}
            >
              <ToolIcon name="omega" />
              <span>{t("symbols.more")}</span>
            </button>
          </div>
        }
      >
        <div class="oasis-editor-symbol-menu-actions">
          <button
            type="button"
            class="oasis-editor-symbol-menu-action"
            data-testid="editor-toolbar-equation"
            onClick={(event): void => {
              event.stopPropagation();
              if (props.api.commands.canExecute("openEquationDialog")) {
                props.api.commands.execute("openEquationDialog");
              }
            }}
          >
            <ToolIcon name="square-function" />
            <span>{t("symbols.menu.equation")}</span>
            <ToolIcon name="chevron-down" />
          </button>
          <button
            type="button"
            class="oasis-editor-symbol-menu-action"
            data-testid="editor-toolbar-symbol"
            onClick={(event): void => {
              event.stopPropagation();
              setView("symbols");
            }}
          >
            <ToolIcon name="omega" />
            <span>{t("symbols.menu.symbol")}</span>
            <ToolIcon name="chevron-down" />
          </button>
          <button
            type="button"
            class="oasis-editor-symbol-menu-action"
            data-testid="editor-toolbar-number"
            onClick={(event): void => {
              event.stopPropagation();
              setView("numbers");
            }}
          >
            <ToolIcon name="hash" />
            <span>{t("symbols.menu.number")}</span>
            <ToolIcon name="chevron-down" />
          </button>
        </div>
      </Show>
    </Menu>
  );
}
