import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { TableStyleGallery } from "@/ui/components/Toolbar/TableStyleGallery.js";
import type {
  ToolbarActionApi,
  ToolbarDocumentStyle,
} from "@/ui/components/Toolbar/schema/items.js";

const styles: ToolbarDocumentStyle[] = [
  { id: "paragraph", name: "Normal", type: "paragraph" },
  {
    id: "accent",
    name: "Accent table",
    type: "table",
    uiPriority: 10,
    tablePreview: {
      wholeFill: "#ffffff",
      headerFill: "#155e75",
      bandFill: "#dff5ff",
      borderColor: "#155e75",
    },
  },
  { id: "plain", name: "Plain table", type: "table", uiPriority: 1 },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TableStyleGallery", () => {
  it("filters table styles, highlights the active preview, expands and applies", () => {
    const execute = vi.fn();
    const api = {
      commands: {
        execute: (command: string, payload?: unknown) =>
          execute(command, payload),
        canExecute: () => true,
        state: (command: string) => ({
          isEnabled: true,
          isActive: false,
          value: command === "setTableStyle" ? "accent" : null,
        }),
      },
      t: () => "Table styles",
      focusEditor: vi.fn(),
    } as unknown as ToolbarActionApi;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <TableStyleGallery api={api} styles={styles} testId="tables" />,
      host,
    );

    expect(
      host.querySelectorAll(".oasis-editor-table-style-card"),
    ).toHaveLength(2);
    expect(
      host
        .querySelector("[data-style-id='accent']")
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    (
      host.querySelector("[data-testid='tables-expand']") as HTMLButtonElement
    ).click();
    const panel = document.querySelector(
      "[data-testid='tables-panel']",
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    (
      panel.querySelector("[data-style-id='plain']") as HTMLButtonElement
    ).click();
    expect(execute).toHaveBeenCalledWith("setTableStyle", "plain");
    expect(document.querySelector("[data-testid='tables-panel']")).toBeNull();
    dispose();
  });

  it("renders an inert fallback when no table styles exist", () => {
    const api = {
      commands: {
        canExecute: () => false,
        execute: vi.fn(),
        state: () => ({ isEnabled: false, isActive: false, value: null }),
      },
      t: () => "Table styles",
      focusEditor: vi.fn(),
    } as unknown as ToolbarActionApi;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => <TableStyleGallery api={api} styles={styles.slice(0, 1)} />,
      host,
    );
    expect(
      host.querySelector(".oasis-editor-table-style-gallery-empty")
        ?.textContent,
    ).toBe("Table styles");
    dispose();
  });
});
