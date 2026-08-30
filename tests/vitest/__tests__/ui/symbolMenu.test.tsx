import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createTranslator } from "@/i18n/index.js";
import { SymbolMenu } from "@/ui/components/Toolbar/SymbolMenu.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

function createApi(): ToolbarActionApi & {
  execute: ReturnType<typeof vi.fn>;
} {
  const execute = vi.fn();
  return {
    commands: {
      canExecute: () => true,
      execute,
      state: () => ({ isEnabled: true, isActive: false, value: undefined }),
    },
    t: createTranslator(() => "pt-BR"),
    focusEditor: vi.fn(),
    execute,
  } as ToolbarActionApi & { execute: ReturnType<typeof vi.fn> };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SymbolMenu", () => {
  it("offers equation, symbol and number views and inserts a selected symbol", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const api = createApi();
    const dispose = render(() => <SymbolMenu api={api} />, host);

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-toolbar-symbols']",
      )
      ?.click();

    expect(document.body.textContent).toContain("Equação");
    expect(document.body.textContent).toContain("Símbolo");
    expect(document.body.textContent).toContain("Número");

    document.body
      .querySelector<HTMLButtonElement>("[data-testid='editor-toolbar-symbol']")
      ?.click();
    expect(
      document.body.querySelector("[data-testid='editor-symbol-U-00A9']"),
    ).not.toBeNull();

    document.body
      .querySelector<HTMLButtonElement>("[data-testid='editor-symbol-U-00A9']")
      ?.click();
    expect(api.execute).toHaveBeenCalledWith("insertText", "©");

    dispose();
  });

  it("opens the complete symbol dialog through the shared command", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const api = createApi();
    const dispose = render(() => <SymbolMenu api={api} />, host);

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-toolbar-symbols']",
      )
      ?.click();
    document.body
      .querySelector<HTMLButtonElement>("[data-testid='editor-toolbar-symbol']")
      ?.click();
    document.body
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-toolbar-more-symbols']",
      )
      ?.click();

    expect(api.execute).toHaveBeenCalledWith("openSymbolDialog");
    dispose();
  });
});
