import {
  createBookmark,
  listBookmarks,
  removeBookmark,
} from "@/core/commands/bookmark.js";
import type { EssentialsBookmarkCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

/**
 * Bookmark authoring capability: bridges the core bookmark commands onto the
 * editor's transactional state pipeline so creating/removing bookmarks enter
 * the undo/redo history like other document mutations.
 */
export function buildEssentialsBookmark(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsBookmarkCapability {
  return {
    insert: (name?: string): void => {
      options.applyTransactionalState((state) => createBookmark(state, name));
      options.focusInput();
    },
    remove: (id: string): void => {
      options.applyTransactionalState((state) => removeBookmark(state, id));
      options.focusInput();
    },
    list: () =>
      listBookmarks(options.state()).map((bookmark) => ({
        id: bookmark.id,
        name: bookmark.name,
      })),
  };
}
