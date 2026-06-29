import {
  For,
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
import { RibbonPanel } from "./ribbon/RibbonPanel.js";
import type { RibbonTabId } from "./schema/items.js";
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

  onMount((): void => {
    const unsubscribe = props.registry.onChange((): number => setVersion((v): number => v + 1));
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
          <RibbonTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <RibbonPanel activeTab={activeTab} items={items} api={api} />
        </>
      ) : layout() === "overflow" ? (
        <ToolbarOverflowManager>{renderItems()}</ToolbarOverflowManager>
      ) : (
        <div class="oasis-editor-toolbar-wrap-strip">{renderItems()}</div>
      )}
    </section>
  );
}
