import {
  editHeaderFooter,
  exitHeaderFooter,
  insertPageNumber,
} from "@/core/commands/headerFooter.js";
import { insertPageNumberField } from "@/core/commands/pageNumber.js";
import type { EssentialsHeaderFooterCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

/**
 * Header/footer authoring capability: bridges the core header/footer story
 * commands onto the editor's transactional state pipeline so edits enter the
 * undo/redo history and are grouped like other document mutations.
 */
export function buildEssentialsHeaderFooter(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsHeaderFooterCapability {
  const transactional = (
    producer: (
      state: ReturnType<CreateEditorEssentialsPluginOptions["state"]>,
    ) => ReturnType<CreateEditorEssentialsPluginOptions["state"]>,
  ): void => {
    options.applyTransactionalState(producer);
    options.focusInput();
  };

  return {
    editHeader: (): void =>
      transactional((state) => editHeaderFooter(state, "header")),
    editFooter: (): void =>
      transactional((state) => editHeaderFooter(state, "footer")),
    insertPageNumber: (): void =>
      transactional((state) => insertPageNumber(state)),
    insertPageNumberXOfY: (): void =>
      transactional((state) => insertPageNumberField(state, "xOfY")),
    exit: (): void => transactional((state) => exitHeaderFooter(state)),
    isInHeaderFooter: (): boolean => {
      const zone = options.state().activeZone;
      return zone === "header" || zone === "footer";
    },
  };
}
