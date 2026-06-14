import type {
  RibbonRow,
  RibbonTabId,
  ToolbarItem,
} from "../schema/items.js";
import { RIBBON_TABS } from "../schema/items.js";

export interface RibbonTabDefinition {
  id: RibbonTabId;
  label: string;
}

export interface RibbonGroupModel {
  id: string;
  label: string;
  rows: Record<RibbonRow, ToolbarItem[]>;
  order: number;
}

const TAB_LABELS: Record<RibbonTabId, string> = {
  file: "File",
  home: "Home",
  insert: "Insert",
  draw: "Draw",
  layout: "Layout",
  references: "References",
  collaboration: "Collaboration",
  protection: "Protection",
  view: "View",
  plugins: "Plugins",
  ai: "AI",
};

export const RIBBON_TAB_DEFINITIONS: RibbonTabDefinition[] = RIBBON_TABS.map(
  (id) => ({ id, label: TAB_LABELS[id] }),
);

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

export function normalizeRibbonTab(tab: ToolbarItem["tab"]): RibbonTabId {
  return tab ?? DEFAULT_RIBBON_TAB;
}

export function normalizeRibbonGroup(group: ToolbarItem["group"]): string {
  return group?.trim() || DEFAULT_RIBBON_GROUP;
}

export function normalizeRibbonRow(row: ToolbarItem["row"]): RibbonRow {
  return row === 2 ? 2 : DEFAULT_RIBBON_ROW;
}

export function ribbonGroupLabel(group: string): string {
  return group
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildRibbonGroups(
  items: ToolbarItem[],
  tab: RibbonTabId,
): RibbonGroupModel[] {
  const groups = new Map<string, RibbonGroupModel>();
  const tabGroupOrder = RIBBON_GROUP_ORDER[tab] ?? {};

  items.forEach((item, index) => {
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
        label: ribbonGroupLabel(groupId),
        rows: { 1: [], 2: [] },
        order: groupOrder,
      };
      groups.set(groupId, group);
    }
    group.order = Math.min(group.order, groupOrder);
    group.rows[row].push(item);
  });

  return Array.from(groups.values()).sort((a, b) => a.order - b.order);
}
