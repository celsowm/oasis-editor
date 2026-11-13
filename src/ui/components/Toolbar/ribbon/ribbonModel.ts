import type {
  RibbonGroupResizePolicy,
  RibbonGroupLayout,
  RibbonGroupResizeState,
  RibbonRow,
  RibbonTabId,
  ToolbarActionApi,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import {
  CONTEXTUAL_TABS,
  RIBBON_TABS,
} from "@/ui/components/Toolbar/schema/items.js";
import type { TranslateFn, TranslationKey } from "@/i18n/index.js";

export interface RibbonTabDefinition {
  id: RibbonTabId;
  label: string;
  /** True for tabs that only appear while their gating command is active. */
  contextual: boolean;
}

export interface RibbonGroupModel {
  id: string;
  label: string;
  largeItems: ToolbarItem[];
  layout: RibbonGroupLayout;
  rows: Record<RibbonRow, ToolbarItem[]>;
  order: number;
  resizePolicy: Required<RibbonGroupResizePolicy>;
}

export interface ResolvedRibbonGroupModel extends RibbonGroupModel {
  resizeState: RibbonGroupResizeState;
  allocatedWidth?: number;
  measuredWidth?: number;
  compactChrome?: number;
}

export interface RibbonGroupWidth {
  /** Outer group width beyond a single compact style gallery. */
  compactChrome?: number;
  full: number;
  compact: number;
  collapsed: number;
}

const TAB_LABEL_KEYS: Record<RibbonTabId, TranslationKey> = {
  file: "ribbon.tab.file",
  home: "ribbon.tab.home",
  insert: "ribbon.tab.insert",
  design: "ribbon.tab.design",
  draw: "ribbon.tab.draw",
  layout: "ribbon.tab.layout",
  references: "ribbon.tab.references",
  review: "ribbon.tab.review",
  collaboration: "ribbon.tab.collaboration",
  protection: "ribbon.tab.protection",
  view: "ribbon.tab.view",
  tableDesign: "ribbon.tab.tableDesign",
  tableLayout: "ribbon.tab.tableLayout",
  imageFormat: "ribbon.tab.imageFormat",
  plugins: "ribbon.tab.plugins",
  ai: "ribbon.tab.ai",
};

const GROUP_LABEL_KEYS: Record<string, TranslationKey> = {
  clipboard: "ribbon.group.clipboard",
  history: "ribbon.group.history",
  editing: "ribbon.group.editing",
  pages: "ribbon.group.pages",
  tableOfContents: "ribbon.group.tableOfContents",
  tracking: "ribbon.group.tracking",
  comments: "ribbon.group.comments",
  changes: "ribbon.group.changes",
  show: "ribbon.group.show",
  font: "ribbon.group.font",
  paragraph: "ribbon.group.paragraph",
  styles: "ribbon.group.styles",
  illustrations: "ribbon.group.illustrations",
  symbols: "ribbon.group.symbols",
  tables: "ribbon.group.tables",
  links: "ribbon.group.links",
  headerFooter: "ribbon.group.headerFooter",
  sort: "ribbon.group.sort",
  footnotes: "ribbon.group.footnotes",
  accessibility: "ribbon.group.accessibility",
  documentFormatting: "ribbon.group.documentFormatting",
  pageBackground: "ribbon.group.pageBackground",
  document: "ribbon.group.document",
  table: "ribbon.group.table",
  section: "ribbon.group.section",
  general: "ribbon.group.general",
  tableStyleOptions: "ribbon.group.tableStyleOptions",
  tableStyles: "ribbon.group.tableStyles",
  borders: "ribbon.group.borders",
  rowsColumns: "ribbon.group.rowsColumns",
  merge: "ribbon.group.merge",
  cellSize: "ribbon.group.cellSize",
  alignment: "ribbon.group.alignment",
  size: "ribbon.group.size",
  imageStyles: "ribbon.group.imageStyles",
};

/**
 * A contextual tab (e.g. table tools) is included only when its gating command
 * reports `isActive`. Non-contextual tabs are always present. When no `api` is
 * supplied, contextual tabs are omitted (used for static/enumeration contexts).
 */
export function isRibbonTabVisible(
  id: RibbonTabId,
  api?: Pick<ToolbarActionApi, "commands">,
): boolean {
  const gatingCommand = CONTEXTUAL_TABS[id];
  if (!gatingCommand) return true;
  return api ? api.commands.state(gatingCommand).isActive : false;
}

/**
 * Resolves the tab a context snapshot should select, or `null` to keep the
 * current tab. Entering a contextual context wins over the tab the user was
 * on (Word activates the contextual tab); leaving the currently active
 * contextual context falls back to Home so a stale panel is never shown.
 *
 * Pure so the policy is testable without mounting the Toolbar: `prev` is the
 * previous snapshot, `current` the new one, both keyed by gating command.
 */
export function resolveContextualTabTransition(
  entries: readonly (readonly [RibbonTabId, string])[],
  activeTab: RibbonTabId,
  prev: ReadonlyMap<string, boolean> | undefined,
  current: ReadonlyMap<string, boolean>,
): RibbonTabId | null {
  for (const [tab, command] of entries) {
    if ((current.get(command) ?? false) && !(prev?.get(command) ?? false)) {
      return tab;
    }
  }
  const activeCommand = CONTEXTUAL_TABS[activeTab];
  if (activeCommand && !(current.get(activeCommand) ?? false)) return "home";
  return null;
}

export function buildRibbonTabDefinitions(
  t: TranslateFn,
  api?: Pick<ToolbarActionApi, "commands">,
  items?: ToolbarItem[],
): RibbonTabDefinition[] {
  return RIBBON_TABS.filter(
    (id): boolean =>
      isRibbonTabVisible(id, api) &&
      (items === undefined ||
        items.some(
          (item): boolean =>
            item.type !== "separator" && normalizeRibbonTab(item.tab) === id,
        )),
  ).map((id) => ({
    id,
    label: t(TAB_LABEL_KEYS[id]),
    contextual: CONTEXTUAL_TABS[id] !== undefined,
  }));
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
      history: 5,
      clipboard: 10,
      font: 20,
      paragraph: 30,
      styles: 40,
      editing: 50,
    },
    insert: {
      pages: 5,
      illustrations: 10,
      tables: 20,
      links: 30,
      footnotes: 40,
      accessibility: 50,
    },
    design: {
      documentFormatting: 10,
      pageBackground: 20,
    },
    layout: {
      paragraph: 10,
      table: 20,
      section: 30,
    },
    references: {
      tableOfContents: 5,
      footnotes: 10,
    },
    review: {
      tracking: 10,
      changes: 20,
      comments: 30,
    },
    view: {
      show: 10,
    },
    tableDesign: {
      tableStyleOptions: 10,
      tableStyles: 20,
      borders: 30,
    },
    tableLayout: {
      table: 10,
      rowsColumns: 20,
      merge: 30,
      sort: 35,
      cellSize: 40,
      alignment: 50,
    },
    imageFormat: {
      imageStyles: 10,
      size: 20,
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
      priority: 90,
      states: ["full", "collapsed"],
      collapsedMinWidth: 74,
      collapsedIcon: "pilcrow",
    },
    clipboard: {
      priority: 30,
      states: ["full", "compact", "collapsed"],
      collapsedMinWidth: 80,
      compactLabels: "hide",
      collapsedIcon: "clipboard",
    },
    editing: {
      priority: 20,
      compactLabels: "hide",
      collapsedIcon: "search",
    },
    history: { states: ["full"], collapsedIcon: "undo" },
    font: {
      priority: 80,
      states: ["full", "collapsed"],
      collapsedMinWidth: 74,
      collapsedIcon: "type",
    },
  },
  insert: {
    pages: { priority: 10, collapsedIcon: "file-plus" },
    illustrations: { priority: 25, collapsedIcon: "image" },
    tables: { priority: 30, collapsedIcon: "table" },
    links: { priority: 35, collapsedIcon: "link" },
    accessibility: { priority: 20, collapsedIcon: "file-text" },
    footnotes: { priority: 15, collapsedIcon: "footnote" },
  },
  design: {
    documentFormatting: { priority: 10, collapsedIcon: "palette" },
    pageBackground: { priority: 20, collapsedIcon: "paint-bucket" },
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
    tableOfContents: { priority: 10, collapsedIcon: "list" },
    footnotes: { priority: 20, collapsedIcon: "footnote" },
  },
  review: {
    tracking: { priority: 10, collapsedIcon: "file-check" },
    changes: { priority: 20, collapsedIcon: "check-check" },
  },
  view: {
    show: { priority: 10, collapsedIcon: "eye" },
  },
  tableDesign: {
    tableStyleOptions: {
      priority: 20,
      states: ["full", "collapsed"],
      collapsedIcon: "list-checks",
    },
    tableStyles: {
      priority: 10,
      states: ["full", "collapsed"],
      collapsedIcon: "table",
    },
    borders: {
      priority: 30,
      states: ["full", "collapsed"],
      collapsedIcon: "frame",
    },
  },
  tableLayout: {
    table: {
      priority: 15,
      states: ["full", "collapsed"],
      collapsedIcon: "table-properties",
    },
    rowsColumns: {
      priority: 20,
      states: ["full", "collapsed"],
      collapsedIcon: "rows",
    },
    merge: {
      priority: 30,
      states: ["full", "collapsed"],
      collapsedIcon: "combine",
    },
    sort: {
      priority: 35,
      states: ["full", "collapsed"],
      collapsedIcon: "arrow-down",
    },
    cellSize: {
      priority: 40,
      states: ["full", "collapsed"],
      collapsedIcon: "move-horizontal",
    },
    alignment: {
      priority: 50,
      states: ["full", "collapsed"],
      collapsedIcon: "align-left",
    },
  },
  imageFormat: {
    imageStyles: { priority: 30, collapsedIcon: "square" },
    size: { priority: 40, collapsedIcon: "crop" },
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
  return row === 3 ? 3 : row === 2 ? 2 : DEFAULT_RIBBON_ROW;
}

