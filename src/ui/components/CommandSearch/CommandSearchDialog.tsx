import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { TextField } from "@/ui/public/TextField.js";
import { Text } from "@/ui/public/Text.js";
import { SurfaceButton } from "@/ui/public/SurfaceButton.js";
import type { JSX } from "solid-js";
import {
  searchCommandEntries,
  type CommandSearchEntry,
  type CommandSearchHit,
} from "@/core/commands/commandSearch.js";

export interface CommandSearchDialogProps {
  isOpen: boolean;
  /** Localized entries built from the live registries at open time. */
  entries: CommandSearchEntry[];
  /** Enabled check evaluated against the live command bus. */
  isEnabled: (command: string, payload?: unknown) => boolean;
  onExecute: (entry: CommandSearchHit) => void;
  onClose: () => void;
}

const MAX_HITS = 12;

/**
 * Command search ("Tell Me"): a small top-anchored palette over every
 * executable surface (Ribbon + menubar), fuzzy-matched as you type. Enter
 * runs the active row; disabled rows are announced but cannot be run.
 */
export function CommandSearchDialog(
  props: CommandSearchDialogProps,
): JSX.Element {
  const t = useI18n();
  const [query, setQuery] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  createEffect((): void => {
    if (!props.isOpen) return;
    setQuery("");
    setActiveIndex(0);
    queueMicrotask((): void => {
      inputRef?.focus();
    });
  });

  const hits = createMemo((): CommandSearchHit[] =>
    searchCommandEntries(query(), props.entries, MAX_HITS),
  );

  createEffect((): void => {
    // Keep the active index in range as the result set shrinks.
    void hits();
    setActiveIndex((current): number =>
      Math.min(current, Math.max(0, hits().length - 1)),
    );
  });

  const runnable = (hit: CommandSearchHit): boolean =>
    props.isEnabled(hit.command, hit.payload);

  const execute = (hit: CommandSearchHit): void => {
    if (!runnable(hit)) return;
    props.onExecute(hit);
  };

  const move = (delta: number): void => {
    const total = hits().length;
    if (total === 0) return;
    setActiveIndex((current): number => (current + delta + total) % total);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter": {
        event.preventDefault();
        const hit = hits()[activeIndex()];
        if (hit) execute(hit);
        break;
      }
      case "Escape":
        event.preventDefault();
        props.onClose();
        break;
      default:
        break;
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="oasis-command-search-overlay"
        onClick={props.onClose}
        role="presentation"
        data-testid="editor-command-search-overlay"
      >
        <div
          class="oasis-command-search"
          role="dialog"
          aria-modal="true"
          aria-label={t("commandSearch.title")}
          data-testid="editor-command-search"
          onClick={(event): void => event.stopPropagation()}
          onKeyDown={onKeyDown}
        >
          <TextField
            id="editor-command-search-input"
            placeholder={t("commandSearch.placeholder")}
            value={query()}
            onChange={(value: string): void => {
              setQuery(value);
            }}
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="editor-command-search-listbox"
            aria-activedescendant={
              hits()[activeIndex()]
                ? `editor-command-search-option-${activeIndex()}`
                : undefined
            }
            data-testid="editor-command-search-input"
            autocomplete="off"
            spellcheck={false}
          />
          <Text class="oasis-command-search-hint">
            {t("commandSearch.hint")}
          </Text>
          <Show
            when={hits().length > 0}
            fallback={
              <Text
                as="p"
                class="oasis-command-search-empty"
                data-testid="editor-command-search-empty"
              >
                {t("commandSearch.noResults")}
              </Text>
            }
          >
            <ul
              id="editor-command-search-listbox"
              class="oasis-command-search-list"
              role="listbox"
              data-testid="editor-command-search-listbox"
            >
              <For each={hits()}>
                {(hit, index): JSX.Element => {
                  const active = (): boolean => index() === activeIndex();
                  const enabled = (): boolean => runnable(hit);
                  return (
                    <li
                      id={`editor-command-search-option-${index()}`}
                      role="option"
                      aria-selected={active()}
                      aria-disabled={enabled() ? undefined : true}
                      class="oasis-command-search-option"
                      classList={{
                        "oasis-command-search-option-active": active(),
                        "oasis-command-search-option-disabled": !enabled(),
                      }}
                      data-testid="editor-command-search-item"
                      data-command={hit.command}
                      onMouseEnter={(): void => {
                        setActiveIndex(index());
                      }}
                      onClick={(): void => execute(hit)}
                    >
                      <Text as="span">{hit.label}</Text>
                      <Show when={hit.shortcut}>
                        <kbd class="oasis-command-search-shortcut">
                          {hit.shortcut}
                        </kbd>
                      </Show>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
          <SurfaceButton
            size="sm"
            variant="ghost"
            class="oasis-command-search-close"
            onClick={props.onClose}
            data-testid="editor-command-search-close"
            aria-label={t("generic.close")}
          >
            ✕
          </SurfaceButton>
        </div>
      </div>
    </Show>
  );
}
