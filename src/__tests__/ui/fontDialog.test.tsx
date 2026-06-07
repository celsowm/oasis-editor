import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import {
  FontDialog,
  type FontDialogApplyValues,
  type FontDialogInitialValues,
} from "../../ui/components/Dialogs/FontDialog.js";
import { setLocale } from "../../i18n/index.js";

function mountDialog(
  overrides: Partial<{
    initial: FontDialogInitialValues;
    onApply: (
      values: FontDialogApplyValues,
      original: FontDialogInitialValues,
    ) => void;
    onClose: () => void;
  }> = {},
) {
  const initial: FontDialogInitialValues = overrides.initial ?? {
    fontFamily: "Arial",
    fontSize: "12",
    color: "#111827",
    colorMode: "custom",
    highlight: "#fef08a",
    shading: "",
    bold: false,
    italic: false,
    underline: false,
    underlineStyle: null,
    underlineColor: "#111827",
    strike: false,
    doubleStrike: false,
    superscript: false,
    subscript: false,
    smallCaps: false,
    allCaps: false,
    hidden: false,
    characterScale: "",
    characterSpacing: "",
    baselineShift: "",
    kerningThreshold: "",
    ligatures: "",
    numberSpacing: "",
    numberForm: "",
    stylisticSet: "",
    contextualAlternates: false,
  };
  const onClose = overrides.onClose ?? vi.fn();
  const onApply = overrides.onApply ?? vi.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(
    () => (
      <FontDialog
        isOpen
        initial={initial}
        familyOptions={["Arial", "Calibri", "Courier New"]}
        sizeOptions={[12, 14, 18]}
        onClose={onClose}
        onApply={onApply}
      />
    ),
    host,
  );
  return { host, initial, onClose, onApply, dispose };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("FontDialog", () => {
  it("switches tabs with keyboard navigation", () => {
    setLocale("en");
    const { host, dispose } = mountDialog();
    const tablist = host.querySelector("[role='tablist']") as HTMLDivElement;
    tablist.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    const advancedPlaceholder = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-placeholder']",
    );
    expect(advancedPlaceholder).toBeTruthy();
    dispose();
  });

  it("keeps style list and bold/italic checkboxes in sync", () => {
    setLocale("en");
    const { host, dispose } = mountDialog();
    const styleList = host.querySelector(
      "[data-testid='editor-font-dialog-style-list']",
    ) as HTMLSelectElement;
    styleList.value = "boldItalic";
    styleList.dispatchEvent(new Event("change", { bubbles: true }));

    const bold = host.querySelector(
      "[data-testid='editor-font-dialog-bold']",
    ) as HTMLInputElement;
    const italic = host.querySelector(
      "[data-testid='editor-font-dialog-italic']",
    ) as HTMLInputElement;
    expect(bold.checked).toBe(true);
    expect(italic.checked).toBe(true);
    dispose();
  });

  it("enforces superscript/subscript mutual exclusion", () => {
    setLocale("en");
    const { host, dispose } = mountDialog();
    const superInput = host.querySelector(
      "[data-testid='editor-font-dialog-superscript']",
    ) as HTMLInputElement;
    const subInput = host.querySelector(
      "[data-testid='editor-font-dialog-subscript']",
    ) as HTMLInputElement;

    superInput.checked = true;
    superInput.dispatchEvent(new Event("change", { bubbles: true }));
    expect(superInput.checked).toBe(true);

    subInput.checked = true;
    subInput.dispatchEvent(new Event("change", { bubbles: true }));
    expect(subInput.checked).toBe(true);
    expect(superInput.checked).toBe(false);
    dispose();
  });

  it("maps no underline + automatic color to null on apply", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, initial, dispose } = mountDialog({ onApply });

    const underlineStyle = host.querySelector(
      "[data-testid='editor-font-dialog-underline-style']",
    ) as HTMLSelectElement;
    underlineStyle.value = "none";
    underlineStyle.dispatchEvent(new Event("change", { bubbles: true }));

    const colorMode = host.querySelector(
      "[data-testid='editor-font-dialog-color-mode']",
    ) as HTMLSelectElement;
    colorMode.value = "automatic";
    colorMode.dispatchEvent(new Event("change", { bubbles: true }));

    const applyButton = host.querySelector(
      "[data-testid='editor-font-dialog-apply']",
    ) as HTMLButtonElement;
    applyButton.click();

    expect(onApply).toHaveBeenCalledOnce();
    const [values, original] = onApply.mock.calls[0] as [
      FontDialogApplyValues,
      FontDialogInitialValues,
    ];
    expect(values.underline).toBe(false);
    expect(values.underlineStyle).toBeNull();
    expect(values.color).toBeNull();
    expect(original).toEqual(initial);
    dispose();
  });

  it("applies text shading from the font tab", () => {
    setLocale("en");
    const onApply = vi.fn();
    const customInitial: FontDialogInitialValues = {
      fontFamily: "Arial",
      fontSize: "12",
      color: "#111827",
      colorMode: "custom",
      highlight: "",
      shading: "#fef3c7",
      bold: false,
      italic: false,
      underline: false,
      underlineStyle: null,
      underlineColor: "#111827",
      strike: false,
      doubleStrike: false,
      superscript: false,
      subscript: false,
      smallCaps: false,
      allCaps: false,
      hidden: false,
      characterScale: "",
      characterSpacing: "",
      baselineShift: "",
      kerningThreshold: "",
      ligatures: "",
      numberSpacing: "",
      numberForm: "",
      stylisticSet: "",
      contextualAlternates: false,
    };
    const { host, initial, dispose } = mountDialog({
      onApply,
      initial: customInitial,
    });

    const shading = host.querySelector(
      "[data-testid='editor-font-dialog-shading']",
    ) as HTMLInputElement;
    expect(shading.value).toBe("#fef3c7");
    shading.value = "#dbeafe";
    shading.dispatchEvent(new Event("input", { bubbles: true }));

    const applyButton = host.querySelector(
      "[data-testid='editor-font-dialog-apply']",
    ) as HTMLButtonElement;
    applyButton.click();

    const [values, original] = onApply.mock.calls[0] as [
      FontDialogApplyValues,
      FontDialogInitialValues,
    ];
    expect(values.shading).toBe("#dbeafe");
    expect(original).toEqual(initial);
    dispose();
  });

  it("shows a validation message for invalid custom size", () => {
    setLocale("en");
    const { host, dispose } = mountDialog();
    const sizeInput = host.querySelector(
      "[data-testid='editor-font-dialog-custom-size']",
    ) as HTMLInputElement;
    sizeInput.value = "0";
    sizeInput.dispatchEvent(new Event("input", { bubbles: true }));

    const bodyText = host.textContent ?? "";
    expect(bodyText.includes("Enter a number greater than 0.")).toBe(true);
    dispose();
  });

  it("applies phase-4 effects and keeps strike/double-strike exclusive", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, dispose } = mountDialog({ onApply });
    const strike = host.querySelector(
      "[data-testid='editor-font-dialog-strike']",
    ) as HTMLInputElement;
    const doubleStrike = host.querySelector(
      "[data-testid='editor-font-dialog-double-strike']",
    ) as HTMLInputElement;
    const allCaps = host.querySelector(
      "[data-testid='editor-font-dialog-all-caps']",
    ) as HTMLInputElement;
    const hidden = host.querySelector(
      "[data-testid='editor-font-dialog-hidden']",
    ) as HTMLInputElement;
    const underlineColor = host.querySelector(
      "[data-testid='editor-font-dialog-underline-color']",
    ) as HTMLInputElement;
    const underlineStyle = host.querySelector(
      "[data-testid='editor-font-dialog-underline-style']",
    ) as HTMLSelectElement;

    strike.checked = true;
    strike.dispatchEvent(new Event("change", { bubbles: true }));
    doubleStrike.checked = true;
    doubleStrike.dispatchEvent(new Event("change", { bubbles: true }));
    expect(doubleStrike.checked).toBe(true);
    expect(strike.checked).toBe(false);

    allCaps.checked = true;
    allCaps.dispatchEvent(new Event("change", { bubbles: true }));
    hidden.checked = true;
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
    underlineStyle.value = "double";
    underlineStyle.dispatchEvent(new Event("change", { bubbles: true }));
    underlineColor.value = "#ff0000";
    underlineColor.dispatchEvent(new Event("input", { bubbles: true }));

    const applyButton = host.querySelector(
      "[data-testid='editor-font-dialog-apply']",
    ) as HTMLButtonElement;
    applyButton.click();
    const [values] = onApply.mock.calls[0] as [
      FontDialogApplyValues,
      FontDialogInitialValues,
    ];
    expect(values.doubleStrike).toBe(true);
    expect(values.strike).toBe(false);
    expect(values.allCaps).toBe(true);
    expect(values.hidden).toBe(true);
    expect(values.underlineStyle).toBe("double");
    expect(values.underlineColor).toBe("#ff0000");
    dispose();
  });

  it("applies advanced spacing, position, scale and kerning values", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, dispose } = mountDialog({ onApply });
    const advancedTab = host.querySelector(
      "[data-testid='editor-font-dialog-tab-advanced']",
    ) as HTMLButtonElement;
    advancedTab.click();

    const scale = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-scale']",
    ) as HTMLSelectElement;
    const spacingMode = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-spacing-mode']",
    ) as HTMLSelectElement;
    const spacingAmount = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-spacing-amount']",
    ) as HTMLInputElement;
    const positionMode = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-position-mode']",
    ) as HTMLSelectElement;
    const positionAmount = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-position-amount']",
    ) as HTMLInputElement;
    const kerningEnabled = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-kerning-enabled']",
    ) as HTMLInputElement;
    const kerning = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-kerning']",
    ) as HTMLInputElement;

    scale.value = "120";
    scale.dispatchEvent(new Event("change", { bubbles: true }));
    spacingMode.value = "condensed";
    spacingMode.dispatchEvent(new Event("change", { bubbles: true }));
    spacingAmount.value = "1.5";
    spacingAmount.dispatchEvent(new Event("input", { bubbles: true }));
    positionMode.value = "raised";
    positionMode.dispatchEvent(new Event("change", { bubbles: true }));
    positionAmount.value = "2";
    positionAmount.dispatchEvent(new Event("input", { bubbles: true }));
    kerningEnabled.checked = true;
    kerningEnabled.dispatchEvent(new Event("change", { bubbles: true }));
    kerning.value = "14";
    kerning.dispatchEvent(new Event("input", { bubbles: true }));

    const applyButton = host.querySelector(
      "[data-testid='editor-font-dialog-apply']",
    ) as HTMLButtonElement;
    applyButton.click();
    const [values] = onApply.mock.calls[0] as [
      FontDialogApplyValues,
      FontDialogInitialValues,
    ];
    expect(values.characterScale).toBe(120);
    expect(values.characterSpacing).toBe(-1.5);
    expect(values.baselineShift).toBe(2);
    expect(values.kerningThreshold).toBe(14);
    dispose();
  });

  it("applies OpenType values and keeps the apply test id with OK label", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, dispose } = mountDialog({ onApply });
    const advancedTab = host.querySelector(
      "[data-testid='editor-font-dialog-tab-advanced']",
    ) as HTMLButtonElement;
    advancedTab.click();

    const ligatures = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-ligatures']",
    ) as HTMLSelectElement;
    const numberSpacing = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-number-spacing']",
    ) as HTMLSelectElement;
    const numberForm = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-number-form']",
    ) as HTMLSelectElement;
    const stylisticSet = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-stylistic-set']",
    ) as HTMLSelectElement;
    const contextualAlternates = host.querySelector(
      "[data-testid='editor-font-dialog-advanced-contextual-alternates']",
    ) as HTMLInputElement;

    ligatures.value = "standardContextual";
    ligatures.dispatchEvent(new Event("change", { bubbles: true }));
    numberSpacing.value = "tabular";
    numberSpacing.dispatchEvent(new Event("change", { bubbles: true }));
    numberForm.value = "oldStyle";
    numberForm.dispatchEvent(new Event("change", { bubbles: true }));
    stylisticSet.value = "7";
    stylisticSet.dispatchEvent(new Event("change", { bubbles: true }));
    contextualAlternates.checked = true;
    contextualAlternates.dispatchEvent(new Event("change", { bubbles: true }));

    const applyButton = host.querySelector(
      "[data-testid='editor-font-dialog-apply']",
    ) as HTMLButtonElement;
    expect(applyButton.textContent?.trim()).toBe("OK");
    applyButton.click();

    const [values] = onApply.mock.calls[0] as [
      FontDialogApplyValues,
      FontDialogInitialValues,
    ];
    expect(values.ligatures).toBe("standardContextual");
    expect(values.numberSpacing).toBe("tabular");
    expect(values.numberForm).toBe("oldStyle");
    expect(values.stylisticSet).toBe(7);
    expect(values.contextualAlternates).toBe(true);
    dispose();
  });
});
