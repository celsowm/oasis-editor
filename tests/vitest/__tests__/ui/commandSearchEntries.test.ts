import { describe, expect, it } from "vitest";
import { buildCommandSearchEntries } from "@/ui/app/commandSearchEntries.js";
import { en } from "@/i18n/locales/en.js";
import type { TranslateFn } from "@/i18n/index.js";

const t = ((key: string): string =>
  (en as Record<string, string>)[key] ?? key) as unknown as TranslateFn;

describe("buildCommandSearchEntries", () => {
  it("maps toolbar commands to entries with their localized labels", () => {
    const entries = buildCommandSearchEntries(
      [
        {
          id: "editor-toolbar-bold",
          type: "toggle",
          testId: "editor-toolbar-bold",
          iconName: "bold",
          labelKey: "toolbar.bold",
          label: "Bold",
          tooltipKey: "toolbar.bold",
          command: "bold",
        } as never,
        {
          id: "sep-1",
          type: "separator",
        } as never,
      ],
      [],
      t,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      label: "Bold",
      command: "bold",
      source: "ribbon",
    });
  });

  it("menubar entries fill gaps the ribbon does not cover", () => {
    const entries = buildCommandSearchEntries(
      [],
      [
        {
          id: "tools_command_search",
          path: "Tools/Command Search",
          labelKey: "menu.tools.commandSearch" as never,
          command: "openCommandSearch",
          shortcut: "Ctrl+K",
        },
      ],
      t,
    );
    expect(entries).toEqual([
      expect.objectContaining({
        command: "openCommandSearch",
        label: "Command search…",
        shortcut: "Ctrl+K",
        source: "menubar",
      }),
    ]);
  });

  it("ribbon wins over the menubar for the same command", () => {
    const entries = buildCommandSearchEntries(
      [
        {
          id: "editor-toolbar-find",
          type: "button",
          testId: "editor-toolbar-find",
          iconName: "search",
          labelKey: "toolbar.search",
          label: "Search text",
          tooltipKey: "toolbar.search",
          command: "find",
        } as never,
      ],
      [
        {
          id: "edit_find",
          path: "Edit/Find",
          labelKey: "menu.edit.find" as never,
          command: "find",
          shortcut: "Ctrl+F",
        },
      ],
      t,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe("Search text");
    expect(entries[0].source).toBe("ribbon");
  });

  it("keeps payload commands resolvable", () => {
    const entries = buildCommandSearchEntries(
      [
        {
          id: "margins-wide",
          type: "button",
          testId: "margins-wide",
          iconName: "frame",
          labelKey: "menu.pageMarginsWide",
          label: "Wide margins",
          tooltipKey: "menu.pageMarginsWide",
          command: { name: "setMarginPreset", payload: "wide" },
        } as never,
      ],
      [],
      t,
    );
    expect(entries[0]).toMatchObject({
      command: "setMarginPreset",
      payload: "wide",
    });
  });

  it("skips hidden and command-less items", () => {
    const entries = buildCommandSearchEntries(
      [
        {
          id: "hidden-one",
          type: "button",
          testId: "hidden-one",
          iconName: "x",
          label: "Hidden",
          hidden: true,
          command: "bold",
        } as never,
        {
          id: "no-command",
          type: "separator",
        } as never,
      ],
      [{ id: "menu-hidden", path: "Tools/Hidden", hidden: true, command: "openSymbolDialog" }],
      t,
    );
    expect(entries).toEqual([]);
  });
});
