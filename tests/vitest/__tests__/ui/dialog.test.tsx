import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { Dialog } from "../../../../src/ui/components/Dialogs/Dialog.js";

function mountDialog(
  overrides: Partial<{
    onClose: () => void;
    closeOnOverlayClick: boolean;
  }> = {},
) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const onClose = overrides.onClose ?? vi.fn();
  const dispose = render(
    () => (
      <Dialog
        isOpen
        title="Plugin dialog"
        onClose={onClose}
        footer={<button type="button">Apply</button>}
        class="plugin-dialog"
        bodyClass="plugin-dialog-body"
        size="lg"
        titleId="plugin-dialog-title"
        ariaDescribedBy="plugin-dialog-help"
        closeOnOverlayClick={overrides.closeOnOverlayClick}
      >
        <p id="plugin-dialog-help">Body</p>
      </Dialog>
    ),
    host,
  );
  return { host, onClose, dispose };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Dialog", () => {
  it("renders title, body and footer with public classes and aria attributes", () => {
    const { host, dispose } = mountDialog();
    const dialog = host.querySelector(
      "[data-testid='editor-dialog']",
    ) as HTMLDivElement;
    const body = host.querySelector(
      "[data-testid='editor-dialog-body']",
    ) as HTMLDivElement;

    expect(dialog.textContent).toContain("Plugin dialog");
    expect(dialog.textContent).toContain("Body");
    expect(dialog.textContent).toContain("Apply");
    expect(dialog.classList.contains("plugin-dialog")).toBe(true);
    expect(dialog.classList.contains("oasis-editor-dialog-lg")).toBe(true);
    expect(body.classList.contains("plugin-dialog-body")).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBe("plugin-dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("plugin-dialog-help");
    dispose();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    const { dispose } = mountDialog({ onClose });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledOnce();
    dispose();
  });

  it("respects closeOnOverlayClick", () => {
    const onClose = vi.fn();
    const { host, dispose } = mountDialog({
      onClose,
      closeOnOverlayClick: false,
    });
    const overlay = host.querySelector(
      ".oasis-editor-dialog-overlay",
    ) as HTMLDivElement;
    overlay.click();
    expect(onClose).not.toHaveBeenCalled();
    dispose();
  });
});