export function isLargeRibbonItem(item: ToolbarItem): boolean {
  return "ribbonSize" in item && item.ribbonSize === "large";
}

function normalizeResizeStates(
  states: RibbonGroupResizePolicy["states"],
): RibbonGroupResizeState[] {
  const source = states?.length ? states : DEFAULT_RESIZE_STATES;
  return DEFAULT_RESIZE_STATES.filter(
    (state) => state === "full" || source.includes(state),
  );
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
  // Unknown contributions must not leak camelCase/internal identifiers.
  return key ? t(key) : t("ribbon.group.general");
}

/** Filter reactive visibility before grouping, without hiding disabled actions. */
export function visibleRibbonItems(
  items: ToolbarItem[],
  api: ToolbarActionApi,
): ToolbarItem[] {
  return items.flatMap((item): ToolbarItem[] => {
    if (item.isVisible?.(api) === false) return [];
    if (item.type !== "group") return [item];
    const children = trimRibbonSeparators(visibleRibbonItems(item.items, api));
    return children.length ? [{ ...item, items: children }] : [];
  });
}

/** Separators only separate actions; they never create a group by themselves. */
function trimRibbonSeparators(items: ToolbarItem[]): ToolbarItem[] {
  const result: ToolbarItem[] = [];
  for (const item of items) {
    if (
      item.type === "separator" &&
      (!result.length || result[result.length - 1]!.type === "separator")
    )
      continue;
    result.push(item);
  }
  if (result[result.length - 1]?.type === "separator") result.pop();
  return result;
}

