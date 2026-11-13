import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { createTranslator } from "@/i18n/index.js";
import { RibbonGroup } from "@/ui/components/Toolbar/ribbon/RibbonGroup.js";
import { StyleGallery } from "@/ui/components/Toolbar/StyleGallery.js";
import { TableStyleGallery } from "@/ui/components/Toolbar/TableStyleGallery.js";
import { TableCellAlignmentMatrix } from "@/ui/components/Toolbar/controls/TableCellAlignmentMatrix.js";
import type {
  ResolvedRibbonGroupModel,
} from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import type {
  ToolbarActionApi,
  ToolbarDocumentStyle,
} from "@/ui/components/Toolbar/schema/items.js";

function createApi(): ToolbarActionApi {
  return {
    commands: {
      canExecute: () => true,
      execute: vi.fn(),
      state: (command?: string) => {
        if (command === "tableSetCellAlignment") {
          return {
            isEnabled: true,
            isActive: false,
            value: { horizontal: "left", vertical: "top" },
          };
        }
        if (command === "setTableStyle") {
          return { isEnabled: true, isActive: false, value: "table1" };
        }
        if (command === "setStyleId") {
          return { isEnabled: true, isActive: false, value: "normal" };
        }
        if (command === "setCharacterStyleId") {
          return { isEnabled: true, isActive: false, value: "" };
        }
        return { isEnabled: true, isActive: false, value: undefined };
      },
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
      private callback: (() => void) | null = null;
      observe(target: HTMLElement) {
        // Simulate a strip width that fits 2 cards (212px = 2 * 106px)
        Object.defineProperty(target, "clientWidth", { value: 212, configurable: true });
        // Call the measure callback immediately
        if (this.callback) this.callback();
      }
      unobserve(): void {}
      disconnect(): void {}
      constructor(callback: () => void) {
        this.callback = callback;
      }
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

const groupWithStyles = (): ResolvedRibbonGroupModel => ({
  ...baseGroup(),
  largeItems: [
    {
      type: "styleGallery",
      id: "styles",
      testId: "styles",
      styles: () => [
        {
          id: "normal",
          name: "Normal",
          type: "paragraph",
          qFormat: true,
          uiPriority: 0,
        },
        {
          id: "emphasis",
          name: "Emphasis",
          type: "character",
          qFormat: true,
          uiPriority: 10,
          italic: true,
        },
      ],
      paragraphCommand: "setStyleId",
      characterCommand: "setCharacterStyleId",
    },
  ],
});

const groupWithTableStyles = (): ResolvedRibbonGroupModel => ({
  ...baseGroup(),
  largeItems: [
    {
      type: "custom",
      id: "table-styles",
      testId: "table-styles",
      render: (api) => (
        <TableStyleGallery
          api={api}
          styles={[
            {
              id: "table1",
              name: "Table Style 1",
              type: "table",
              qFormat: true,
              uiPriority: 0,
              tablePreview: {
                wholeFill: "#ffffff",
                headerFill: "#1f2937",
                bandFill: "#f3f4f6",
                borderColor: "#d1d5db",
                headerColor: "#ffffff",
              },
            },
            {
              id: "table2",
              name: "Table Style 2",
              type: "table",
              qFormat: true,
              uiPriority: 10,
              tablePreview: {
                wholeFill: "#f9fafb",
                headerFill: "#374151",
                bandFill: "#e5e7eb",
                borderColor: "#9ca3af",
                headerColor: "#ffffff",
              },
            },
          ]}
        />
      ),
    },
  ],
});

const groupWithAlignment = (): ResolvedRibbonGroupModel => ({
  ...baseGroup(),
  largeItems: [
    {
      type: "custom",
      id: "cell-alignment",
      testId: "cell-alignment",
      render: (api) => <TableCellAlignmentMatrix api={api} />,
    },
  ],
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

  it("renders StyleGallery in collapsed popup with inline strip and keyboard navigation", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <RibbonGroup group={groupWithStyles()} api={createApi()} />,
      host,
    );

    await flush();
    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-testid="editor-ribbon-group-font"]',
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await flush();
    await flush(); // Allow time for style state to propagate

    const panel = document.querySelector<HTMLDivElement>('[role="menu"]');
    expect(panel).not.toBeNull();

    // The gallery inline strip should be present in the panel
    const galleryStrip = panel?.querySelector<HTMLDivElement>(
      '.oasis-editor-style-gallery-strip',
    );
    expect(galleryStrip).not.toBeNull();

    // Cards should be present in the strip
    const cards = galleryStrip?.querySelectorAll<HTMLButtonElement>(
      '.oasis-editor-style-gallery-card',
    );
    expect(cards?.length).toBeGreaterThan(0);

    // Keyboard navigation should work
    const firstCard = cards?.[0];
    firstCard?.focus();
    await flush();
    expect(firstCard?.getAttribute("aria-selected")).toBe("true");

    firstCard?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    await flush();
    const secondCard = cards?.[1];
    expect(secondCard?.matches(":focus")).toBe(true);

    dispose();
  });

  it("renders TableStyleGallery in collapsed popup with table style cards", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <RibbonGroup group={groupWithTableStyles()} api={createApi()} />,
      host,
    );

    await flush();
    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-testid="editor-ribbon-group-font"]',
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await flush();
    await flush(); // Allow time for state to propagate

    const panel = document.querySelector<HTMLDivElement>('[role="menu"]');
    expect(panel).not.toBeNull();

    // Table style cards should be present
    const cards = panel?.querySelectorAll<HTMLButtonElement>(
      '[role="option"][data-style-id]',
    );
    expect(cards?.length).toBeGreaterThan(0);

    // Active state should be indicated
    const firstCard = cards?.[0];
    expect(firstCard?.getAttribute("aria-selected")).toBe("true");

    dispose();
  });

  it("renders TableCellAlignmentMatrix in collapsed popup with grid role", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <RibbonGroup group={groupWithAlignment()} api={createApi()} />,
      host,
    );

    await flush();
    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-testid="editor-ribbon-group-font"]',
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await flush();

    const panel = document.querySelector<HTMLDivElement>('[role="menu"]');
    expect(panel).not.toBeNull();

    // The matrix should be present with role="group"
    const matrix = panel?.querySelector<HTMLDivElement>(
      '.oasis-editor-table-cell-alignment-matrix',
    );
    expect(matrix).not.toBeNull();
    expect(matrix?.getAttribute("role")).toBe("group");

    // 3x3 grid of buttons should be present
    const buttons = matrix?.querySelectorAll<HTMLButtonElement>(
      '.oasis-editor-table-cell-alignment-option',
    );
    expect(buttons?.length).toBe(9);

    // One should be active (first button has aria-pressed="true")
    const activeButton = matrix?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    expect(activeButton).not.toBeNull();
    expect(activeButton?.getAttribute("data-testid")).toBe(
      "editor-toolbar-cell-align-top-left",
    );

    // Keyboard navigation should work
    activeButton?.focus();
    await flush();
    activeButton?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    await flush();
    const nextButton = matrix?.querySelector<HTMLButtonElement>(
      '.oasis-editor-table-cell-alignment-option:focus',
    );
    expect(nextButton).not.toBeNull();

    dispose();
  });
});