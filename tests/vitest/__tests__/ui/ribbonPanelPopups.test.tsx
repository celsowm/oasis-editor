import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { createTranslator } from "@/i18n/index.js";
import { RibbonGroup } from "@/ui/components/Toolbar/ribbon/RibbonGroup.js";
import type {
  ResolvedRibbonGroupModel,
} from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import type {
  ToolbarActionApi,
} from "@/ui/components/Toolbar/schema/items.js";

function createApi(): ToolbarActionApi {
  return {
    commands: {
      canExecute: () => true,
      execute: vi.fn(),
      state: () => ({ isEnabled: true, isActive: false, value: undefined }),
    },
    t: createTranslator(() => "pt-BR"),
    focusEditor: vi.fn(),
  } as unknown as ToolbarActionApi;
}

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const baseGroup = (): ResolvedRibbonGroupModel => ({
  id: "font",
  label: "Fonte",
  largeItems: [],
  layout: "two-rows",
  rows: {
    1: [{ id: "bold", type: "button", command: "bold", label: "N" }],
    2: [],
    3: [],
  },
  order: 0,
  resizePolicy: {
    states: ["full", "compact", "collapsed"],
    compactMinWidth: 120,
    collapsedMinWidth: 40,
    priority: 50,
    compactLabels: "hide",
    collapsedIcon: "ellipsis",
    launcher: undefined,
    launcherTooltip: undefined,
  },
  resizeState: "collapsed" as const,
});

describe("ribbon group popup lifecycle", () => {
  it("opens popup when collapsed trigger is clicked", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <RibbonGroup group={baseGroup()} api={createApi()} />,
      host,
    );

    await flush();

    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-testid="editor-ribbon-group-font"]',
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await flush();

    expect(document.querySelector('[role="menu"]')).not.toBeNull();

    dispose();
  });

  it("closes a collapsed group popup when the group expands again", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const [collapsed, setCollapsed] = createSignal(true);
    const dynamicGroup = (): ResolvedRibbonGroupModel => ({
      ...baseGroup(),
      resizeState: collapsed() ? ("collapsed" as const) : ("full" as const),
    });
    const dispose = render(
      () => <RibbonGroup group={dynamicGroup()} api={createApi()} />,
      host,
    );

    await flush();

    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-testid="editor-ribbon-group-font"]',
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await flush();

    expect(document.querySelector('[role="menu"]')).not.toBeNull();

    // A wider window promotes the group back to its inline layout.
    setCollapsed(false);
    await flush();

    expect(document.querySelector('[role="menu"]')).toBeNull();

    dispose();
  });
});