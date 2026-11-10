import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
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
  vi.unstubAllGlobals();
});

describe("StyleGallery", () => {
  it("disables each style family and closes a focused gallery when no action remains", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private callback: () => void) {}
        observe(target: HTMLElement) {
          Object.defineProperty(target, "clientWidth", { value: 318 });
          this.callback();
        }
        disconnect() {}
      },
    );
    const [paragraphEnabled, setParagraphEnabled] = createSignal(false);
    const [characterEnabled, setCharacterEnabled] = createSignal(true);
    const enabled = (name: string) =>
      name === "setStyleId" ? paragraphEnabled() : characterEnabled();
    const focusEditor = vi.fn(),
      execute = vi.fn();
    const api = {
      commands: {
        state: (name: string) => ({
          isEnabled: enabled(name),
          isActive: false,
          value: "normal",
        }),
        canExecute: enabled,
        execute,
      },
      focusEditor,
      t: () => "Styles",
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
      host.querySelector<HTMLButtonElement>('[data-style-id="normal"]')!
        .disabled,
    ).toBe(true);
    expect(
      host.querySelector<HTMLButtonElement>('[data-style-id="emphasis"]')!
        .disabled,
    ).toBe(false);
    const expand = host.querySelector<HTMLButtonElement>(
      '[data-testid="styles-expand"]',
    )!;
    expand.click();
    await Promise.resolve();
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="styles-panel"]',
    )!;
    expect((document.activeElement as HTMLElement).dataset.styleId).toBe(
      "emphasis",
    );
    panel.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true }),
    );
    expect((document.activeElement as HTMLElement).dataset.styleId).toBe(
      "emphasis",
    );
    setCharacterEnabled(false);
    await Promise.resolve();
    expect(document.querySelector('[data-testid="styles-panel"]')).toBeNull();
    expect(
      host.querySelector<HTMLButtonElement>('[data-testid="styles-expand"]')!
        .disabled,
    ).toBe(true);
    expect(focusEditor).toHaveBeenCalledTimes(1);
    expect(host.querySelector<HTMLSelectElement>("select")!.disabled).toBe(
      true,
    );
    expect(execute).not.toHaveBeenCalled();
    setParagraphEnabled(true);
    expect(
      host.querySelector<HTMLButtonElement>('[data-testid="styles-expand"]')!
        .disabled,
    ).toBe(false);
    expect(
      host
        .querySelector<HTMLButtonElement>('[data-testid="styles-expand"]')!
        .getAttribute("aria-expanded"),
    ).toBe("false");
    dispose();
  });

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
    let stripWidth = 212;
    const resizeCallbacks = new Set<() => void>();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        private notify: () => void;
        constructor(callback: () => void) {
          this.notify = callback;
        }
        observe(target: HTMLElement): void {
          Object.defineProperty(target, "clientWidth", {
            configurable: true,
            get: () => stripWidth,
          });
          resizeCallbacks.add(this.notify);
        }
        disconnect(): void {
          resizeCallbacks.delete(this.notify);
        }
      },
    );
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

    const inlineCards = (): number =>
      host.querySelectorAll(
        ".oasis-editor-style-gallery-strip .oasis-editor-style-gallery-card",
      ).length;
    expect(inlineCards()).toBe(2);
    stripWidth = 211;
    resizeCallbacks.forEach((callback) => callback());
    expect(inlineCards()).toBe(1);
    stripWidth = 212;
    resizeCallbacks.forEach((callback) => callback());
    expect(inlineCards()).toBe(2);

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
    expect(resizeCallbacks.size).toBe(0);
  });
});
