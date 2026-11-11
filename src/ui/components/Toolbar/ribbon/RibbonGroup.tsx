import { For, Show, createEffect, type JSX } from "solid-js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { ToolbarItemRenderer } from "@/ui/components/Toolbar/renderers/ToolbarItemRenderer.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import type {
  RibbonGroupWidth,
  ResolvedRibbonGroupModel,
} from "./ribbonModel.js";
import { RibbonRow } from "./RibbonRow.js";

export interface RibbonGroupProps {
  group: ResolvedRibbonGroupModel;
  api: ToolbarActionApi;
  measurements?: RibbonGroupWidth;
}

/** The same spatial arrangement is used in the Ribbon and collapsed popup. */
function RibbonGroupContent(props: RibbonGroupProps): JSX.Element {
  return (
    <div
      class="oasis-editor-ribbon-group-rows"
      classList={{
        "oasis-editor-ribbon-group-three-rows":
          props.group.layout === "three-rows",
      }}
    >
      <Show when={props.group.largeItems.length > 0}>
        <div class="oasis-editor-ribbon-large-items">
          <For each={props.group.largeItems}>
            {(item): JSX.Element => (
              <ToolbarItemRenderer item={item} api={props.api} />
            )}
          </For>
        </div>
      </Show>
      <div class="oasis-editor-ribbon-normal-rows">
        <RibbonRow items={props.group.rows[1]} api={props.api} />
        <RibbonRow items={props.group.rows[2]} api={props.api} />
        <Show when={props.group.layout === "three-rows"}>
          <RibbonRow items={props.group.rows[3]} api={props.api} />
        </Show>
      </div>
    </div>
  );
}

export function RibbonGroup(props: RibbonGroupProps): JSX.Element {
  let section: HTMLElement | undefined;
  createEffect((): void => {
    const collapsed = props.group.resizeState === "collapsed";
    if (
      collapsed &&
      section
        ?.querySelector(".oasis-editor-ribbon-group-content")
        ?.contains(document.activeElement)
    ) {
      queueMicrotask(() =>
        section
          ?.querySelector<HTMLButtonElement>(
            ".oasis-editor-ribbon-group-collapsed-trigger button",
          )
          ?.focus({ preventScroll: true }),
      );
    }
  });
  const style = (): JSX.CSSProperties => ({
    "--oasis-ribbon-group-compact-width":
      props.group.allocatedWidth === undefined
        ? `${props.group.resizePolicy.compactMinWidth}px`
        : `calc(${props.group.allocatedWidth}px - ${props.group.compactChrome ?? 11}px)`,
    "--oasis-ribbon-group-collapsed-width": `${props.group.resizePolicy.collapsedMinWidth}px`,
  });
  return (
    <section
      ref={section}
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
      data-ribbon-width-allocated={props.group.measuredWidth}
      data-ribbon-width-full={props.measurements?.full}
      data-ribbon-width-compact={props.measurements?.compact}
      data-ribbon-width-collapsed={props.measurements?.collapsed}
      aria-label={props.group.label}
      style={style()}
    >
      <div class="oasis-editor-ribbon-group-content">
        <RibbonGroupContent group={props.group} api={props.api} />
      </div>
      <div class="oasis-editor-ribbon-group-collapsed-trigger">
        <Menu
          icon={props.group.resizePolicy.collapsedIcon}
          label={props.group.label}
          tooltip={props.group.label}
          testId={`editor-ribbon-group-${props.group.id}`}
          ribbonSize="large"
          fitViewport
          panelClass="oasis-editor-ribbon-collapsed-menu oasis-editor-toolbar-view-ribbon"
        >
          <RibbonGroupContent group={props.group} api={props.api} />
        </Menu>
      </div>
      <div class="oasis-editor-ribbon-group-label">{props.group.label}</div>
    </section>
  );
}
