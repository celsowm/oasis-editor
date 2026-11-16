import {
  For,
  Show,
  createEffect,
  batch,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
  type JSX,
} from "solid-js";
import type {
  RibbonTabId,
  ToolbarActionApi,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import {
  buildRibbonGroups,
  resolveResponsiveRibbonGroups,
  visibleRibbonItems,
  sameRibbonComposition,
} from "./ribbonModel.js";
import type { RibbonGroupModel, RibbonGroupWidth } from "./ribbonModel.js";
import { Button } from "../primitives/Button.js";
import { RibbonGroup } from "./RibbonGroup.js";
import { measureRibbonGroups } from "./measureRibbonGroups.js";

export interface RibbonPanelProps {
  activeTab: Accessor<RibbonTabId>;
  items: Accessor<ToolbarItem[]>;
  api: ToolbarActionApi;
}

export function RibbonPanel(props: RibbonPanelProps): JSX.Element {
  const [availableWidth, setAvailableWidth] = createSignal<number | null>(null);
  const [measurement, setMeasurement] = createSignal<{
    groups: RibbonGroupModel[];
    widths: Record<string, RibbonGroupWidth>;
  }>();
  let frameRef: HTMLDivElement | undefined;
  let panelRef: HTMLDivElement | undefined;
  let frame: number | undefined;
  let disposed = false;
  // Preserve the composition across unrelated command-state updates.
  const visibleItems = createMemo(
    () => visibleRibbonItems(props.items(), props.api),
    [] as ToolbarItem[],
    { equals: sameRibbonComposition },
  );
  const groups = createMemo(() =>
    buildRibbonGroups(visibleItems(), props.activeTab(), props.api.t),
  );
  // Measurements belong to a composition, not a group ID shared across tabs.
  // A newly translated/reconfigured group never sees another context's widths.
  const widths = createMemo(() =>
    measurement()?.groups === groups() ? measurement()!.widths : {},
  );
  const hasMeasurements = createMemo(() =>
    measurement()?.groups === groups() &&
    groups().every(group => {
      const width = widths()[group.id];
      return !!width && width.full > 0 && width.compact > 0 && width.collapsed > 0;
    }),
  );
  const overflow = createMemo(
    () =>
      availableWidth() !== null &&
      resolveResponsiveRibbonGroups(groups(), 0, widths()).reduce(
        (sum, group) => sum + (group.measuredWidth ?? 0),
        0,
      ) > availableWidth()!,
  );
  const resolvedGroups = createMemo(() =>
    resolveResponsiveRibbonGroups(
      groups(),
      availableWidth() === null
        ? null
        : Math.max(0, availableWidth()! - (overflow() ? 56 : 0)),
      widths(),
    ),
  );
  const measure = (): void => {
    frame = undefined;
    const panel = panelRef;
    if (!panel || disposed) return;
    const current = groups();
    const next = measureRibbonGroups(panel, current);
    const previous = measurement();
    const style = getComputedStyle(panel);
    const available = Math.max(0, frameRef!.clientWidth -
      parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    // Widths and budget belong to one atomic layout snapshot.
    batch(() => {
      if (
        previous?.groups !== current ||
        JSON.stringify(previous.widths) !== JSON.stringify(next)
      ) setMeasurement({ groups: current, widths: next });
      setAvailableWidth(available);
    });
  };
  const scheduleMeasure = (): void => {
    if (frame === undefined && !disposed)
      frame = requestAnimationFrame(measure);
  };
  onMount((): void => {
    const panel = panelRef!;
    const resize = new ResizeObserver(scheduleMeasure);
    resize.observe(frameRef!);
    const content = new MutationObserver(scheduleMeasure);
    content.observe(panel, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const theme = new MutationObserver(scheduleMeasure);
    const owner = panel.closest("[data-theme]");
    if (owner)
      theme.observe(owner, {
        attributes: true,
        attributeFilter: ["data-theme", "class", "style"],
      });
    document.fonts?.addEventListener("loadingdone", scheduleMeasure);
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();
    onCleanup((): void => {
      resize.disconnect();
      content.disconnect();
      theme.disconnect();
      document.fonts?.removeEventListener("loadingdone", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    });
  });
  createEffect((): void => {
    groups();
    scheduleMeasure();
  });
  onCleanup((): void => {
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return (
    <div class="oasis-editor-ribbon-panel-frame" ref={frameRef}>
      <Show when={overflow()}>
        <Button
          type="button"
          class="oasis-editor-ribbon-scroll-button"
          aria-label={props.api.t("ribbon.scrollPrevious")}
          onClick={() =>
            panelRef?.scrollBy({
              left: -Math.max(160, panelRef.clientWidth * 0.8),
              behavior: "smooth",
            })
          }
        >
          ‹
        </Button>
      </Show>
      <div
        ref={panelRef}
        class="oasis-editor-ribbon-panel"
        classList={{ "oasis-editor-ribbon-panel-overflow": overflow() }}
        tabIndex={overflow() ? 0 : undefined}
        data-ribbon-overflow={overflow()}
        data-ribbon-measured={hasMeasurements() ? "true" : "false"}
        role="tabpanel"
        id={`oasis-editor-ribbon-panel-${props.activeTab()}`}
        aria-labelledby={`oasis-editor-ribbon-tab-${props.activeTab()}`}
        data-testid="editor-ribbon-panel"
      >
        <For each={groups()}>
          {(group): JSX.Element => (
            <RibbonGroup
              group={resolvedGroups().find(
                (candidate) => candidate.id === group.id,
              ) ?? { ...group, resizeState: "full" }}
              api={props.api}
              measurements={widths()[group.id]}
            />
          )}
        </For>
      </div>
      <Show when={overflow()}>
        <Button
          type="button"
          class="oasis-editor-ribbon-scroll-button"
          aria-label={props.api.t("ribbon.scrollNext")}
          onClick={() =>
            panelRef?.scrollBy({
              left: Math.max(160, panelRef.clientWidth * 0.8),
              behavior: "smooth",
            })
          }
        >
          ›
        </Button>
      </Show>
    </div>
  );
}
