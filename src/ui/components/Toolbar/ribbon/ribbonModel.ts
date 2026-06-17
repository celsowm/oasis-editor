import type {
  RibbonRow,
  RibbonTabId,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import { RIBBON_TABS } from "@/ui/components/Toolbar/schema/items.js";
import { t } from "@/i18n/index.js";

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

const TAB_LABEL_KEYS: Record<RibbonTabId, string> = {
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

const GROUP_LABEL_KEYS: Record<string, string> = {
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

export const RIBBON_TAB_DEFINITIONS: RibbonTabDefinition[] = RIBBON_TABS.map(
  (id) => ({ id, label: t(TAB_LABEL_KEYS[id] as any) }),
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
  return t((GROUP_LABEL_KEYS[group] ?? group) as any);
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
