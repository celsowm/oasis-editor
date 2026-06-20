import type { CommandBus } from "@/core/commands/CommandBus.js";
import type { CommandRef } from "@/core/commands/CommandRef.js";
import type { TranslationKey } from "@/i18n/index.js";
import type { ToolbarCommandState } from "@/ui/components/Toolbar/schema/items.js";

/** Narrow host the menubar dispatches through — the command registry. */
export interface MenubarHost {
  commands: CommandBus<ToolbarCommandState>;
}

export interface MenuItem {
  id: string;
  path: string; // e.g., "File/New"
  command?: CommandRef;
  labelKey?: TranslationKey; // e.g., "menu.file.new"
  icon?: string | ((host: MenubarHost) => string);
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
    this.items.sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER),
    );
  }

  unregister(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  getItems(): MenuItem[] {
    return [...this.items];
  }
}
