import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import {
  StyleGallery,
  getQuickStyles,
} from "@/ui/components/Toolbar/StyleGallery.js";
import type {
  ToolbarActionApi,
  ToolbarDocumentStyle,
} from "@/ui/components/Toolbar/schema/items.js";

const styles: ToolbarDocumentStyle[] = [
  { id: "table", name: "Table", type: "table", qFormat: true, uiPriority: 1 },
  {
    id: "hidden",
    name: "Hidden",
    type: "paragraph",
    qFormat: true,
    semiHidden: true,
    uiPriority: 2,
  },
  {
    id: "later",
    name: "Later",
    type: "paragraph",
    qFormat: true,
    uiPriority: 20,
  },
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
  { id: "not-quick", name: "Not quick", type: "paragraph" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("StyleGallery", () => {
  it("filters and orders DOCX quick styles, with a legacy fallback", () => {
    expect(getQuickStyles(styles).map((style) => style.id)).toEqual([
      "normal",
      "emphasis",
      "later",
    ]);
    expect(
      getQuickStyles([
        { id: "normal", name: "Normal", type: "paragraph" },
        { id: "strong", name: "Strong", type: "character" },
      ]).map((style) => style.id),
    ).toEqual(["normal", "strong"]);
    expect(
      getQuickStyles([
        {
          id: "first",
          name: "First",
          type: "paragraph",
          qFormat: true,
          uiPriority: 5,
        },
        {
          id: "second",
          name: "Second",
          type: "paragraph",
          qFormat: true,
          uiPriority: 5,
        },
        { id: "last", name: "Last", type: "paragraph", qFormat: true },
      ]).map((style) => style.id),
    ).toEqual(["first", "second", "last"]);
  });

  it("expands, marks the active style, and dispatches by style type", async () => {
    const execute = vi.fn();
    const values: Record<string, string> = {
      setStyleId: "normal",
      setCharacterStyleId: "",
    };
    const api = {
      commands: {
        execute: (command: string, payload?: unknown) =>
          execute(command, payload),
        canExecute: () => true,
        state: (command: string) => ({
          isEnabled: true,
          isActive: false,
          value: values[command] ?? styles,
        }),
      },
      t: () => "Styles",
      focusEditor: vi.fn(),
    } as unknown as ToolbarActionApi;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <StyleGallery
          api={api}
          item={{
            type: "styleGallery",
            id: "styles",
            testId: "styles",
            styles: () => styles,
            paragraphCommand: "setStyleId",
            characterCommand: "setCharacterStyleId",
          }}
        />
      ),
      host,
    );

    expect(
      host
        .querySelector("[data-style-id='normal']")
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    (
      host.querySelector("[data-testid='styles-expand']") as HTMLButtonElement
    ).click();
    const panel = document.querySelector("[data-testid='styles-panel']");
    expect(panel).not.toBeNull();
    (
      panel?.querySelector("[data-style-id='emphasis']") as HTMLButtonElement
    ).click();
    expect(execute).toHaveBeenCalledWith("setCharacterStyleId", "emphasis");
    expect(document.querySelector("[data-testid='styles-panel']")).toBeNull();

    const expand = host.querySelector(
      "[data-testid='styles-expand']",
    ) as HTMLButtonElement;
    expand.click();
    const reopened = document.querySelector(
      "[data-testid='styles-panel']",
    ) as HTMLElement;
    (
      reopened.querySelector(
        ".oasis-editor-style-gallery-card",
      ) as HTMLButtonElement
    ).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(document.querySelector("[data-testid='styles-panel']")).toBeNull();
    expect(document.activeElement?.getAttribute("data-testid")).toBe(
      "styles-expand",
    );
    dispose();
  });
});
