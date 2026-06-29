import type {
  RibbonGroupResizePolicy,
  RibbonGroupResizeState,
  RibbonRow,
  RibbonTabId,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import { RIBBON_TABS } from "@/ui/components/Toolbar/schema/items.js";
import type { TranslateFn, TranslationKey } from "@/i18n/index.js";

export interface RibbonTabDefinition {
  id: RibbonTabId;
  label: string;
}

export interface RibbonGroupModel {
  id: string;
  label: string;
  largeItems: ToolbarItem[];
  rows: Record<RibbonRow, ToolbarItem[]>;
  order: number;
  resizePolicy: Required<RibbonGroupResizePolicy>;
}

export interface ResolvedRibbonGroupModel extends RibbonGroupModel {
  resizeState: RibbonGroupResizeState;
  allocatedWidth?: number;
}

export interface RibbonGroupWidth {
  full: number;
  compact: number;
  collapsed: number;
}

const TAB_LABEL_KEYS: Record<RibbonTabId, TranslationKey> = {
  file: "ribbon.tab.file",
  home: "ribbon.tab.home",
  insert: "ribbon.tab.insert",
  draw: "ribbon.tab.draw",
  layout: "ribbon.tab.layout",
  references: "ribbon.tab.references",
  collaboration: "ribbon.tab.collaboration",
  protection: "ribbon.tab.protection",
  view: "ribbon.tab.view",
  plugins: "ribbon.tab.plugins",
  ai: "ribbon.tab.ai",
};

const GROUP_LABEL_KEYS: Record<string, TranslationKey> = {
  clipboard: "ribbon.group.clipboard",
  font: "ribbon.group.font",
  paragraph: "ribbon.group.paragraph",
  styles: "ribbon.group.styles",
  illustrations: "ribbon.group.illustrations",
  tables: "ribbon.group.tables",
  links: "ribbon.group.links",
  footnotes: "ribbon.group.footnotes",
  accessibility: "ribbon.group.accessibility",
  document: "ribbon.group.document",
  table: "ribbon.group.table",
  section: "ribbon.group.section",
  general: "ribbon.group.general",
};

export function buildRibbonTabDefinitions(
  t: TranslateFn,
): RibbonTabDefinition[] {
  return RIBBON_TABS.map((id) => ({ id, label: t(TAB_LABEL_KEYS[id]) }));
}

export const DEFAULT_RIBBON_TAB: RibbonTabId = "plugins";
export const DEFAULT_RIBBON_GROUP = "general";
export const DEFAULT_RIBBON_ROW: RibbonRow = 1;

const RIBBON_GROUP_ORDER: Partial<Record<RibbonTabId, Record<string, number>>> =
  {
    file: {
      document: 10,
    },
    home: {
      clipboard: 10,
      font: 20,
      paragraph: 30,
      styles: 40,
    },
    insert: {
      illustrations: 10,
      tables: 20,
      links: 30,
      footnotes: 40,
      accessibility: 50,
    },
    layout: {
      paragraph: 10,
      table: 20,
      section: 30,
    },
    references: {
      footnotes: 10,
    },
    plugins: {
      general: 10,
    },
  };

const DEFAULT_RESIZE_STATES: RibbonGroupResizeState[] = [
  "full",
  "compact",
  "collapsed",
];

const DEFAULT_GROUP_RESIZE_POLICY: Required<RibbonGroupResizePolicy> = {
  states: DEFAULT_RESIZE_STATES,
  priority: 50,
  compactMinWidth: 96,
  collapsedMinWidth: 68,
  collapsedIcon: "ellipsis",
  compactLabels: "show",
};

const STYLE_GALLERY_CARD_WIDTH = 106;
const STYLE_GALLERY_EXPAND_WIDTH = 24;
const STYLE_GALLERY_BORDER_WIDTH = 2;

const RIBBON_GROUP_RESIZE_DEFAULTS: Partial<
  Record<RibbonTabId, Record<string, RibbonGroupResizePolicy>>
> = {
  home: {
    styles: {
      priority: 10,
      states: ["full", "compact", "collapsed"],
      compactMinWidth: 132,
      collapsedIcon: "palette",
    },
    paragraph: {
      priority: 15,
      states: ["full", "collapsed"],
      collapsedMinWidth: 74,
      collapsedIcon: "pilcrow",
    },
    clipboard: {
      priority: 20,
      states: ["full", "collapsed"],
      collapsedIcon: "clipboard",
    },
    font: {
      priority: 30,
      states: ["full", "collapsed"],
      collapsedMinWidth: 74,
      collapsedIcon: "type",
    },
  },
  insert: {
    illustrations: { priority: 25, collapsedIcon: "image" },
    tables: { priority: 30, collapsedIcon: "table" },
    links: { priority: 35, collapsedIcon: "link" },
    accessibility: { priority: 20, collapsedIcon: "file-text" },
    footnotes: { priority: 15, collapsedIcon: "footnote" },
  },
  layout: {
    paragraph: { priority: 30, compactMinWidth: 112, collapsedIcon: "ruler" },
    table: { priority: 20, collapsedIcon: "table" },
    section: { priority: 40, compactMinWidth: 148, collapsedIcon: "layout" },
  },
  file: {
    document: { priority: 10, collapsedIcon: "file" },
  },
  references: {
    footnotes: { priority: 10, collapsedIcon: "footnote" },
  },
  plugins: {
    general: { priority: 50, collapsedIcon: "plug" },
  },
};

export function normalizeRibbonTab(tab: ToolbarItem["tab"]): RibbonTabId {
  return tab ?? DEFAULT_RIBBON_TAB;
}

export function normalizeRibbonGroup(group: ToolbarItem["group"]): string {
  return group?.trim() || DEFAULT_RIBBON_GROUP;
}

export function normalizeRibbonRow(row: ToolbarItem["row"]): RibbonRow {
  return row === 2 ? 2 : DEFAULT_RIBBON_ROW;
}

export function isLargeRibbonItem(item: ToolbarItem): boolean {
  return "ribbonSize" in item && item.ribbonSize === "large";
}

function normalizeResizeStates(
  states: RibbonGroupResizePolicy["states"],
): RibbonGroupResizeState[] {
  const source = states?.length ? states : DEFAULT_RESIZE_STATES;
  const unique = source.filter(
    (state, index): boolean => source.indexOf(state) === index,
  );
  return unique.includes("full") ? unique : ["full", ...unique];
}

function mergeRibbonGroupResizePolicy(
  tab: RibbonTabId,
  group: string,
  itemPolicy?: RibbonGroupResizePolicy,
): Required<RibbonGroupResizePolicy> {
  const tabDefaults = RIBBON_GROUP_RESIZE_DEFAULTS[tab]?.[group] ?? {};
  const merged = {
    ...DEFAULT_GROUP_RESIZE_POLICY,
    ...tabDefaults,
    ...itemPolicy,
  };
  return {
    states: normalizeResizeStates(merged.states),
    priority: merged.priority ?? DEFAULT_GROUP_RESIZE_POLICY.priority,
    compactMinWidth:
      merged.compactMinWidth ?? DEFAULT_GROUP_RESIZE_POLICY.compactMinWidth,
    collapsedMinWidth:
      merged.collapsedMinWidth ?? DEFAULT_GROUP_RESIZE_POLICY.collapsedMinWidth,
    collapsedIcon:
      merged.collapsedIcon ?? DEFAULT_GROUP_RESIZE_POLICY.collapsedIcon,
    compactLabels:
      merged.compactLabels ?? DEFAULT_GROUP_RESIZE_POLICY.compactLabels,
  };
}

export function ribbonGroupLabel(group: string, t: TranslateFn): string {
  const key = GROUP_LABEL_KEYS[group];
  return key ? t(key) : group;
}

export function buildRibbonGroups(
  items: ToolbarItem[],
  tab: RibbonTabId,
  t: TranslateFn,
): RibbonGroupModel[] {
  const groups = new Map<string, RibbonGroupModel>();
  const tabGroupOrder = RIBBON_GROUP_ORDER[tab] ?? {};

  items.forEach((item, index): void => {
    if (normalizeRibbonTab(item.tab) !== tab) {
      return;
    }
    const groupId = normalizeRibbonGroup(item.group);
    const row = normalizeRibbonRow(item.row);
    const groupOrder = tabGroupOrder[groupId] ?? item.order ?? index;
    let group = groups.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        label: ribbonGroupLabel(groupId, t),
        largeItems: [],
        rows: { 1: [], 2: [] },
        order: groupOrder,
        resizePolicy: mergeRibbonGroupResizePolicy(
          tab,
          groupId,
          item.ribbonGroupResize,
        ),
      };
      groups.set(groupId, group);
    }
    group.order = Math.min(group.order, groupOrder);
    group.resizePolicy = {
      ...group.resizePolicy,
      ...Object.fromEntries(
        Object.entries(item.ribbonGroupResize ?? {}).filter(
          ([, value]): boolean => value !== undefined,
        ),
      ),
      states: normalizeResizeStates(
        item.ribbonGroupResize?.states ?? group.resizePolicy.states,
      ),
    };
    if (isLargeRibbonItem(item)) {
      group.largeItems.push(item);
    } else {
      group.rows[row].push(item);
    }
  });

  return Array.from(groups.values()).sort((a, b): number => a.order - b.order);
}

