import { For, Show, type JSX } from "solid-js";
import type {
  ToolbarActionApi,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import { ToolbarItemRenderer } from "@/ui/components/Toolbar/renderers/ToolbarItemRenderer.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import type { ResolvedRibbonGroupModel } from "./ribbonModel.js";
import { RibbonRow } from "./RibbonRow.js";

export interface RibbonGroupProps {
  group: ResolvedRibbonGroupModel;
  api: ToolbarActionApi;
}

function groupItems(group: ResolvedRibbonGroupModel): ToolbarItem[] {
  return [...group.largeItems, ...group.rows[1], ...group.rows[2]];
}

function groupStyle(group: ResolvedRibbonGroupModel): JSX.CSSProperties {
  return group.resizeState === "compact" && group.allocatedWidth
    ? ({
        "--oasis-ribbon-group-compact-width": `${group.allocatedWidth}px`,
      } as JSX.CSSProperties)
    : {};
}

export function RibbonGroup(props: RibbonGroupProps): JSX.Element {
  return (
    <section
      class="oasis-editor-ribbon-group"
      classList={{
        "oasis-editor-ribbon-group-compact":
          props.group.resizeState === "compact",
        "oasis-editor-ribbon-group-collapsed":
          props.group.resizeState === "collapsed",
        "oasis-editor-ribbon-group-compact-hide-labels":
          props.group.resizeState === "compact" &&
          props.group.resizePolicy.compactLabels === "hide",
      }}
      data-ribbon-group={props.group.id}
      data-ribbon-state={props.group.resizeState}
      aria-label={props.group.label}
      style={groupStyle(props.group)}
    >
      <Show
        when={props.group.resizeState !== "collapsed"}
        fallback={
          <>
            <div class="oasis-editor-ribbon-group-rows">
              <Menu
                icon={props.group.resizePolicy.collapsedIcon}
                label={props.group.label}
                tooltip={props.group.label}
                testId={`editor-ribbon-group-${props.group.id}`}
                ribbonSize="large"
                panelClass="oasis-editor-ribbon-collapsed-menu"
              >
                <div class="oasis-editor-ribbon-collapsed-items">
                  <For each={groupItems(props.group)}>
                    {(item): JSX.Element => (
                      <ToolbarItemRenderer item={item} api={props.api} />
                    )}
                  </For>
                </div>
              </Menu>
            </div>
            <div class="oasis-editor-ribbon-group-label">
              {props.group.label}
            </div>
          </>
        }
      >
        <div class="oasis-editor-ribbon-group-rows">
          <Show when={props.group.largeItems.length > 0}>
            <div class="oasis-editor-ribbon-large-items">
              <For each={props.group.largeItems}>
                {(item): JSX.Element => <ToolbarItemRenderer item={item} api={props.api} />}
              </For>
            </div>
          </Show>
          <div class="oasis-editor-ribbon-normal-rows">
            <RibbonRow items={props.group.rows[1]} api={props.api} />
            <RibbonRow items={props.group.rows[2]} api={props.api} />
          </div>
        </div>
        <div class="oasis-editor-ribbon-group-label">{props.group.label}</div>
      </Show>
    </section>
  );
}
