import { t } from "../../../i18n/index.js";

export interface ToolbarItem {
  id: string;
  type: "button" | "dropdown" | "separator";
  icon?: string;
  labelKey?: string;
  tooltip?: string;
  group?: string;
  onClick?: (ctx: any) => void;
  children?: ToolbarItem[];
  disabled?: (ctx: any) => boolean;
}

export class ToolbarRegistry {
  private items: ToolbarItem[] = [];

  register(item: ToolbarItem) {
    this.items.push(item);
  }

  getItems(): ToolbarItem[] {
    return this.items;
  }
}

export const defaultToolbarRegistry = new ToolbarRegistry();
