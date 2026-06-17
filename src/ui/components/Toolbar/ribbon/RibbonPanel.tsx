import { For, type Accessor } from "solid-js";
import type {
  RibbonTabId,
  ToolbarActionApi,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import { buildRibbonGroups } from "./ribbonModel.js";
import { RibbonGroup } from "./RibbonGroup.js";

export interface RibbonPanelProps {
  activeTab: Accessor<RibbonTabId>;
  items: Accessor<ToolbarItem[]>;
  api: ToolbarActionApi;
}

export function RibbonPanel(props: RibbonPanelProps) {
  const groups = () => buildRibbonGroups(props.items(), props.activeTab());

  return (
    <div
      class="oasis-editor-ribbon-panel"
      role="tabpanel"
      id={`oasis-editor-ribbon-panel-${props.activeTab()}`}
      aria-labelledby={`oasis-editor-ribbon-tab-${props.activeTab()}`}
      data-testid="editor-ribbon-panel"
    >
      <For each={groups()}>
        {(group) => <RibbonGroup group={group} api={props.api} />}
      </For>
    </div>
  );
}
