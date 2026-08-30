import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { I18nProvider } from "@/i18n/I18nContext.js";
import { createTranslator } from "@/i18n/index.js";
import { SymbolDialog } from "@/ui/components/Dialogs/SymbolDialog.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SymbolDialog", () => {
  it("selects a Unicode character and inserts it from the modal", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onClose = vi.fn();
    const onInsert = vi.fn();
    const dispose = render(
      () => (
        <I18nProvider translator={createTranslator(() => "pt-BR")}>
          <SymbolDialog isOpen onClose={onClose} onInsert={onInsert} />
        </I18nProvider>
      ),
      host,
    );

    const category = host.querySelector<HTMLSelectElement>(
      "[data-testid='editor-symbol-dialog-category']",
    )!;
    category.value = "math";
    category.dispatchEvent(new Event("change", { bubbles: true }));
    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-symbol-dialog-U-00B1']",
      )
      ?.click();
    expect(
      host.querySelector("[data-testid='editor-symbol-dialog-preview']")
        ?.textContent,
    ).toBe("±");

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-symbol-dialog-insert']",
      )
      ?.click();
    expect(onInsert).toHaveBeenCalledWith("±", "Segoe UI Symbol");
    expect(onClose).toHaveBeenCalledOnce();

    dispose();
  });

  it("supports entering a Unicode code point", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onInsert = vi.fn();
    const dispose = render(
      () => (
        <I18nProvider translator={createTranslator(() => "en")}>
          <SymbolDialog isOpen onClose={() => undefined} onInsert={onInsert} />
        </I18nProvider>
      ),
      host,
    );

    const code = host.querySelector<HTMLInputElement>(
      "[data-testid='editor-symbol-dialog-code']",
    )!;
    code.value = "U+2605";
    code.dispatchEvent(new InputEvent("input", { bubbles: true }));
    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-symbol-dialog-insert']",
      )
      ?.click();

    expect(onInsert).toHaveBeenCalledWith("★", "Segoe UI Symbol");
    dispose();
  });
});
