import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { MarginsGroup } from "@/ui/components/Toolbar/groups/MarginsGroup.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { createTranslator } from "@/i18n/index.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("MarginsGroup", () => {
  it("renders a labelled preset menu with a thumbnail hook for each preset", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <MarginsGroup api={createApi()} />,
      host,
    );

    host.querySelector<HTMLButtonElement>(
      "[data-testid='editor-toolbar-margins-dropdown']",
    )?.click();

    expect(document.body.textContent).toContain("Margens");
    expect(
      document.body.querySelectorAll("[data-margin-preset]").length,
    ).toBe(5);
    expect(
      document.body.querySelector(
        "[data-testid='editor-toolbar-margins-normal']",
      )?.textContent,
    ).toContain("Normal");

    dispose();
  });
});

function createApi(): ToolbarActionApi {
  return {
    commands: {
      state: () => ({
        isEnabled: true,
        isActive: false,
        value: { top: 240, bottom: 240, left: 288, right: 288 },
      }),
      canExecute: () => true,
      execute: () => undefined,
    },
    t: createTranslator(() => "pt-BR"),
    focusEditor: () => undefined,
  } as ToolbarActionApi;
}
