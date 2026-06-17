import { For, type Accessor, type Setter } from "solid-js";
import type { RibbonTabId } from "@/ui/components/Toolbar/schema/items.js";
import { RIBBON_TAB_DEFINITIONS } from "./ribbonModel.js";

export interface RibbonTabsProps {
  activeTab: Accessor<RibbonTabId>;
  setActiveTab: Setter<RibbonTabId>;
}

export function RibbonTabs(props: RibbonTabsProps) {
  const tabs = RIBBON_TAB_DEFINITIONS;

  const moveTab = (current: RibbonTabId, delta: number) => {
    const index = tabs.findIndex((tab) => tab.id === current);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next) props.setActiveTab(next.id);
  };

  return (
    <div class="oasis-editor-ribbon-tabs" role="tablist">
      <For each={tabs}>
        {(tab) => (
          <button
            type="button"
            class="oasis-editor-ribbon-tab"
            classList={{
              "oasis-editor-ribbon-tab-active": props.activeTab() === tab.id,
            }}
            role="tab"
            aria-selected={props.activeTab() === tab.id}
            aria-controls={`oasis-editor-ribbon-panel-${tab.id}`}
            id={`oasis-editor-ribbon-tab-${tab.id}`}
            data-testid={`editor-ribbon-tab-${tab.id}`}
            tabIndex={props.activeTab() === tab.id ? 0 : -1}
            onClick={() => props.setActiveTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveTab(tab.id, 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveTab(tab.id, -1);
              } else if (event.key === "Home") {
                event.preventDefault();
                props.setActiveTab(tabs[0]!.id);
              } else if (event.key === "End") {
                event.preventDefault();
                props.setActiveTab(tabs[tabs.length - 1]!.id);
              }
            }}
          >
            {tab.label}
          </button>
        )}
      </For>
    </div>
  );
}
