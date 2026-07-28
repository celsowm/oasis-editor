import type { ToolbarItem } from "@/ui/components/Toolbar/schema/items.js";

/** Target for moving a toolbar item: an absolute index or relative to another item. */
export type ToolbarMoveTarget = number | { before: string } | { after: string };

/** Registry for managing toolbar items with positional insertion and mutation subscriptions. */
export interface ToolbarRegistry {
  /**
   * Add or update by id (last-write-wins). New items append, then sort by `order`.
   * @param item - The toolbar item to register.
   */
  register(item: ToolbarItem): void;
  /**
   * Insert positionally before an existing item.
   * @param targetId - The id of the existing item.
   * @param item - The item to insert.
   */
  insertBefore(targetId: string, item: ToolbarItem): void;
  /**
   * Insert positionally after an existing item.
   * @param targetId - The id of the existing item.
   * @param item - The item to insert.
   */
  insertAfter(targetId: string, item: ToolbarItem): void;
  /**
   * Replace an existing item in place, preserving its position.
   * @param targetId - The id of the item to replace.
   * @param item - The replacement item.
   */
  replace(targetId: string, item: ToolbarItem): void;
  /**
   * Removes an item by id.
   * @param id - The id of the item to remove.
   */
  remove(id: string): void;
  /**
   * Move an existing item to an absolute index or relative to another item.
   * @param id - The id of the item to move.
   * @param target - The target position.
   */
  move(id: string, target: ToolbarMoveTarget): void;
  /**
   * @param id - The item id.
   * @returns The item, or undefined.
   */
  get(id: string): ToolbarItem | undefined;
  /** @returns All items in display order. */
  getOrdered(): ToolbarItem[];
  /** Backward-friendly alias for {@link getOrdered}. */
  getItems(): ToolbarItem[];
  /** Removes all items. */
  clear(): void;
  /**
   * Subscribe to mutations.
   * @param callback - The callback invoked on mutation.
   * @returns An unsubscribe function.
   */
  onChange(callback: () => void): () => void;
}

const MAX_ORDER = Number.MAX_SAFE_INTEGER;

class ToolbarRegistryImpl implements ToolbarRegistry {
  private entries: ToolbarItem[] = [];
  private listeners = new Set<() => void>();

  register(item: ToolbarItem): void {
    const index = this.entries.findIndex(
      (entry): boolean => entry.id === item.id,
    );
    if (index >= 0) {
      this.entries[index] = item;
    } else {
      this.entries.push(item);
    }
    this.sortByOrder();
    this.emit();
  }

  insertBefore(targetId: string, item: ToolbarItem): void {
    this.spliceRelative(targetId, item, 0);
  }

  insertAfter(targetId: string, item: ToolbarItem): void {
    this.spliceRelative(targetId, item, 1);
  }

  replace(targetId: string, item: ToolbarItem): void {
    const index = this.entries.findIndex(
      (entry): boolean => entry.id === targetId,
    );
    if (index < 0) {
      this.register(item);
      return;
    }
    this.entries[index] = item;
    this.emit();
  }

  remove(id: string): void {
    const next = this.entries.filter((entry): boolean => entry.id !== id);
    if (next.length !== this.entries.length) {
      this.entries = next;
      this.emit();
    }
  }

  move(id: string, target: ToolbarMoveTarget): void {
    const index = this.entries.findIndex((entry): boolean => entry.id === id);
    if (index < 0) {
      return;
    }
    const [item] = this.entries.splice(index, 1);
    const toIndex = this.resolveMoveIndex(target);
    if (toIndex === null) {
      this.entries.splice(index, 0, item!);
      return;
    }
    const clamped = Math.max(0, Math.min(toIndex, this.entries.length));
    this.entries.splice(clamped, 0, item!);
    this.emit();
  }

  get(id: string): ToolbarItem | undefined {
    return this.entries.find((entry): boolean => entry.id === id);
  }

  getOrdered(): ToolbarItem[] {
    return [...this.entries];
  }

  getItems(): ToolbarItem[] {
    return this.getOrdered();
  }

  clear(): void {
    if (this.entries.length === 0) {
      return;
    }
    this.entries = [];
    this.emit();
  }

  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return (): boolean => this.listeners.delete(callback);
  }

  private spliceRelative(
    targetId: string,
    item: ToolbarItem,
    offset: 0 | 1,
  ): void {
    this.entries = this.entries.filter(
      (entry): boolean => entry.id !== item.id,
    );
    const targetIndex = this.entries.findIndex(
      (entry): boolean => entry.id === targetId,
    );
    if (targetIndex < 0) {
      this.entries.push(item);
    } else {
      this.entries.splice(targetIndex + offset, 0, item);
    }
    this.emit();
  }

  private resolveMoveIndex(target: ToolbarMoveTarget): number | null {
    if (typeof target === "number") {
      return target;
    }
    if ("before" in target) {
      const index = this.entries.findIndex(
        (entry): boolean => entry.id === target.before,
      );
      return index >= 0 ? index : null;
    }
    const index = this.entries.findIndex(
      (entry): boolean => entry.id === target.after,
    );
    return index >= 0 ? index + 1 : null;
  }

  private sortByOrder(): void {
    this.entries = this.entries
      .map((item, index): { item: ToolbarItem; index: number } => ({
        item,
        index,
      }))
      .sort((a, b): number => {
        const orderA = a.item.order ?? MAX_ORDER;
        const orderB = b.item.order ?? MAX_ORDER;
        return orderA - orderB || a.index - b.index;
      })
      .map((entry): ToolbarItem => entry.item);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Creates a new, empty toolbar registry. */
export function createToolbarRegistry(): ToolbarRegistry {
  return new ToolbarRegistryImpl();
}
