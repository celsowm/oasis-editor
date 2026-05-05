import type { TranslationKey } from "../../../i18n/index.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";

export interface MenuItem {
  id: string;
  path: string; // e.g., "File/New"
  labelKey?: TranslationKey; // e.g., "menu.file.new"
  icon?: string;
  action?: (ctx: EditorToolbarCtx) => void | Promise<void>;
  shortcut?: string;
  when?: () => boolean;
  separator?: boolean;
  hidden?: boolean;
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
