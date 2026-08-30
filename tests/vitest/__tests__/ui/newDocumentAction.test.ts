import { describe, expect, it, vi } from "vitest";
import { buildEssentialsGate } from "@/ui/app/essentials/gate.js";
import { createNewDocumentAction } from "@/ui/app/newDocumentAction.js";

describe("new document action", () => {
  it("resets immediately when there are no unsaved changes", () => {
    const resetDocument = vi.fn();
    const requestConfirmation = vi.fn();

    createNewDocumentAction({
      isDirty: () => false,
      resetDocument,
      requestConfirmation,
    })();

    expect(resetDocument).toHaveBeenCalledOnce();
    expect(requestConfirmation).not.toHaveBeenCalled();
  });

  it("requests confirmation and preserves the document when dirty", () => {
    const resetDocument = vi.fn();
    const requestConfirmation = vi.fn();

    createNewDocumentAction({
      isDirty: () => true,
      resetDocument,
      requestConfirmation,
    })();

    expect(requestConfirmation).toHaveBeenCalledOnce();
    expect(resetDocument).not.toHaveBeenCalled();
  });

  it("disables new document in read-only mode", () => {
    const gate = buildEssentialsGate({ isReadOnly: () => true } as never);

    expect(gate.isCommandEnabled("newDocument")).toBe(false);
  });
});
