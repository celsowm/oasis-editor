<p align="center">
  <img src="branding/generated/logo-full.png" alt="Oasis Editor" width="340" />
</p>

<p align="center">
  A modern, extensible document editor for rich word-processing experiences on the web.
</p>

<p align="center">
  <code>npm install oasis-editor</code>
</p>

# Oasis Editor

Oasis Editor is a browser-based document editor built for applications that need
more than a textarea: paged editing, rich formatting, tables, import/export
workflows, command-driven UI, and a plugin surface that can grow with your
product.

It ships as a TypeScript package with a vanilla embed API, React and Vue
adapters, a headless runtime, public command and plugin primitives, and a CSS
bundle you can import into your app.

## Why Oasis

- **Embed-first API**: mount the editor into any DOM node and receive a stable
  `OasisEditorClient`.
- **Command-driven runtime**: execute built-in or plugin commands from your own
  buttons, menus, shortcuts, or app chrome.
- **Paged document UI**: use a document shell with toolbar, menubar, canvas
  editing, persistence hooks, and import/export flows.
- **Plugin-ready architecture**: register commands, toolbar items, menubar
  items, keymaps, lifecycle hooks, and dependencies.
- **Typed package surface**: core document types, editor state, toolbar
  registries, menu registries, command refs, and UI primitives are exported.
- **Framework-friendly**: use the vanilla API directly or mount through the
  React and Vue adapters.

## Installation

```bash
npm install oasis-editor
```

Import the stylesheet once in your application entry:

```ts
import "oasis-editor/style.css";
```

## Quick Start

```ts
import { createOasisEditor } from "oasis-editor";
import "oasis-editor/style.css";

const root = document.getElementById("editor");

if (!root) {
  throw new Error("Missing editor root");
}

const client = createOasisEditor(root, {
  ui: {
    shell: "document",
  },
  runtime: {
    onReady(editorClient) {
      editorClient.commands.execute("find");
    },
  },
});

await client.ready;

client.on("change", (state) => {
  console.log("Document changed", state);
});
```

The returned client is the public integration handle for the mounted editor:

```ts
await client.ready;

client.commands.execute("bold");
client.commands.canExecute("insertTable");
client.commands.state("bold");

const state = client.getState();
const document = client.getDocument();

client.document.update((current) => ({
  ...current,
  metadata: { ...current.metadata, title: "Draft" },
}));

client.selection.get();
client.focus.focus();
client.history.undo();
await client.export.docx();

client.document.markClean();
client.dispose();
```

## React

```tsx
import { OasisEditor } from "oasis-editor/react";
import "oasis-editor/style.css";

export function EditorScreen() {
  return (
    <OasisEditor
      ui={{ shell: "document" }}
      onClient={(client) => {
        client.on("change", (state) => {
          console.log(state.document);
        });
      }}
    />
  );
}
```

The React adapter is mount-only. If you need to apply a new editor
configuration, remount the component.

## Vue

```vue
<script setup lang="ts">
import { OasisEditor } from "oasis-editor/vue";
import "oasis-editor/style.css";
</script>

<template>
  <OasisEditor
    :config="{ ui: { shell: 'document' } }"
    :on-client="(client) => client.commands.execute('find')"
  />
</template>
```

The Vue adapter follows the same mount-only configuration contract as React.

## Headless Runtime

Use `Editor.create()` when you need the runtime without the full UI shell:

```ts
import { Editor } from "oasis-editor";

const editor = await Editor.create({
  plugins: [],
});

editor.commands.execute("selectAll");
```

For embedded applications, prefer `createOasisEditor()`. It mounts the UI and
returns the same command-oriented client surface used by external integrations.

## Commands

Commands are the integration boundary for Oasis. Built-ins, plugins, toolbar
items, menubar items, and keymaps all dispatch through command names or command
refs.

```ts
import { OASIS_BUILTIN_COMMANDS, type OasisBuiltinCommand } from "oasis-editor";

const command: OasisBuiltinCommand = "insertTable";

if (client.commands.canExecute(command)) {
  client.commands.execute(command, { rows: 3, columns: 4 });
}

console.log(OASIS_BUILTIN_COMMANDS);
```

Common built-in commands include formatting commands such as `bold`, `italic`,
`underline`, layout commands such as `insertTable`, `setFontSize`,
`setPageMargins`, and document commands such as `importDocument`, `exportDocx`,
and `exportPdf`.

## Plugins

Plugins can register commands, toolbar items, menubar items, keymaps,
dependencies, and lifecycle hooks.