/**
 * True when two {@link visibleRibbonItems} results describe the same
 * composition: the same actions, in the same order, with the same nested
 * children. Group wrappers are freshly allocated on every call, so they are
 * compared by id and child identity instead of object reference. Used by the
 * toolbar to keep the item graph stable across unrelated state changes —
 * otherwise the ribbon `For` remounts every group and dismisses open popups.
 */
export function sameRibbonComposition(
  a: ToolbarItem[],
  b: ToolbarItem[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index): boolean => sameRibbonItem(item, b[index]));
}

/** One item comparison; nested groups recurse so wrappers never need identity. */
function sameRibbonItem(
  item: ToolbarItem,
  other: ToolbarItem | undefined,
): boolean {
  if (!other || item.type !== other.type || item.id !== other.id) {
    return false;
  }
  if (item.type !== "group" || other.type !== "group") return item === other;
  const left = item.items;
  const right = other.items;
  return (
    left.length === right.length &&
    left.every((child, index): boolean => sameRibbonItem(child, right[index]))
  );
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
        label: item.groupLabel?.trim() || ribbonGroupLabel(groupId, t),
        largeItems: [],
        rows: { 1: [], 2: [], 3: [] },
        layout: item.ribbonGroupLayout ?? "two-rows",
        order: groupOrder,
        resizePolicy: mergeRibbonGroupResizePolicy(
          tab,
          groupId,
          item.ribbonGroupResize,
        ),
      };
      groups.set(groupId, group);
    }
    if (item.groupLabel?.trim()) group.label = item.groupLabel.trim();
    if (item.ribbonGroupLayout) group.layout = item.ribbonGroupLayout;
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

  // A02: declarative group layouts — two-rows, three-rows, and compact.
  // An explicit `compact` contribution wins; otherwise a group with a third
  // row keeps the established three-row arrangement.
  for (const group of groups.values()) {
    if (group.layout === "compact") continue;
    if (group.rows[3].length) group.layout = "three-rows";
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rows: {
        1: trimRibbonSeparators(group.rows[1]),
        2: trimRibbonSeparators(group.rows[2]),
        3: trimRibbonSeparators(group.rows[3]),
      },
    }))
    .filter(
      (group) =>
        group.largeItems.length +
          group.rows[1].length +
          group.rows[2].length +
          group.rows[3].length >
        0,
    )
    .sort((a, b): number => a.order - b.order);
}

