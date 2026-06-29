import {
  For,
  createEffect,
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
  type RibbonGroupWidth,
} from "./ribbonModel.js";
import { RibbonGroup } from "./RibbonGroup.js";
import type { RibbonGroupModel, ResolvedRibbonGroupModel } from "@/ui/components/Toolbar/ribbon/ribbonModel.js";

export interface RibbonPanelProps {
  activeTab: Accessor<RibbonTabId>;
  items: Accessor<ToolbarItem[]>;
  api: ToolbarActionApi;
}

export function RibbonPanel(props: RibbonPanelProps): JSX.Element {
  const [availableWidth, setAvailableWidth] = createSignal<number | null>(null);
  const [measurements, setMeasurements] = createSignal<
    Record<string, Partial<RibbonGroupWidth>>
  >({});
  let panelRef: HTMLDivElement | undefined;

  const groups = createMemo((): RibbonGroupModel[] =>
    buildRibbonGroups(props.items(), props.activeTab(), props.api.t),
  );
  const resolvedGroups = createMemo((): ResolvedRibbonGroupModel[] =>
    resolveResponsiveRibbonGroups(groups(), availableWidth(), measurements()),
  );

  const measureGroups = (): void => {
    const panel = panelRef;
    if (!panel) return;
    const panelBox = panel.getBoundingClientRect();
    const nextMeasurements: Record<string, Partial<RibbonGroupWidth>> = {
      ...measurements(),
    };
    for (const el of Array.from(
      panel.querySelectorAll<HTMLElement>("[data-ribbon-group]"),
    )) {
      const id = el.dataset.ribbonGroup;
      if (!id || el.dataset.ribbonState !== "full") continue;
      const width = Math.ceil(el.getBoundingClientRect().width);
      if (width > 0) {
        nextMeasurements[id] = {
          ...nextMeasurements[id],
          full: Math.max(nextMeasurements[id]?.full ?? 0, width),
        };
      }
    }
    setMeasurements(nextMeasurements);
    setAvailableWidth(Math.floor(panelBox.width));
  };

  onMount((): void => {
    const panel = panelRef;
    if (!panel) return;
    const observer = new ResizeObserver((): void => {
      requestAnimationFrame(measureGroups);
    });
    observer.observe(panel);
    requestAnimationFrame(measureGroups);
    onCleanup((): void => observer.disconnect());
  });

  createEffect((): void => {
    props.activeTab();
    props.items();
    requestAnimationFrame(measureGroups);
  });

  return (
    <div
      ref={panelRef}
      class="oasis-editor-ribbon-panel"
      role="tabpanel"
      id={`oasis-editor-ribbon-panel-${props.activeTab()}`}
      aria-labelledby={`oasis-editor-ribbon-tab-${props.activeTab()}`}
      data-testid="editor-ribbon-panel"
    >
      <For each={resolvedGroups()}>
        {(group): JSX.Element => <RibbonGroup group={group} api={props.api} />}
      </For>
    </div>
  );
}
