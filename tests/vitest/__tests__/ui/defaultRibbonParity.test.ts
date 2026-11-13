import { describe, expect, it } from "vitest";
import { OASIS_BUILTIN_COMMANDS } from "@/core/commands/builtinCommands.js";
import type { TranslateFn } from "@/i18n/index.js";
import { createDefaultToolbarPreset } from "@/ui/components/Toolbar/presets/defaultToolbar.js";
import { buildRibbonTabDefinitions } from "@/ui/components/Toolbar/ribbon/ribbonModel.js";

const t: TranslateFn = (key) => key;
const items = createDefaultToolbarPreset(t);

const exposed = [
  ["editor-toolbar-copy", "copy", "home", "clipboard"],
  ["editor-toolbar-cut", "cut", "home", "clipboard"],
  ["editor-toolbar-format-painter", "formatPainter", "home", "clipboard"],
  ["editor-toolbar-find", "find", "home", "editing"],
  ["editor-toolbar-select-all", "selectAll", "home", "editing"],
  ["editor-toolbar-page-break", "pageBreak", "insert", "pages"],
  [
    "editor-toolbar-insert-toc",
    "insertTableOfContents",
    "references",
    "tableOfContents",
  ],
  [
    "editor-toolbar-update-toc",
    "updateTableOfContents",
    "references",
    "tableOfContents",
  ],
  ["editor-toolbar-track-changes", "toggleTrackChanges", "review", "tracking"],
  ["editor-toolbar-accept-revisions", "acceptRevisions", "review", "changes"],
  ["editor-toolbar-reject-revisions", "rejectRevisions", "review", "changes"],
  ["editor-toolbar-previous-revision", "previousRevision", "review", "changes"],
  ["editor-toolbar-next-revision", "nextRevision", "review", "changes"],
  [
    "editor-toolbar-comments-panel",
    "toggleCommentsPanel",
    "review",
    "comments",
  ],
  ["editor-toolbar-new-comment", "newComment", "review", "comments"],
  ["editor-toolbar-reply-comment", "replyComment", "review", "comments"],
  ["editor-toolbar-edit-comment", "editComment", "review", "comments"],
  ["editor-toolbar-previous-comment", "previousComment", "review", "comments"],
  ["editor-toolbar-next-comment", "nextComment", "review", "comments"],
  ["editor-toolbar-resolve-comment", "resolveComment", "review", "comments"],
  ["editor-toolbar-reopen-comment", "reopenComment", "review", "comments"],
  ["editor-toolbar-delete-comment", "deleteComment", "review", "comments"],
  ["editor-toolbar-show-margins", "toggleShowMargins", "view", "show"],
  [
    "editor-toolbar-show-paragraph-marks",
    "toggleShowParagraphMarks",
    "view",
    "show",
  ],
  ["editor-toolbar-precise-fonts", "togglePreciseFonts", "view", "show"],
] as const;

describe("WordCraft Ribbon parity: first Oasis exposure slice", () => {
  it.each(exposed)(
    "binds %s to the existing %s command in %s/%s",
    (id, command, tab, group) => {
      const item = items.find((candidate) => candidate.id === id);
      expect(item).toBeDefined();
      expect(item?.tab).toBe(tab);
      expect(item?.group).toBe(group);
      expect(item && "command" in item ? item.command : undefined).toBe(
        command,
      );
      expect(OASIS_BUILTIN_COMMANDS).toContain(command);
    },
  );

  it("offers Paste and Paste as Plain Text from the same Ribbon split control", () => {
    const paste = items.find((item) => item.id === "editor-toolbar-paste");
    expect(paste?.type).toBe("split");
    if (paste?.type !== "split")
      throw new Error("Paste split control is missing");
    expect(paste.command).toBe("paste");
    expect(paste.tab).toBe("home");
    expect(paste.group).toBe("clipboard");
    expect(paste.menu.kind).toBe("items");
    if (paste.menu.kind !== "items") throw new Error("Paste menu has no items");
    expect(
      paste.menu.items.map((item) =>
        item.type === "button" ? item.command : undefined,
      ),
    ).toEqual(["paste", "pasteMergeFormatting", "pasteAsPlainText"]);
  });

  it("provides one-shot, continuous, and cancellation commands in the painter split menu", () => {
    const painter = items.find(
      (item) => item.id === "editor-toolbar-format-painter",
    );
    expect(painter?.type).toBe("split");
    if (painter?.type !== "split") throw new Error("Format painter is missing");
    expect(painter.command).toBe("formatPainter");
    expect(painter.menu.kind).toBe("items");
    if (painter.menu.kind !== "items")
      throw new Error("Format painter menu is missing");
    expect(
      painter.menu.items.map((item) =>
        item.type === "button" ? item.command : undefined,
      ),
    ).toEqual([
      "formatPainter",
      "formatPainterContinuous",
      "cancelFormatPainter",
    ]);
  });

  it("shows Review and View only after they have real controls", () => {
    const tabs = buildRibbonTabDefinitions(t, undefined, items).map(
      (tab) => tab.id,
    );
    expect(tabs).toContain("review");
    expect(tabs).toContain("view");
    expect(tabs).toContain("references");
  });

  it("marks document display and change-tracking controls as toggles", () => {
    for (const id of [
      "editor-toolbar-track-changes",
      "editor-toolbar-show-margins",
      "editor-toolbar-show-paragraph-marks",
      "editor-toolbar-precise-fonts",
    ]) {
      expect(items.find((item) => item.id === id)?.type).toBe("toggle");
    }
  });

  it("does not introduce duplicate toolbar ids", () => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("keeps Paste large beside a compact three-command stack and separates history", () => {
    const paste = items.find((item) => item.id === "editor-toolbar-paste");
    expect(paste && "ribbonSize" in paste ? paste.ribbonSize : undefined).toBe(
      "large",
    );
    expect(paste?.ribbonGroupLayout).toBe("compact");
    for (const [id, row] of [
      ["cut", 1],
      ["copy", 2],
      ["format-painter", 3],
    ] as const) {
      const item = items.find((item) => item.id === `editor-toolbar-${id}`);
      expect(item?.row).toBe(row);
      expect(
        item && "ribbonSize" in item ? item.ribbonSize : undefined,
      ).not.toBe("large");
    }
    expect(items.find((item) => item.id === "editor-toolbar-undo")?.group).toBe(
      "history",
    );
    expect(items.find((item) => item.id === "editor-toolbar-redo")?.group).toBe(
      "history",
    );
  });
});
