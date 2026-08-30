export interface NewDocumentActionDeps {
  isDirty: () => boolean;
  resetDocument: () => void;
  requestConfirmation: () => void;
}

/** Creates the shared New Document action used by the ribbon, menu and shortcut. */
export function createNewDocumentAction(
  deps: NewDocumentActionDeps,
): () => void {
  return (): void => {
    if (deps.isDirty()) {
      deps.requestConfirmation();
      return;
    }
    deps.resetDocument();
  };
}
