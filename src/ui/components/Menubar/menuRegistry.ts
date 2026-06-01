import type { TranslationKey } from "../../../i18n/index.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";

export interface MenuItem {
  id: string;
  path: string; // e.g., "File/New"
  command?: string;
  labelKey?: TranslationKey; // e.g., "menu.file.new"
  icon?: string | ((ctx: EditorToolbarCtx) => string);
  action?: (ctx: EditorToolbarCtx) => void | Promise<void>;
  shortcut?: string;
  order?: number;
  when?: () => boolean;
  separator?: boolean;
  hidden?: boolean;
}

export class MenuRegistry {
  private items: MenuItem[] = [];

  register(item: MenuItem) {
    const existingIndex = this.items.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
    this.items.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }

  unregister(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  getItems(): MenuItem[] {
    return [...this.items];
  }
}

export const defaultMenuRegistry = new MenuRegistry();
