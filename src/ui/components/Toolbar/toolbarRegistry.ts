import { t } from "../../../i18n/index.js";

export interface ToolbarItem {
  id: string;
  type: "button" | "dropdown" | "separator";
  command?: string;
  icon?: string;
  labelKey?: string;
  tooltip?: string;
  group?: string;
  order?: number;
  onClick?: (ctx: any) => void;
  children?: ToolbarItem[];
  disabled?: (ctx: any) => boolean;
}

export class ToolbarRegistry {
  private items: ToolbarItem[] = [];

  register(item: ToolbarItem) {
    const existingIndex = this.items.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
    this.items.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }

  unregister(id: string) {
    this.items = this.items.filter((item) => item.id !== id);
  }

  getItems(): ToolbarItem[] {
    return [...this.items];
  }
}

export const defaultToolbarRegistry = new ToolbarRegistry();