function estimatedRibbonGroupWidths(group: RibbonGroupModel): RibbonGroupWidth {
  const normalCount =
    group.rows[1].length + group.rows[2].length + group.rows[3].length;
  const largeCount = group.largeItems.length;
  const full = Math.max(
    group.resizePolicy.collapsedMinWidth,
    largeCount * 72 +
      Math.max(
        group.rows[1].length,
        group.rows[2].length,
        group.rows[3].length,
      ) *
        30,
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

/**
 * Resolve from a fixed reduction ladder. There is no history-dependent repair
 * pass: reducing the budget cannot restore a group by collapsing a neighbour.
 * Compact states precede collapse; explicit priority then right-to-left order
 * determines each step. Measured widths include the group's own chrome.
 */
export function resolveResponsiveRibbonGroups(
  groups: RibbonGroupModel[],
  availableWidth: number | null,
  measurements: Partial<Record<string, Partial<RibbonGroupWidth>>> = {},
): ResolvedRibbonGroupModel[] {
  const widths = new Map<string, RibbonGroupWidth>();
  const states = new Map<string, RibbonGroupResizeState>();
  for (const group of groups) {
    const estimate = estimatedRibbonGroupWidths(group);
    const measured = measurements[group.id] ?? {};
    const validWidth = (value: number | undefined, fallback: number): number =>
      value !== undefined && Number.isFinite(value) && value > 0
        ? Math.ceil(value)
        : fallback;
    const full = validWidth(measured.full, estimate.full);
    widths.set(group.id, {
      full,
      compactChrome: measured.compactChrome ?? 11,
      compact: Math.min(
        full,
        validWidth(
          measured.compact,
          Math.max(group.resizePolicy.compactMinWidth, estimate.compact),
        ),
      ),
      collapsed: validWidth(
        measured.collapsed,
        group.resizePolicy.collapsedMinWidth,
      ),
    });
    states.set(group.id, "full");
  }
  const budget =
    availableWidth !== null && Number.isFinite(availableWidth)
      ? Math.max(0, availableWidth)
      : Number.POSITIVE_INFINITY;
  let total = groups.reduce(
    (sum, group) => sum + widths.get(group.id)!.full,
    0,
  );
  while (total > budget) {
    const candidates = groups
      .flatMap((group) => {
        const current = states.get(group.id)!;
        const legal = group.resizePolicy.states;
        const currentWidth = widths.get(group.id)![current];
        // Skip states that do not save space; a compact layout can legitimately
        // be the same width as full while its collapsed trigger is much smaller.
        const next = legal
          .slice(legal.indexOf(current) + 1)
          .find((state) => widths.get(group.id)![state] < currentWidth);
        return next
          ? [
              {
                group,
                next,
                saving: currentWidth - widths.get(group.id)![next],
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          Number(a.next === "collapsed") - Number(b.next === "collapsed") ||
          a.group.resizePolicy.priority - b.group.resizePolicy.priority ||
          b.group.order - a.group.order ||
          a.group.id.localeCompare(b.group.id),
      );
    const reduction = candidates[0];
    if (!reduction) break;
    states.set(reduction.group.id, reduction.next);
    total -= reduction.saving;
  }
  const totalFull = groups.reduce(
    (sum, group) => sum + widths.get(group.id)!.full,
    0,
  );
  return groups.map((group) => {
    const state = states.get(group.id)!;
    const measured = widths.get(group.id)!;
    let allocated = measured[state];
    if (
      state === "compact" &&
      group.largeItems.some((item) => item.type === "styleGallery")
    ) {
      // Grow whole cards only out of room available with every other group
      // full. Collapsing a neighbour must never buy the gallery extra cards.
      const ceiling = Math.min(
        measured.full,
        budget - (totalFull - measured.full),
      );
      const chrome =
        STYLE_GALLERY_EXPAND_WIDTH +
        STYLE_GALLERY_BORDER_WIDTH +
        (measured.compactChrome ?? 11);
      const wholeCards = Math.floor(
        (ceiling - chrome) / STYLE_GALLERY_CARD_WIDTH,
      );
      if (wholeCards > 0)
        allocated = Math.max(
          allocated,
          Math.min(ceiling, wholeCards * STYLE_GALLERY_CARD_WIDTH + chrome),
        );
    }
    return {
      ...group,
      resizeState: state,
      allocatedWidth: state === "compact" ? allocated : undefined,
      measuredWidth: allocated,
      compactChrome: measured.compactChrome,
    };
  });
}
