import { For, createMemo, type Accessor, type Setter } from "solid-js";
import type {
  RibbonTabId,
  ToolbarActionApi,
} from "@/ui/components/Toolbar/schema/items.js";
import {
  buildRibbonTabDefinitions,
  type RibbonTabDefinition,
} from "./ribbonModel.js";
import { JSX } from "solid-js";

export interface RibbonTabsProps {
  activeTab: Accessor<RibbonTabId>;
  setActiveTab: Setter<RibbonTabId>;
  api: ToolbarActionApi;
}

export function RibbonTabs(props: RibbonTabsProps): JSX.Element {
  // Reactive: contextual tabs (e.g. table tools) enter/leave the strip as the
  // gating command state changes on selection.
  const tabs = createMemo<RibbonTabDefinition[]>(() =>
    buildRibbonTabDefinitions(props.api.t, props.api),
  );

  const moveTab = (current: RibbonTabId, delta: number): void => {
    const list = tabs();
    const index = list.findIndex((tab): boolean => tab.id === current);
    const next = list[(index + delta + list.length) % list.length];
    if (next) props.setActiveTab(next.id);
  };

  return (
    <div class="oasis-editor-ribbon-tabs" role="tablist">
      <For each={tabs()}>
        {(tab): JSX.Element => (
          <button
            type="button"
            class="oasis-editor-ribbon-tab"
            classList={{
              "oasis-editor-ribbon-tab-active": props.activeTab() === tab.id,
              "oasis-editor-ribbon-tab-contextual": tab.contextual === true,
            }}
            role="tab"
            aria-selected={props.activeTab() === tab.id}
            aria-controls={`oasis-editor-ribbon-panel-${tab.id}`}
            id={`oasis-editor-ribbon-tab-${tab.id}`}
            data-testid={`editor-ribbon-tab-${tab.id}`}
            tabIndex={props.activeTab() === tab.id ? 0 : -1}
            onClick={() => props.setActiveTab(tab.id)}
            onKeyDown={(event): void => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveTab(tab.id, 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveTab(tab.id, -1);
              } else if (event.key === "Home") {
                event.preventDefault();
                props.setActiveTab(tabs()[0]!.id);
              } else if (event.key === "End") {
                event.preventDefault();
                const list = tabs();
                props.setActiveTab(list[list.length - 1]!.id);
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