```ts
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
      id: "timestamp-toolbar-button",
      command: "insertTimestamp",
      group: "insert",
      icon: "clock-3",
    },
  ],
  menubar: [
    {
      id: "timestamp-menu-item",
      path: "Insert/Timestamp",
      command: "insertTimestamp",
      shortcut: "Ctrl+Alt+T",
    },
  ],
  keymaps: [{ key: "Ctrl+Alt+T", command: "insertTimestamp" }],
};
```

Register plugins when mounting:

```ts
createOasisEditor(root, {
  runtime: {
    plugins: [TimestampPlugin],
  },
});
```

See [docs/plugin-api.md](docs/plugin-api.md) for the plugin contract.

## Plugin UI

Native Oasis plugin UI uses Solid primitives from `oasis-editor/ui`:

```tsx
import { Button, Dialog, DialogFooter, TextField } from "oasis-editor/ui";

export function PluginDialog(props: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={props.open}
      title="Plugin"
      onClose={props.onClose}
      footer={
        <DialogFooter>
          <Button variant="primary">Apply</Button>
        </DialogFooter>
      }
    >
      <TextField label="Name" onChange={(value) => console.log(value)} />
    </Dialog>
  );
}
```

## Toolbar And Menubar Customization

Customize the toolbar and menubar after built-ins and plugin contributions are
registered:

```ts
import { createOasisEditor, OASIS_TOOLBAR_ITEMS } from "oasis-editor";

createOasisEditor(root, {
  ui: {
    toolbar: {
      layout: "wrap",
    },
  },
  runtime: {
    customizeToolbar(registry) {
      registry.remove(OASIS_TOOLBAR_ITEMS.footnote);
      registry.move(OASIS_TOOLBAR_ITEMS.insertTable, {
        before: OASIS_TOOLBAR_ITEMS.link,
      });
      registry.register({
        id: "timestamp-toolbar-button",
        type: "button",
        label: "Insert timestamp",
        command: "insertTimestamp",
        tab: "plugins",
        group: "automation",
        ribbonGroupResize: {
          priority: 30,
          compactMinWidth: 120,
          collapsedIcon: "clock-3",
        },
      });
    },
    customizeMenubar(registry) {
      registry.register({
        id: "tools-timestamp",
        path: "Tools/Timestamp",
        command: "insertTimestamp",
      });
    },
  },
});
```

Toolbar registries support `register`, `insertBefore`, `insertAfter`,
`replace`, `remove`, and `move`.

Ribbon groups resize automatically in ribbon view. Integrators can tune a
group's resize priority, compact width, collapsed width, collapsed icon, and
allowed states with `ribbonGroupResize` on any item in that group.

## Package Exports

```ts
import {
  createOasisEditor,
  Editor,
  OASIS_MENU_ITEMS,
  OASIS_TOOLBAR_ITEMS,
  MenuRegistry,
  createToolbarRegistry,
  type EditorDocument,
  type EditorState,
  type DocumentPersistence,
  type ImportProgressState,
  type OasisEditorClient,
  type OasisPlugin,
} from "oasis-editor";

import "oasis-editor/style.css";
```

Published subpaths:

- `oasis-editor`: vanilla embed API, headless runtime, public types, plugins,
  commands, and UI primitives.
- `oasis-editor/style.css`: packaged editor stylesheet.
- `oasis-editor/ui`: Solid UI primitives for plugin authors.
- `oasis-editor/react`: React adapter.
- `oasis-editor/vue`: Vue adapter.

## Local Development

Install dependencies:

```bash
npm install
```

Start the Vite development app:

```bash
npm run dev
```

Build the package and demo app:

```bash
npm run build
```

Build only the library package:

```bash
npm run build:lib
```

Run tests:

```bash
npm test
```

Run type checking:

```bash
npx tsc --noEmit
```

Useful focused validation while changing public API, plugins, or package
exports:

```bash
npx tsc --noEmit
npm test -- src/__tests__/core/clientApi.test.ts src/__tests__/core/editorPluginIntegration.test.ts src/__tests__/core/pluginCollection.test.ts src/__tests__/ui/registry.test.ts
npm run build:lib
```

## Documentation

- [Client API](docs/client-api.md)
- [Plugin API](docs/plugin-api.md)

## Status

Oasis is under active development. The public client, command, toolbar, menubar,
plugin, and package surfaces are being stabilized around real embed use cases.
Prefer documented APIs over internal files under `src/`.
