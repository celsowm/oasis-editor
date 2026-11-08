import type { OasisPlugin } from "@/core/plugin.js";
import type { ActionCommandBuilder } from "../essentialsCommandBuilders.js";
import type { EssentialsBookmarkCapability } from "../essentialsCapabilities.js";

interface BookmarkGroupDeps {
  bookmark: EssentialsBookmarkCapability;
  actionCommand: ActionCommandBuilder;
}

export function buildBookmarkCommands({
  bookmark,
  actionCommand,
}: BookmarkGroupDeps): NonNullable<OasisPlugin["commands"]> {
  return {
    insertBookmark: actionCommand(
      "insertBookmark",
      (payload?: unknown): void => {
        bookmark.insert(
          typeof payload === "string" && payload.trim().length > 0
            ? payload
            : undefined,
        );
      },
    ),
    removeBookmark: actionCommand(
      "removeBookmark",
      (payload?: unknown): void => {
        if (typeof payload === "string") {
          bookmark.remove(payload);
        }
      },
    ),
  };
}
