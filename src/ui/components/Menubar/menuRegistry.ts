import type { TranslationKey } from "../../../i18n/index.js";

export interface MenuItem {
  id: string;
  path: string; // e.g., "File/New"
  labelKey?: TranslationKey; // e.g., "menu.file.new"
  command?: string; // ID in EditorCommandRegistry or general identifier
  action?: (ctx: any) => void; // Direct action to run with context
  shortcut?: string;
  when?: () => boolean;
  separator?: boolean;
}

export class MenuRegistry {
  private items: MenuItem[] = [];

  register(item: MenuItem) {
    this.items.push(item);
  }

  unregister(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  getItems(): MenuItem[] {
    return this.items;
  }
}

export const defaultMenuRegistry = new MenuRegistry();
