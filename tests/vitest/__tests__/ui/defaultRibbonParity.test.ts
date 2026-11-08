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
  ["editor-toolbar-find", "find", "home", "editing"],
  ["editor-toolbar-select-all", "selectAll", "home", "editing"],
  ["editor-toolbar-page-break", "pageBreak", "insert", "pages"],
  ["editor-toolbar-insert-toc", "insertTableOfContents", "references", "tableOfContents"],
  ["editor-toolbar-update-toc", "updateTableOfContents", "references", "tableOfContents"],
  ["editor-toolbar-track-changes", "toggleTrackChanges", "review", "tracking"],
  ["editor-toolbar-accept-revisions", "acceptRevisions", "review", "changes"],
  ["editor-toolbar-reject-revisions", "rejectRevisions", "review", "changes"],
  ["editor-toolbar-show-margins", "toggleShowMargins", "view", "show"],
  ["editor-toolbar-show-paragraph-marks", "toggleShowParagraphMarks", "view", "show"],
  ["editor-toolbar-precise-fonts", "togglePreciseFonts", "view", "show"],
] as const;

describe("WordCraft Ribbon parity: first Oasis exposure slice", () => {
  it.each(exposed)("binds %s to the existing %s command in %s/%s", (id, command, tab, group) => {
    const item = items.find((candidate) => candidate.id === id);
    expect(item).toBeDefined();
    expect(item?.tab).toBe(tab);
    expect(item?.group).toBe(group);
    expect(item && "command" in item ? item.command : undefined).toBe(command);
    expect(OASIS_BUILTIN_COMMANDS).toContain(command);
  });

  it("offers Paste and Paste as Plain Text from the same Ribbon split control", () => {
    const paste = items.find((item) => item.id === "editor-toolbar-paste");
    expect(paste?.type).toBe("split");
    if (paste?.type !== "split") throw new Error("Paste split control is missing");
    expect(paste.command).toBe("paste");
    expect(paste.tab).toBe("home");
    expect(paste.group).toBe("clipboard");
    expect(paste.menu.kind).toBe("items");
    if (paste.menu.kind !== "items") throw new Error("Paste menu has no items");
    expect(paste.menu.items.map((item) =>
      item.type === "button" ? item.command : undefined
    )).toEqual(["paste", "pasteMergeFormatting", "pasteAsPlainText"]);
  });

  it("shows Review and View only after they have real controls", () => {
    const tabs = buildRibbonTabDefinitions(t, undefined, items).map((tab) => tab.id);
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
});