function estimatedRibbonGroupWidths(group: RibbonGroupModel): RibbonGroupWidth {
  const normalCount = group.rows[1].length + group.rows[2].length;
  const largeCount = group.largeItems.length;
  const full = Math.max(
    group.resizePolicy.collapsedMinWidth,
    largeCount * 72 + Math.max(group.rows[1].length, group.rows[2].length) * 30,
  );
  return {
    full,
    compact: Math.max(
      group.resizePolicy.compactMinWidth,
      Math.ceil(full * (largeCount > 0 || normalCount > 6 ? 0.72 : 0.84)),
    ),
    collapsed: group.resizePolicy.collapsedMinWidth,
  };
}

function widthForState(
  state: RibbonGroupResizeState,
  widths: RibbonGroupWidth,
): number {
  return widths[state];
}

function widthForResolvedState(
  group: RibbonGroupModel,
  state: RibbonGroupResizeState,
  widths: RibbonGroupWidth,
  allocatedWidths: Map<string, number>,
): number {
  return state === "compact"
    ? (allocatedWidths.get(group.id) ?? widths.compact)
    : widthForState(state, widths);
}

function snapCompactWidthToWholeItems(
  group: RibbonGroupModel,
  desiredWidth: number,
  minWidth: number,
  maxWidth: number,
): number {
  if (group.id !== "styles") {
    return Math.min(maxWidth, Math.max(minWidth, desiredWidth));
  }
  const chromeWidth = STYLE_GALLERY_EXPAND_WIDTH + STYLE_GALLERY_BORDER_WIDTH;
  if (maxWidth < STYLE_GALLERY_CARD_WIDTH + chromeWidth) {
    return Math.min(maxWidth, Math.max(minWidth, desiredWidth));
  }
  const cardSlots = Math.max(
    1,
    Math.floor((desiredWidth - chromeWidth) / STYLE_GALLERY_CARD_WIDTH),
  );
  const snapped = cardSlots * STYLE_GALLERY_CARD_WIDTH + chromeWidth;
  return Math.min(maxWidth, Math.max(minWidth, snapped));
}

