import type { ToolbarItem } from "../schema/items.js";

export type ToolbarMoveTarget = number | { before: string } | { after: string };

export interface ToolbarRegistry {
  /** Add or update by id (last-write-wins). New items append, then sort by `order`. */
  register(item: ToolbarItem): void;
  /** Insert positionally before an existing item. */
  insertBefore(targetId: string, item: ToolbarItem): void;
  /** Insert positionally after an existing item. */
  insertAfter(targetId: string, item: ToolbarItem): void;
  /** Replace an existing item in place, preserving its position. */
  replace(targetId: string, item: ToolbarItem): void;
  remove(id: string): void;
  /** Move an existing item to an absolute index or relative to another item. */
  move(id: string, target: ToolbarMoveTarget): void;
  get(id: string): ToolbarItem | undefined;
  getOrdered(): ToolbarItem[];
  /** Backward-friendly alias for getOrdered. */
  getItems(): ToolbarItem[];
  clear(): void;
  /** Subscribe to mutations; returns an unsubscribe function. */
  onChange(callback: () => void): () => void;
}

const MAX_ORDER = Number.MAX_SAFE_INTEGER;

class ToolbarRegistryImpl implements ToolbarRegistry {
  private entries: ToolbarItem[] = [];
  private listeners = new Set<() => void>();

  register(item: ToolbarItem): void {
    const index = this.entries.findIndex((entry) => entry.id === item.id);
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
    const index = this.entries.findIndex((entry) => entry.id === targetId);
    if (index < 0) {
      this.register(item);
      return;
    }
    this.entries[index] = item;
    this.emit();
  }

  remove(id: string): void {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length !== this.entries.length) {
      this.entries = next;
      this.emit();
    }
  }

  move(id: string, target: ToolbarMoveTarget): void {
    const index = this.entries.findIndex((entry) => entry.id === id);
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
    return this.entries.find((entry) => entry.id === id);
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
    return () => this.listeners.delete(callback);
  }

  private spliceRelative(targetId: string, item: ToolbarItem, offset: 0 | 1): void {
    // Drop any pre-existing item with the same id so position is unambiguous.
    this.entries = this.entries.filter((entry) => entry.id !== item.id);
    const targetIndex = this.entries.findIndex((entry) => entry.id === targetId);
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
      const index = this.entries.findIndex((entry) => entry.id === target.before);
      return index >= 0 ? index : null;
    }
    const index = this.entries.findIndex((entry) => entry.id === target.after);
    return index >= 0 ? index + 1 : null;
  }

  private sortByOrder(): void {
    // Stable sort by `order` (undefined sinks to the end, keeping insertion order).
    this.entries = this.entries
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const orderA = a.item.order ?? MAX_ORDER;
        const orderB = b.item.order ?? MAX_ORDER;
        return orderA - orderB || a.index - b.index;
      })
      .map((entry) => entry.item);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createToolbarRegistry(): ToolbarRegistry {
  return new ToolbarRegistryImpl();
}
