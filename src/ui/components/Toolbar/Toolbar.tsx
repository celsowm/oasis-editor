import {
  For,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import "./toolbar.css";
import { useI18n } from "@/i18n/I18nContext.js";
import { ToolbarOverflowManager } from "./ToolbarOverflowManager.js";
import { ToolbarItemRenderer } from "./renderers/ToolbarItemRenderer.js";
import {
  createToolbarApi,
  type ToolbarHost,
} from "./state/createToolbarApi.js";
import type { ToolbarRegistry } from "./registry/ToolbarRegistry.js";
import type {
  ToolbarLayoutMode,
  ToolbarViewMode,
} from "@/ui/OasisEditorAppProps.js";
import { RibbonTabs } from "./ribbon/RibbonTabs.js";
import {
  resolveContextualTabTransition,
  sameRibbonComposition,
  visibleRibbonItems,
} from "./ribbon/ribbonModel.js";
import { RibbonPanel } from "./ribbon/RibbonPanel.js";
import { CONTEXTUAL_TABS, type RibbonTabId } from "./schema/items.js";
import type { ToolbarItem } from "@/ui/components/Toolbar/schema/items.js";

const shouldAllowNativeMouseDown = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest("select, input, textarea, label") !== null;

export interface ToolbarProps {
  host: () => ToolbarHost;
  registry: ToolbarRegistry;
  showFileGroup?: boolean;
  view?: ToolbarViewMode;
  layout?: ToolbarLayoutMode;
}

/**
 * Thin, data-driven toolbar renderer: maps the per-instance registry's ordered
 * items to renderers, wrapped by the imperative overflow manager. All layout is
 * data; there is no hardcoded group composition here.
 */
export function Toolbar(props: ToolbarProps): JSX.Element {
  const api = createToolbarApi(props.host, useI18n());
  const [version, setVersion] = createSignal(0);
  const [activeTab, setActiveTab] = createSignal<RibbonTabId>("home");
  let previousRibbonItems: ToolbarItem[] | undefined;

  // Word-style contextual tabs (table tools, image format, …): the pure
  // `resolveContextualTabTransition` policy decides the tab a context snapshot
  // selects. Generic over every `CONTEXTUAL_TABS` entry so multiple contextual
  // features coexist without hardcoded per-feature blocks.
  const CONTEXTUAL_TAB_ENTRIES = Object.entries(CONTEXTUAL_TABS) as Array<
    [RibbonTabId, string]
  >;
  createEffect((prev?: Map<string, boolean>): Map<string, boolean> => {
    const current = new Map<string, boolean>();
    for (const [, command] of CONTEXTUAL_TAB_ENTRIES) {
      if (!current.has(command)) {
        current.set(command, api.commands.state(command).isActive);
      }
    }
    const next = resolveContextualTabTransition(
      CONTEXTUAL_TAB_ENTRIES,
      activeTab(),
      prev,
      current,
    );
    if (next && next !== activeTab()) setActiveTab(next);
    return current;
  });

  onMount((): void => {
    const unsubscribe = props.registry.onChange((): number =>
      setVersion((v): number => v + 1),
    );
    onCleanup(unsubscribe);
  });

  const items = createMemo((): ToolbarItem[] => {
    version();
    const ordered = props.registry.getOrdered();
    if (props.showFileGroup === false) {
      return ordered.filter((item): boolean => item.group !== "file");
    }
    return ordered;
  });

  const ribbonItems = createMemo((): ToolbarItem[] => {
    const next = visibleRibbonItems(items(), api);
    // Recomposition must not recreate the item graph: `visibleRibbonItems`
    // evaluates every `isVisible`, which reads command state, so an unrelated
    // selection or formatting change otherwise yields a brand-new array. The
    // ribbon `For` is keyed by reference, so that remounted every group and
    // dismissed open popups (Paragraph metrics, margins, palettes) on each
    // edit. Keep the previous array while the visible composition is identical.
    if (
      previousRibbonItems &&
      sameRibbonComposition(previousRibbonItems, next)
    ) {
      return previousRibbonItems;
    }
    previousRibbonItems = next;
    return next;
  });

  const view = (): ToolbarViewMode => props.view ?? "ribbon";
  const layout = (): ToolbarLayoutMode => props.layout ?? "overflow";
  const renderItems = (): JSX.Element => (
    <For each={items()}>
      {(item): JSX.Element => <ToolbarItemRenderer item={item} api={api} />}
    </For>
  );

  return (
    <section
      class="oasis-editor-toolbar"
      classList={{
        "oasis-editor-toolbar-view-ribbon": view() === "ribbon",
        "oasis-editor-toolbar-view-compact": view() === "compact",
        "oasis-editor-toolbar-layout-overflow": layout() === "overflow",
        "oasis-editor-toolbar-layout-wrap": layout() === "wrap",
      }}
      onMouseDown={(event): void => {
        if (shouldAllowNativeMouseDown(event.target)) {
          return;
        }
        event.preventDefault();
      }}
    >
      {view() === "ribbon" ? (
        <>
          <RibbonTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            api={api}
            items={ribbonItems}
          />
          <RibbonPanel activeTab={activeTab} items={ribbonItems} api={api} />
        </>
      ) : layout() === "overflow" ? (
        <ToolbarOverflowManager>{renderItems()}</ToolbarOverflowManager>
      ) : (
        <div class="oasis-editor-toolbar-wrap-strip">{renderItems()}</div>
      )}
    </section>
  );
}
