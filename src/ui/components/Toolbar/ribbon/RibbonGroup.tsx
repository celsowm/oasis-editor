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

/**
 * Compact groups are the Office "large action + small-command stack" shape:
 * they use the three-row stack sizing and additionally drop captions in the
 * inline Ribbon while keeping them in the collapsed popup.
 */
function usesStackedRows(layout: ResolvedRibbonGroupModel["layout"]): boolean {
  return layout === "three-rows" || layout === "compact";
}

/** The same spatial arrangement is used in the Ribbon and collapsed popup. */
function RibbonGroupContent(props: RibbonGroupProps): JSX.Element {
  return (
    <div
      class="oasis-editor-ribbon-group-rows"
      classList={{
        "oasis-editor-ribbon-group-three-rows": usesStackedRows(
          props.group.layout,
        ),
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
        <Show when={usesStackedRows(props.group.layout)}>
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
        "oasis-editor-ribbon-group-compact-layout":
          props.group.layout === "compact",
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
      {props.group.resizePolicy.launcher && (
        <button
          type="button"
          class="oasis-editor-ribbon-group-launcher"
          title={props.group.resizePolicy.launcherTooltip ?? props.group.label}
          aria-label={props.group.resizePolicy.launcherTooltip ?? `${props.group.label} options`}
          onClick={() => props.api.commands.execute(props.group.resizePolicy.launcher!)}
          data-testid={`editor-ribbon-group-${props.group.id}-launcher`}
        >
          <span class="oasis-editor-ribbon-group-launcher-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </span>
        </button>
      )}
      <Show when={props.group.resizeState === "collapsed"}>
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
      </Show>
      <div class="oasis-editor-ribbon-group-label" title={props.group.label}>
        {props.group.label}
      </div>
    </section>
  );
}
