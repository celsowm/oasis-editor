import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("closes before a canvas cancels pointerdown, without swallowing the click", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const listener=vi.fn((event: Event) => { event.preventDefault(); event.stopPropagation(); });
    canvas.addEventListener("pointerdown", listener);
    const dispose=render(() => <Menu label="Options"><button>Item</button></Menu>, host);
    const trigger=host.querySelector("button")!;
    trigger.click();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    canvas.dispatchEvent(new Event("pointerdown",{bubbles:true,cancelable:true,composed:true}));
    expect(listener).toHaveBeenCalledOnce();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="menu"]')).toBeNull();
    dispose();
  });

  it("keeps nested portalled menus open inside their branch and dismisses both outside", async () => {
    const host=document.createElement("div");
    document.body.appendChild(host);
    const outside=document.createElement("button");
    document.body.appendChild(outside);
    const dispose=render(() => <Menu label="Parent"><Menu label="Child"><input id="child-field"/></Menu></Menu>,host);
    const parent=host.querySelector("button")!;
    parent.click();
    const child=document.querySelector<HTMLButtonElement>('[aria-label="Child"]')!;
    child.click();
    const field=document.querySelector<HTMLInputElement>("#child-field")!;
    field.dispatchEvent(new Event("pointerdown",{bubbles:true,composed:true}));
    expect(parent.getAttribute("aria-expanded")).toBe("true");
    expect(child.getAttribute("aria-expanded")).toBe("true");
    field.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));
    await Promise.resolve();
    expect(child.getAttribute("aria-expanded")).toBe("false");
    expect(parent.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(child);
    child.click();
    outside.dispatchEvent(new Event("pointerdown",{bubbles:true,composed:true}));
    expect(parent.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="menu"]')).toBeNull();
    dispose();
  });

  it("switches menus with the first click, including the mouse-only fallback", () => {
    const host=document.createElement("div");
    document.body.appendChild(host);
    const dispose=render(() => <><Menu label="First"><input/></Menu><Menu label="Second"><input/></Menu></>,host);
    const [first,second]=Array.from(host.querySelectorAll("button"));
    first!.click();
    second!.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true}));
    second!.click();
    expect(first!.getAttribute("aria-expanded")).toBe("false");
    expect(second!.getAttribute("aria-expanded")).toBe("true");
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
