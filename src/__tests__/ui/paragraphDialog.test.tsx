import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import {
  ParagraphDialog,
  type ParagraphDialogApplyValues,
  type ParagraphDialogInitialValues,
} from "../../ui/components/Dialogs/ParagraphDialog.js";
import { setLocale } from "../../i18n/index.js";

function mountDialog(
  overrides: Partial<{
    initial: ParagraphDialogInitialValues;
    onApply: (
      values: ParagraphDialogApplyValues,
      original: ParagraphDialogInitialValues,
    ) => void;
    onClose: () => void;
  }> = {},
) {
  const initial: ParagraphDialogInitialValues = overrides.initial ?? {
    align: "left",
    indentLeft: "",
    indentRight: "",
    indentFirstLine: "",
    indentHanging: "",
    spacingBefore: "0",
    spacingAfter: "8",
    lineHeight: "1.16",
  };
  const onClose = overrides.onClose ?? vi.fn();
  const onApply = overrides.onApply ?? vi.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(
    () => (
      <ParagraphDialog
        isOpen
        initial={initial}
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

describe("ParagraphDialog", () => {
  it("applies alignment, indent and spacing changes", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, initial, dispose } = mountDialog({ onApply });

    const align = host.querySelector(
      "[data-testid='editor-paragraph-dialog-align']",
    ) as HTMLSelectElement;
    align.value = "justify";
    align.dispatchEvent(new Event("change", { bubbles: true }));

    const indentLeft = host.querySelector(
      "[data-testid='editor-paragraph-dialog-indent-left']",
    ) as HTMLInputElement;
    indentLeft.value = "36";
    indentLeft.dispatchEvent(new Event("input", { bubbles: true }));

    const spacingAfter = host.querySelector(
      "[data-testid='editor-paragraph-dialog-spacing-after']",
    ) as HTMLInputElement;
    spacingAfter.value = "12";
    spacingAfter.dispatchEvent(new Event("input", { bubbles: true }));

    const apply = host.querySelector(
      "[data-testid='editor-paragraph-dialog-apply']",
    ) as HTMLButtonElement;
    apply.click();

    expect(onApply).toHaveBeenCalledOnce();
    const [values, original] = onApply.mock.calls[0] as [
      ParagraphDialogApplyValues,
      ParagraphDialogInitialValues,
    ];
    expect(values.align).toBe("justify");
    expect(values.indentLeft).toBe(36);
    expect(values.indentRight).toBeNull();
    expect(values.spacingAfter).toBe(12);
    expect(values.lineHeight).toBe(1.16);
    expect(original).toEqual(initial);
    dispose();
  });

  it("derives first-line indent from the special selector", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, dispose } = mountDialog({ onApply });

    const special = host.querySelector(
      "[data-testid='editor-paragraph-dialog-special']",
    ) as HTMLSelectElement;
    special.value = "firstLine";
    special.dispatchEvent(new Event("change", { bubbles: true }));

    const by = host.querySelector(
      "[data-testid='editor-paragraph-dialog-special-by']",
    ) as HTMLInputElement;
    by.value = "24";
    by.dispatchEvent(new Event("input", { bubbles: true }));

    const apply = host.querySelector(
      "[data-testid='editor-paragraph-dialog-apply']",
    ) as HTMLButtonElement;
    apply.click();

    const [values] = onApply.mock.calls[0] as [
      ParagraphDialogApplyValues,
      ParagraphDialogInitialValues,
    ];
    expect(values.indentFirstLine).toBe(24);
    expect(values.indentHanging).toBeNull();
    dispose();
  });

  it("infers the hanging special option from initial values", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, dispose } = mountDialog({
      onApply,
      initial: {
        align: "left",
        indentLeft: "",
        indentRight: "",
        indentFirstLine: "",
        indentHanging: "18",
        spacingBefore: "",
        spacingAfter: "",
        lineHeight: "",
      },
    });

    const special = host.querySelector(
      "[data-testid='editor-paragraph-dialog-special']",
    ) as HTMLSelectElement;
    expect(special.value).toBe("hanging");

    const apply = host.querySelector(
      "[data-testid='editor-paragraph-dialog-apply']",
    ) as HTMLButtonElement;
    apply.click();

    const [values] = onApply.mock.calls[0] as [
      ParagraphDialogApplyValues,
      ParagraphDialogInitialValues,
    ];
    expect(values.indentHanging).toBe(18);
    expect(values.indentFirstLine).toBeNull();
    dispose();
  });
});
