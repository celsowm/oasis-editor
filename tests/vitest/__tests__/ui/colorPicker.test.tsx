import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { ColorPicker } from "@/ui/components/Toolbar/primitives/ColorPicker.js";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("ColorPicker availability", () => {
  it("closes a focused palette when revoked and ignores a late native color event", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const [disabled, setDisabled] = createSignal(false);
    const apply = vi.fn(),
      restoreFocus = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <ColorPicker
          kind="color"
          icon="type"
          value="rgb(255,0,0)"
          defaultValue="#000000"
          lastValue="#0070c0"
          disabled={disabled()}
          onUnavailableFocus={restoreFocus}
          tooltip="Font color"
          testId="color"
          palette={{
            themeColors: [{ name: "Red", values: ["#ff0000"] }],
            standardColors: [],
            allowCustom: true,
          }}
          themeColorsLabel="Theme colors"
          standardColorsLabel="Standard colors"
          moreColorsLabel="More colors"
          onApply={apply}
        />
      ),
      host,
    );
    const menu = host.querySelector<HTMLButtonElement>(
      '[data-testid="color-dropdown"]',
    )!;
    menu.click();
    const swatch = document.querySelector<HTMLButtonElement>(
      '[data-testid="color-theme-swatch-ff0000"]',
    )!;
    const custom = document.querySelector<HTMLInputElement>(
      '[data-testid="color-custom-input"]',
    )!;
    expect(swatch.getAttribute("role")).toBe("menuitemradio");
    expect(swatch.getAttribute("aria-checked")).toBe("true");
    swatch.focus();
    setDisabled(true);
    await Promise.resolve();
    expect(
      document.querySelector('[data-testid="color-theme-swatch-ff0000"]'),
    ).toBeNull();
    expect(
      host.querySelector<HTMLButtonElement>('[data-testid="color-dropdown"]')!
        .disabled,
    ).toBe(true);
    expect(restoreFocus).toHaveBeenCalledTimes(1);
    custom.value = "#00b050";
    custom.dispatchEvent(new Event("input", { bubbles: true }));
    expect(apply).not.toHaveBeenCalled();
    setDisabled(false);
    expect(
      host
        .querySelector<HTMLButtonElement>('[data-testid="color-dropdown"]')!
        .getAttribute("aria-expanded"),
    ).toBe("false");
    host.querySelector<HTMLButtonElement>('[data-testid="color"]')!.click();
    expect(apply).toHaveBeenCalledExactlyOnceWith("#0070c0");
    dispose();
  });
});
