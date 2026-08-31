import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createTranslator } from "@/i18n/index.js";
import { ImageCropMenu } from "@/ui/components/Toolbar/controls/ImageSizeControls.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
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

describe("ImageCropMenu", () => {
  it("aligns rows and exposes submenu semantics", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(() => <ImageCropMenu api={createApi()} />, host);

    const rows = host.querySelectorAll<HTMLButtonElement>(
      ".oasis-editor-image-crop-menu-row",
    );
    expect(rows).toHaveLength(6);
    expect(
      Array.from(rows).map(
        (row) =>
          row.querySelector(".oasis-editor-tool-button-label")?.textContent,
      ),
    ).toEqual([
      "Cortar",
      "Cortar para Demarcar Forma",
      "Taxa de Proporção",
      "Preencher",
      "Ajustar",
      "Redefinir corte",
    ]);
    expect(rows[1].getAttribute("aria-haspopup")).toBe("menu");
    expect(rows[1].getAttribute("aria-expanded")).toBe("false");
    expect(
      rows[1].querySelector(".oasis-editor-tool-button-trailing-icon"),
    ).not.toBeNull();
    expect(
      rows[0].querySelector(".oasis-editor-tool-button-trailing-icon"),
    ).toBeNull();

    dispose();
  });

  it("opens shape and ratio submenus by click or hover", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const api = createApi();
    const dispose = render(() => <ImageCropMenu api={api} />, host);
    const shape = host.querySelector<HTMLButtonElement>(
      "[data-testid='editor-toolbar-image-crop-shape']",
    )!;
    const ratio = host.querySelector<HTMLButtonElement>(
      "[data-testid='editor-toolbar-image-crop-ratio']",
    )!;

    shape.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(
      host.querySelector(".oasis-editor-image-crop-flyout"),
    ).not.toBeNull();
    expect(shape.getAttribute("aria-expanded")).toBe("true");
    expect(
      host.querySelectorAll(".oasis-editor-image-crop-shape-tile").length,
    ).toBeGreaterThan(0);
    const shapeTile = host.querySelector<HTMLButtonElement>(
      ".oasis-editor-image-crop-shape-tile",
    )!;
    shapeTile.click();
    expect(api.execute).toHaveBeenCalledWith(
      "imageCropShape",
      shapeTile.dataset.testid?.replace("editor-toolbar-image-crop-shape-", ""),
    );
    expect(host.querySelector(".oasis-editor-image-crop-flyout")).toBeNull();

    ratio.click();
    expect(
      host.querySelectorAll(".oasis-editor-image-crop-flyout"),
    ).toHaveLength(1);
    expect(
      host.querySelector(".oasis-editor-image-crop-ratio-heading")?.textContent,
    ).toBe("Quadrado");

    dispose();
  });

  it("closes a submenu when the pointer leaves its item and flyout", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(() => <ImageCropMenu api={createApi()} />, host);
    const shape = host.querySelector<HTMLButtonElement>(
      "[data-testid='editor-toolbar-image-crop-shape']",
    )!;

    shape.click();
    expect(host.querySelector(".oasis-editor-image-crop-flyout")).not.toBeNull();

    const submenuRow = shape.closest(
      ".oasis-editor-image-crop-menu-submenu-row",
    );
    expect(submenuRow).not.toBeNull();
    submenuRow!.dispatchEvent(
      new MouseEvent("mouseleave", { bubbles: true }),
    );

    expect(host.querySelector(".oasis-editor-image-crop-flyout")).toBeNull();
    expect(shape.getAttribute("aria-expanded")).toBe("false");

    dispose();
  });

  it("keeps the parent menu open for submenu triggers and dispatches selections", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const api = createApi();
    const dispose = render(
      () => (
        <Menu icon="crop" label="Cortar">
          <ImageCropMenu api={api} />
        </Menu>
      ),
      host,
    );

    host
      .querySelector<HTMLButtonElement>(".oasis-editor-tool-button-dropdown")!
      .click();
    const shape = document.body.querySelector<HTMLButtonElement>(
      "[data-testid='editor-toolbar-image-crop-shape']",
    )!;
    shape.click();
    expect(
      document.body.querySelector(".oasis-editor-image-crop-flyout"),
    ).not.toBeNull();

    const ratio = document.body.querySelector<HTMLButtonElement>(
      "[data-testid='editor-toolbar-image-crop-ratio']",
    )!;
    ratio.click();
    document.body
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-toolbar-image-crop-16:9']",
      )!
      .click();
    expect(api.execute).toHaveBeenCalledWith("imageCropAspect", "16:9");
    expect(
      document.body.querySelector(".oasis-editor-image-crop-flyout"),
    ).toBeNull();
    expect(
      document.body.querySelector(".oasis-editor-toolbar-dropdown-menu"),
    ).toBeNull();

    dispose();
  });

  it("dispatches simple crop actions", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const api = createApi();
    const dispose = render(() => <ImageCropMenu api={api} />, host);

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-toolbar-image-crop-fill']",
      )!
      .click();
    expect(api.execute).toHaveBeenCalledWith("imageCropFill", undefined);

    dispose();
  });
});
