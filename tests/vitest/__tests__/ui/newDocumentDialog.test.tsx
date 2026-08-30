import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { NewDocumentConfirmationDialog } from "@/ui/components/Dialogs/NewDocumentConfirmationDialog.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NewDocumentConfirmationDialog", () => {
  it("shows the discard warning and exposes cancel/discard actions", () => {
    const { host, dispose } = mountDialog();

    expect(host.querySelector("[data-testid='editor-dialog']")).not.toBeNull();
    expect(
      host.querySelector("[data-testid='editor-new-document-message']")
        ?.textContent,
    ).toContain("alterações não salvas");
    expect(
      host.querySelector("[data-testid='editor-new-document-cancel']")
        ?.textContent,
    ).toContain("Cancelar");
    expect(
      host.querySelector("[data-testid='editor-new-document-discard']")
        ?.textContent,
    ).toContain("Descartar");

    dispose();
  });

  it("forwards cancel and discard actions", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const { host, dispose } = mountDialog({ onClose, onConfirm });

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-new-document-cancel']",
      )
      ?.click();
    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-new-document-discard']",
      )
      ?.click();

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
    dispose();
  });
});

function mountDialog(
  overrides: Partial<{
    onClose: () => void;
    onConfirm: () => void;
  }> = {},
) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const onClose = overrides.onClose ?? vi.fn();
  const onConfirm = overrides.onConfirm ?? vi.fn();
  const dispose = render(
    () => (
      <NewDocumentConfirmationDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
      />
    ),
    host,
  );
  return { host, onClose, onConfirm, dispose };
}
