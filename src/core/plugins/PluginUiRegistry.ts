import type {
  FloatingActionContribution,
  OasisPluginUiRegistry,
  OasisPluginUiSnapshot,
  SidePanelContribution,
  Unsubscribe,
} from "@/core/plugin.js";

const MAX_ORDER = Number.MAX_SAFE_INTEGER;

export class PluginUiRegistry implements OasisPluginUiRegistry {
  private floatingActions: FloatingActionContribution[] = [];
  private sidePanels: SidePanelContribution[] = [];
  private activeSidePanelId: string | null = null;
  private listeners = new Set<() => void>();

  registerFloatingAction(
    contribution: FloatingActionContribution,
  ): Unsubscribe {
    this.floatingActions = replaceById(this.floatingActions, contribution);
    this.sort();
    this.emit();
    return () => this.unregisterFloatingAction(contribution.id);
  }

  registerSidePanel(contribution: SidePanelContribution): Unsubscribe {
    this.sidePanels = replaceById(this.sidePanels, contribution);
    this.sort();
    this.emit();
    return () => this.unregisterSidePanel(contribution.id);
  }

  openSidePanel(id: string): void {
    if (!this.sidePanels.some((panel) => panel.id === id)) {
      return;
    }
    if (this.activeSidePanelId === id) {
      return;
    }
    this.activeSidePanelId = id;
    this.emit();
  }

  closeSidePanel(id?: string): void {
    if (!this.activeSidePanelId) {
      return;
    }
    if (id && this.activeSidePanelId !== id) {
      return;
    }
    this.activeSidePanelId = null;
    this.emit();
  }

  toggleSidePanel(id: string): void {
    if (this.activeSidePanelId === id) {
      this.closeSidePanel(id);
      return;
    }
    this.openSidePanel(id);
  }

  getSnapshot(): OasisPluginUiSnapshot {
    return {
      floatingActions: [...this.floatingActions],
      sidePanels: [...this.sidePanels],
      activeSidePanelId: this.activeSidePanelId,
    };
  }

  onChange(callback: () => void): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  clear(): void {
    if (
      this.floatingActions.length === 0 &&
      this.sidePanels.length === 0 &&
      this.activeSidePanelId === null
    ) {
      return;
    }
    this.floatingActions = [];
    this.sidePanels = [];
    this.activeSidePanelId = null;
    this.emit();
  }

  private unregisterFloatingAction(id: string): void {
    const next = this.floatingActions.filter((action) => action.id !== id);
    if (next.length === this.floatingActions.length) {
      return;
    }
    this.floatingActions = next;
    this.emit();
  }

  private unregisterSidePanel(id: string): void {
    const next = this.sidePanels.filter((panel) => panel.id !== id);
    const activeChanged = this.activeSidePanelId === id;
    if (next.length === this.sidePanels.length && !activeChanged) {
      return;
    }
    this.sidePanels = next;
    if (activeChanged) {
      this.activeSidePanelId = null;
    }
    this.emit();
  }

  private sort(): void {
    this.floatingActions = sortByOrder(this.floatingActions);
    this.sidePanels = sortByOrder(this.sidePanels);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index < 0) {
    return [...items, item];
  }
  const next = [...items];
  next[index] = item;
  return next;
}

function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const orderA = a.item.order ?? MAX_ORDER;
      const orderB = b.item.order ?? MAX_ORDER;
      return orderA - orderB || a.index - b.index;
    })
    .map((entry) => entry.item);
}
