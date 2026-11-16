import {
  For,
  Show,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import { Menu } from "../primitives/Menu.js";
import { RibbonGroup } from "./RibbonGroup.js";
import {
  buildRibbonGroups,
  sameRibbonComposition,
  visibleRibbonItems,
  type RibbonGroupModel,
} from "./ribbonModel.js";
import { measureRibbonGroups } from "./measureRibbonGroups.js";
import type { RibbonPanelProps } from "./RibbonPanel.js";

/** Choose complete groups in order; everything else remains available in the menu. */
export function allocateTwoLineGroups(
  widths: number[],
  available: number,
  menuWidth: number,
): boolean[] {
  if (widths.reduce((sum, width) => sum + width, 0) <= available)
    return widths.map(() => true);
  let remaining = Math.max(0, available - menuWidth);
  return widths.map((width) => {
    if (width > remaining) return false;
    remaining -= width;
    return true;
  });
}

function twoRows(group: RibbonGroupModel): RibbonGroupModel {
  return {
    ...group,
    layout: "two-rows",
    grid: undefined,
    rows: { 1: group.rows[1], 2: [...group.rows[2], ...group.rows[3]], 3: [] },
  };
}

export function TwoLineRibbonPanel(props: RibbonPanelProps): JSX.Element {
  const visible = createMemo(
    () => visibleRibbonItems(props.items(), props.api),
    [],
    { equals: sameRibbonComposition },
  );
  const groups = createMemo(() =>
    buildRibbonGroups(visible(), props.activeTab(), props.api.t).map(twoRows),
  );
  const [widths, setWidths] = createSignal<number[]>([]);
  const [available, setAvailable] = createSignal(0);
  let frame: HTMLDivElement | undefined;
  let measuring: HTMLDivElement | undefined;
  let raf: number | undefined;
  let disposed = false;
  const measure = (): void => {
    raf = undefined;
    if (!frame || !measuring || disposed) return;
    const current = groups();
    const measured = measureRibbonGroups(measuring, current);
    const next = current.map((group) => measured[group.id]?.full ?? 0);
    if (next.some((width) => width <= 0)) return;
    const focused =
      document.activeElement instanceof HTMLElement &&
      frame.contains(document.activeElement)
        ? document.activeElement
        : null;
    batch(() => {
      setWidths(next);
      setAvailable(frame!.clientWidth);
    });
    if (focused)
      queueMicrotask(() => {
        if (
          !disposed &&
          !focused.isConnected &&
          document.activeElement === document.body
        )
          frame
            ?.querySelector<HTMLButtonElement>(
              '[data-testid="editor-ribbon-more"]',
            )
            ?.focus({ preventScroll: true });
      });
  };
  const schedule = (): void => {
    if (!disposed && raf === undefined) raf = requestAnimationFrame(measure);
  };
  onMount(() => {
    const resize = new ResizeObserver(schedule);
    resize.observe(frame!);
    const mutations = new MutationObserver(schedule);
    mutations.observe(measuring!, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const theme = new MutationObserver(schedule);
    const owner = frame!.closest("[data-theme]");
    if (owner)
      theme.observe(owner, {
        attributes: true,
        attributeFilter: ["data-theme", "class", "style"],
      });
    document.fonts?.addEventListener("loadingdone", schedule);
    schedule();
    onCleanup(() => {
      resize.disconnect();
      mutations.disconnect();
      theme.disconnect();
      document.fonts?.removeEventListener("loadingdone", schedule);
    });
  });
  createEffect(() => {
    groups();
    schedule();
  });
  onCleanup(() => {
    disposed = true;
    if (raf !== undefined) cancelAnimationFrame(raf);
  });
  const allocation = createMemo(() => {
    const current = groups();
    if (widths().length !== current.length || available() <= 0)
      return current.map(() => false);
    // Panel padding plus an icon-only menu trigger.
    return allocateTwoLineGroups(widths(), Math.max(0, available() - 16), 44);
  });
  const inline = createMemo(() =>
    groups().filter((_, index) => allocation()[index]),
  );
  const overflow = createMemo(() =>
    groups().filter((_, index) => !allocation()[index]),
  );
  return (
    <div class="oasis-editor-ribbon-two-line-frame" ref={frame}>
      <div
        class="oasis-editor-ribbon-panel oasis-editor-ribbon-two-line-panel"
        role="tabpanel"
        id={`oasis-editor-ribbon-panel-${props.activeTab()}`}
        aria-labelledby={`oasis-editor-ribbon-tab-${props.activeTab()}`}
        data-testid="editor-ribbon-panel"
        data-layout-width={available()}
      >
        <For each={inline()}>
          {(group): JSX.Element => (
            <RibbonGroup
              group={{ ...group, resizeState: "full" }}
              api={props.api}
            />
          )}
        </For>
        <Show when={overflow().length > 0}>
          <div class="oasis-editor-ribbon-more">
            <Menu
              icon="more-horizontal"
              tooltip={props.api.t("ribbon.moreOptions")}
              hideChevron
              fitViewport
              panelClass="oasis-editor-ribbon-more-menu oasis-editor-toolbar-view-ribbon"
              testId="editor-ribbon-more"
            >
              <For each={overflow()}>
                {(group): JSX.Element => (
                  <RibbonGroup
                    group={{ ...group, resizeState: "full" }}
                    api={props.api}
                  />
                )}
              </For>
            </Menu>
          </div>
        </Show>
      </div>
      <div
        ref={measuring}
        class="oasis-editor-ribbon-panel oasis-editor-ribbon-two-line-panel oasis-editor-ribbon-two-line-measure"
        aria-hidden="true"
        inert
      >
        <For each={groups()}>
          {(group): JSX.Element => (
            <RibbonGroup
              group={{ ...group, resizeState: "full" }}
              api={props.api}
            />
          )}
        </For>
      </div>
    </div>
  );
}
