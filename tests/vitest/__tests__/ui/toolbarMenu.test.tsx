import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("toolbar Menu", () => {
  it("keeps the caption visible on large dropdown triggers", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Menu icon="shapes" label="Formas" ribbonSize="large">
          <div />
        </Menu>
      ),
      host,
    );

    const button = host.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.classList.contains("oasis-editor-tool-button-ribbon-large"))
      .toBe(true);
    expect(
      button?.querySelector(".oasis-editor-tool-button-label")?.textContent,
    ).toBe("Formas");
    expect(
      button?.querySelector(".oasis-editor-dropdown-chevron"),
    ).not.toBeNull();

    dispose();
  });

  it("moves focus with Arrow, Home and End inside a menu panel", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Menu icon="shapes" label="Formas">
          <button id="item-a">A</button>
          <button id="item-b">B</button>
          <button id="item-c">C</button>
        </Menu>
      ),
      host,
    );

    host.querySelector<HTMLButtonElement>("button")?.click();
    const panel = document.querySelector<HTMLElement>('[role="menu"]');
    expect(panel).not.toBeNull();
    const a = panel?.querySelector<HTMLButtonElement>("#item-a");
    const b = panel?.querySelector<HTMLButtonElement>("#item-b");
    const c = panel?.querySelector<HTMLButtonElement>("#item-c");
    expect(a && b && c).toBeTruthy();

    const press = (key: string): void => {
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    };

    a?.focus();
    press("ArrowDown");
    expect(document.activeElement).toBe(b);
    press("ArrowDown");
    expect(document.activeElement).toBe(c);
    press("ArrowDown");
    expect(document.activeElement).toBe(a);
    press("ArrowUp");
    expect(document.activeElement).toBe(c);
    press("Home");
    expect(document.activeElement).toBe(a);
    press("End");
    expect(document.activeElement).toBe(c);

    dispose();
  });

  it("leaves caret keys alone in text fields inside a menu panel", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Menu icon="shapes" label="Formas">
          <input id="menu-field" value="abc" />
          <button id="menu-action">Action</button>
        </Menu>
      ),
      host,
    );

    host.querySelector<HTMLButtonElement>("button")?.click();
    const field = document.querySelector<HTMLInputElement>("#menu-field");
    field?.focus();
    field?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(document.activeElement).toBe(field);

    dispose();
  });
});
