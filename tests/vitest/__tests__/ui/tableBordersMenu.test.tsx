import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { TableBordersMenu } from "@/ui/components/Toolbar/TableBordersMenu.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TableBordersMenu", () => {
  it("lists the complete preset menu and dispatches its preset", () => {
    const execute = vi.fn();
    const api = {
      commands: {
        execute: (command: string, payload?: unknown) =>
          execute(command, payload),
        canExecute: () => true,
        state: () => ({ isEnabled: true, isActive: false, value: null }),
      },
      t: (key: string) => key,
      focusEditor: vi.fn(),
    } as unknown as ToolbarActionApi;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(() => <TableBordersMenu api={api} />, host);
    (
      host.querySelector(
        ".oasis-editor-table-borders-trigger",
      ) as HTMLButtonElement
    ).click();
    expect(
      document.querySelectorAll(".oasis-editor-table-borders-action"),
    ).toHaveLength(16);
    (
      Array.from(
        document.querySelectorAll(".oasis-editor-table-borders-action"),
      ).find((button) =>
        button.textContent?.includes("Borda Inferior"),
      ) as HTMLButtonElement
    ).click();
    expect(execute).toHaveBeenCalledWith("tableApplyBorderPreset", "bottom");
    dispose();
  });
});
