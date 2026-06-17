import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import type { RibbonGroupModel } from "./ribbonModel.js";
import { RibbonRow } from "./RibbonRow.js";

export interface RibbonGroupProps {
  group: RibbonGroupModel;
  api: ToolbarActionApi;
}

export function RibbonGroup(props: RibbonGroupProps) {
  return (
    <section
      class="oasis-editor-ribbon-group"
      data-ribbon-group={props.group.id}
      aria-label={props.group.label}
    >
      <div class="oasis-editor-ribbon-group-rows">
        <RibbonRow items={props.group.rows[1]} api={props.api} />
        <RibbonRow items={props.group.rows[2]} api={props.api} />
      </div>
      <div class="oasis-editor-ribbon-group-label">{props.group.label}</div>
    </section>
  );
}
