import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { RevisionBulkDialog } from "@/ui/components/Dialogs/RevisionBulkDialog.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("RevisionBulkDialog", () => {
  it("states the document scope and the number of changes", () => {
    const { host, dispose } = mountDialog({ action: "accept", count: 3 });

    expect(
      host.querySelector("[data-testid='editor-revision-bulk-dialog']"),
    ).not.toBeNull();
    const message = host.querySelector(
      "[data-testid='editor-revision-bulk-message']",
    )?.textContent;
    expect(message).toContain("3");
    expect(message).toContain("cabeçalhos");
    expect(
      host.querySelector("[data-testid='editor-revision-bulk-confirm']")
        ?.textContent,
    ).toContain("Aceitar tudo");

    dispose();
  });

  it("labels reject-all distinctly from accept-all", () => {
    const { host, dispose } = mountDialog({ action: "reject", count: 7 });

    const message = host.querySelector(
      "[data-testid='editor-revision-bulk-message']",
    )?.textContent;
    expect(message).toContain("7");
    expect(
      host.querySelector("[data-testid='editor-revision-bulk-confirm']")
        ?.textContent,
    ).toContain("Rejeitar tudo");

    dispose();
  });

  it("forwards cancel and confirm without applying on cancel", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const { host, dispose } = mountDialog({ onClose, onConfirm });

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-revision-bulk-cancel']",
      )
      ?.click();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='editor-revision-bulk-confirm']",
      )
      ?.click();
    expect(onConfirm).toHaveBeenCalledOnce();

    dispose();
  });
});

function mountDialog(
  overrides: Partial<{
    action: "accept" | "reject";
    count: number;
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
      <RevisionBulkDialog
        isOpen
        action={overrides.action ?? "accept"}
        count={overrides.count ?? 0}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    ),
    host,
  );
  return { host, onClose, onConfirm, dispose };
}
