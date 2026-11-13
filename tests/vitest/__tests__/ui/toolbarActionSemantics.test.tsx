import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createTranslator } from "@/i18n/index.js";
import { ToolbarItemRenderer } from "@/ui/components/Toolbar/renderers/ToolbarItemRenderer.js";
import type {
  ToolbarActionApi,
  ToolbarCommandState,
} from "@/ui/components/Toolbar/schema/items.js";

function createApi(state: Partial<ToolbarCommandState> = {}): ToolbarActionApi {
  const resolved: ToolbarCommandState = {
    isEnabled: true,
    isActive: false,
    value: undefined,
    ...state,
  };
  return {
    commands: {
      canExecute: () => resolved.isEnabled,
      execute: vi.fn(),
      state: () => resolved,
    },
    t: createTranslator(() => "pt-BR"),
    focusEditor: vi.fn(),
  } as unknown as ToolbarActionApi;
}

function renderItem(
  item: Parameters<typeof ToolbarItemRenderer>[0]["item"],
  api: ToolbarActionApi,
): { host: HTMLElement; dispose: () => void } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(() => <ToolbarItemRenderer item={item} api={api} />, host);
  return { host, dispose };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("toolbar action semantics", () => {
  it("does not expose a plain action as a toggle", () => {
    const { host, dispose } = renderItem(
      {
        id: "plain",
        type: "button",
        command: "bold",
        tooltip: "Negrito",
      },
      createApi({ isActive: false }),
    );

    const button = host.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.hasAttribute("aria-pressed")).toBe(false);

    dispose();
  });

  it("announces toggle state only for toggle items", () => {
    const on = renderItem(
      {
        id: "toggle-on",
        type: "toggle",
        command: "bold",
        tooltip: "Negrito",
      },
      createApi({ isActive: true }),
    );
    expect(
      on.host.querySelector("button")?.getAttribute("aria-pressed"),
    ).toBe("true");
    on.dispose();

    const off = renderItem(
      {
        id: "toggle-off",
        type: "toggle",
        command: "bold",
        tooltip: "Negrito",
      },
      createApi({ isActive: false }),
    );
    expect(
      off.host.querySelector("button")?.getAttribute("aria-pressed"),
    ).toBe("false");
    off.dispose();
  });

  it("keeps the split main action free of a toggle state", () => {
    const { host, dispose } = renderItem(
      {
        id: "split-paste",
        type: "split",
        command: "paste",
        tooltip: "Colar",
        label: "Colar",
        menu: { kind: "items", items: [] },
      },
      createApi({ isActive: false }),
    );

    const main = host.querySelector(".oasis-editor-color-split-main");
    expect(main?.hasAttribute("aria-pressed")).toBe(false);

    dispose();
  });

  it("names the split chevron from its label instead of a bare 'menu'", () => {
    const { host, dispose } = renderItem(
      {
        id: "split-special-indent",
        type: "split",
        command: "paste",
        label: "Recuo Especial",
        menu: { kind: "items", items: [] },
      },
      createApi(),
    );

    const chevron = host.querySelector(
      ".oasis-editor-color-split-menu-button",
    );
    expect(chevron?.getAttribute("aria-label")).toBe("Recuo Especial menu");
    expect(chevron?.getAttribute("aria-haspopup")).toBe("menu");
    expect(chevron?.getAttribute("aria-expanded")).toBe("false");

    dispose();
  });

  it("exposes items inside a menu panel as menuitems only", () => {
    const api = createApi();
    const topLevel = renderItem(
      {
        id: "menu-trigger",
        type: "menu",
        iconName: "shapes",
        label: "Formas",
        content: {
          kind: "items",
          items: [
            {
              id: "inner-action",
              type: "button",
              command: "bold",
              label: "A",
              testId: "inner-action",
            },
            {
              id: "inner-submenu",
              type: "menu",
              label: "B",
              testId: "inner-submenu",
              content: { kind: "items", items: [] },
            },
          ],
        },
      },
      api,
    );

    const trigger = topLevel.host.querySelector("button");
    expect(trigger?.hasAttribute("role")).toBe(false);

    trigger?.click();
    const panel = document.querySelector<HTMLElement>('[role="menu"]');
    expect(panel).not.toBeNull();

    const action = panel?.querySelector<HTMLButtonElement>(
      '[data-testid="inner-action"]',
    );
    expect(action?.getAttribute("role")).toBe("menuitem");

    const submenu = panel?.querySelector<HTMLButtonElement>(
      '[data-testid="inner-submenu"]',
    );
    expect(submenu?.getAttribute("role")).toBe("menuitem");
    expect(submenu?.getAttribute("aria-haspopup")).toBe("menu");

    topLevel.dispose();
  });
});
