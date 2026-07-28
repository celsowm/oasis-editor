import type { CommandBus } from "@/core/commands/CommandBus.js";
import type { CommandRef } from "@/core/commands/CommandRef.js";
import type { TranslationKey } from "@/i18n/index.js";
import type { ToolbarCommandState } from "@/ui/components/Toolbar/schema/items.js";

/** Narrow host the menubar dispatches through — the command registry. */
export interface MenubarHost {
  commands: CommandBus<ToolbarCommandState>;
}

/** Descriptor for a single menu item in the menubar. */
export interface MenuItem {
  id: string;
  path: string;
  command?: CommandRef;
  labelKey?: TranslationKey;
  icon?: string | ((host: MenubarHost) => string);
  shortcut?: string;
  order?: number;
  when?: () => boolean;
  separator?: boolean;
  hidden?: boolean;
}

/** Registry for managing menubar items with registration, update, and query. */
export class MenuRegistry {
  private items: MenuItem[] = [];

  /**
   * Registers or updates a menu item by id.
   * @param item - The menu item to register.
   */
  register(item: MenuItem): void {
    const existingIndex = this.items.findIndex(
      (entry): boolean => entry.id === item.id,
    );
    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
    this.items.sort(
      (a, b): number =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER),
    );
  }

  /**
   * Removes a menu item by id.
   * @param id - The id of the item to remove.
   */
  unregister(id: string): void {
    this.items = this.items.filter((i): boolean => i.id !== id);
  }

  /** @returns A copy of all registered menu items. */
  getItems(): MenuItem[] {
    return [...this.items];
  }
}