export function resolveResponsiveRibbonGroups(
  groups: RibbonGroupModel[],
  availableWidth: number | null,
  measurements: Partial<Record<string, Partial<RibbonGroupWidth>>> = {},
): ResolvedRibbonGroupModel[] {
  const states = new Map<string, RibbonGroupResizeState>();
  const widths = new Map<string, RibbonGroupWidth>();
  const allocatedWidths = new Map<string, number>();

  for (const group of groups) {
    const estimated = estimatedRibbonGroupWidths(group);
    const measured = measurements[group.id] ?? {};
    const full = Math.max(
      estimated.full,
      Math.ceil(measured.full ?? estimated.full),
    );
    widths.set(group.id, {
      full,
      compact: Math.min(
        full,
        Math.max(
          group.resizePolicy.compactMinWidth,
          Math.ceil(measured.compact ?? estimated.compact),
        ),
      ),
      collapsed: Math.min(
        full,
        Math.max(
          group.resizePolicy.collapsedMinWidth,
          Math.ceil(measured.collapsed ?? estimated.collapsed),
        ),
      ),
    });
    states.set(group.id, "full");
  }

  if (availableWidth !== null && Number.isFinite(availableWidth)) {
    let currentWidth = groups.reduce(
      (sum, group): number => sum + widthForState("full", widths.get(group.id)!),
      0,
    );
    const targetWidth = Math.max(0, availableWidth);

    while (currentWidth > targetWidth) {
      const candidates = groups
        .map((group) => {
          const groupStates = group.resizePolicy.states;
          const currentState = states.get(group.id) ?? "full";
          const currentIndex = groupStates.indexOf(currentState);
          const nextState =
            currentIndex >= 0 ? groupStates[currentIndex + 1] : undefined;
          if (!nextState) return null;
          const groupWidths = widths.get(group.id)!;
          const currentWidth = widthForResolvedState(
            group,
            currentState,
            groupWidths,
            allocatedWidths,
          );
          const saving = currentWidth - widthForState(nextState, groupWidths);
          return saving > 0
            ? { group, nextState, saving, currentState, currentIndex }
            : null;
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> =>
          Boolean(candidate),
        )
        .sort(
          (a, b): number =>
            a.currentIndex - b.currentIndex ||
            b.group.order - a.group.order ||
            a.group.resizePolicy.priority - b.group.resizePolicy.priority ||
            b.saving - a.saving,
        );

      const next = candidates[0];
      if (!next) break;
      const groupWidths = widths.get(next.group.id)!;
      const currentStateWidth = widthForResolvedState(
        next.group,
        next.currentState,
        groupWidths,
        allocatedWidths,
      );
      const deficit = currentWidth - targetWidth;
      const nextStateWidth =
        next.nextState === "compact"
          ? snapCompactWidthToWholeItems(
              next.group,
              currentStateWidth - deficit,
              groupWidths.compact,
              groupWidths.full,
            )
          : widthForState(next.nextState, groupWidths);
      const actualSaving = currentStateWidth - nextStateWidth;
      states.set(next.group.id, next.nextState);
      if (next.nextState === "compact") {
        allocatedWidths.set(next.group.id, nextStateWidth);
      } else {
        allocatedWidths.delete(next.group.id);
      }
      currentWidth -= actualSaving;
    }

    let slack = targetWidth - currentWidth;
    if (slack > 0) {
      for (const group of groups
        .filter((candidate): boolean => states.get(candidate.id) === "compact")
        .sort(
          (a, b): number =>
            b.order - a.order ||
            a.resizePolicy.priority - b.resizePolicy.priority,
        )) {
        const groupWidths = widths.get(group.id)!;
        const compactWidth = groupWidths.compact;
        const maxExtra = groupWidths.full - compactWidth;
        if (maxExtra <= 0) continue;
        const allocated = snapCompactWidthToWholeItems(
          group,
          compactWidth + slack,
          compactWidth,
          groupWidths.full,
        );
        const consumed = allocated - compactWidth;
        if (consumed <= 0) continue;
        allocatedWidths.set(group.id, allocated);
        slack -= consumed;
        if (slack <= 0) break;
      }
    }
  }

  return groups.map((group) => ({
    ...group,
    resizeState: states.get(group.id) ?? "full",
    allocatedWidth: allocatedWidths.get(group.id),
  }));
}
