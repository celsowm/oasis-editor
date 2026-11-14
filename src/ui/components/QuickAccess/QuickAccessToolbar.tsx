import { For, Show, createMemo, type Accessor, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { CheckIcon } from "@/ui/utils/customIcons.js";
import type { QuickAccessCatalogItem } from "@/ui/app/quickAccessCatalog.js";

export interface QuickAccessToolbarProps {
  catalog: readonly QuickAccessCatalogItem[];
  visible: Accessor<string[]>;
  onToggle: (command: string) => void;
  onExecute: (command: string) => void;
  /** Enabled check; re-evaluated on every bus tap and editor commit. */
  canExecute: (command: string) => boolean;
  /** Bumps after every command bus execution. */
  tick: () => number;
}

/**
 * Word-style Quick Access Toolbar: a slim, always-available strip above the
 * ribbon. Visible commands are user-picked and persisted in localStorage via
 * `createQuickAccess`; the trailing chevron opens the customize menu.
 */
export function QuickAccessToolbar(
  props: QuickAccessToolbarProps,
): JSX.Element {
  const t = useI18n();

  // Disabled state re-reads the bus after every tap or editor commit.
  const enabled = createMemo((): Record<string, boolean> => {
    props.tick();
    const map: Record<string, boolean> = {};
    for (const entry of props.catalog) {
      map[entry.command] = props.canExecute(entry.command);
    }
    return map;
  });

  const visibleEntries = (): QuickAccessCatalogItem[] =>
    props.catalog.filter((entry): boolean =>
      props.visible().includes(entry.command),
    );

  return (
    <div
      class="oasis-quick-access"
      role="region"
      aria-label={t("quickAccess.title")}
      data-testid="editor-quick-access"
    >
      <For each={visibleEntries()}>
        {(entry): JSX.Element => (
          <Button
            icon={entry.icon}
            tooltip={t(entry.labelKey)}
            aria-label={t(entry.labelKey)}
            data-testid={`editor-qat-${entry.command}`}
            disabled={!enabled()[entry.command]}
            onClick={(): void => props.onExecute(entry.command)}
          />
        )}
      </For>
      <Menu
        icon="chevron-down"
        testId="editor-qat-customize"
        tooltip={t("quickAccess.customize")}
        hideChevron
        panelClass="oasis-quick-access-menu"
      >
        <For each={props.catalog}>
          {(entry): JSX.Element => {
            const checked = (): boolean =>
              props.visible().includes(entry.command);
            return (
              <button
                type="button"
                class="oasis-editor-line-spacing-item"
                classList={{
                  "oasis-editor-line-spacing-item-active": checked(),
                }}
                role="menuitemcheckbox"
                aria-checked={checked()}
                aria-label={t(entry.labelKey)}
                data-testid={`editor-qat-toggle-${entry.command}`}
                onClick={(): void => props.onToggle(entry.command)}
              >
                <span
                  class="oasis-editor-line-spacing-item-check"
                  aria-hidden="true"
                >
                  <Show when={checked()}>
                    <CheckIcon size={14} />
                  </Show>
                </span>
                <span class="oasis-editor-line-spacing-item-label">
                  {t(entry.labelKey)}
                </span>
              </button>
            );
          }}
        </For>
      </Menu>
    </div>
  );
}
