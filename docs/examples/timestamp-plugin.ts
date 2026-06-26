import type { OasisPlugin } from "oasis-editor";

export const TimestampPlugin: OasisPlugin = {
  name: "Timestamp",
  commands: {
    insertTimestamp: {
      execute: () => new Date().toISOString(),
      refresh: () => ({ isEnabled: true }),
    },
  },
  toolbar: [
    {
      id: "insertTimestamp",
      command: "insertTimestamp",
      tab: "plugins",
      group: "automation",
      icon: "clock-3",
      ribbonGroupResize: {
        priority: 30,
        compactMinWidth: 120,
        collapsedIcon: "clock-3",
      },
    },
  ],
  menubar: [
    {
      id: "insert_timestamp",
      path: "Insert/Timestamp",
      command: "insertTimestamp",
      shortcut: "Ctrl+Alt+T",
    },
  ],
  keymaps: [{ key: "Ctrl+Alt+T", command: "insertTimestamp" }],
};
