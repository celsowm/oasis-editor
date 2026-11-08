# Oasis Client API

This is the public API for embedding Oasis in an application. The main entry is
`createOasisEditor`, which mounts the UI and returns an `OasisEditorClient`.

## Vanilla

```ts
import { createOasisEditor } from "oasis-editor";
import "oasis-editor/style.css";

const client = createOasisEditor(document.getElementById("editor")!, {
  runtime: {
    onReady(editorClient) {
      editorClient.commands.execute("bold");
    },
  },
});

await client.ready;
client.on("change", (state) => {
  console.log("Document changed", state);
});
```

The client exposes:

- `ready`: resolves with the runtime `Editor`.
- `commands.execute(command, payload?)`.
- `commands.canExecute(command, payload?)`.
- `commands.state(command)`.
- `getState()`, `getDocument()`, `setDocument(document)`.
- `document.get/set/load/update/reset/save/isDirty/markClean`.
- `selection.get/set`.
- `focus.focus/blur`.
- `history.undo/redo/canUndo/canRedo/clear`.
- `import.docx(file)` and `import.html(html)`.
- `export.docx()`, `export.pdf()`, and `export.html(options?)`.
- `io.import({ format: "html" | "docx", data })` and `io.export({ format: "html" | "docx" | "pdf" })`.
- `commands.execute("insertHtml", { html })`: insert HTML at the selection as an undoable edit.
- `on`, `once`, `off` for `ready`, `change`, `documentChange`,
  `selectionChange`, and `error`.
- `dispose()`.

## Document Lifecycle

```ts
const document = client.document.get();

client.document.update((current) => ({
  ...current,
  metadata: {
    ...current.metadata,
    title: "Quarterly report",
  },
}));

if (client.document.isDirty()) {
  await client.document.save();
}

client.document.markClean();
```

## Selection And Focus

```ts
const selection = client.selection.get();

client.selection.set({
  anchor: selection.focus,
  focus: selection.focus,
});

client.focus.focus();
```

## Import And Export

```ts
await client.import.docx(file);
await client.export.docx();
await client.export.pdf();
```

## HTML Integration

Use HTML fragments for legacy application models, not as lossless storage for
DOCX-only capabilities (headers, footers, revisions, floating objects, etc.).
Exporting an HTML fragment is the default; set `fullDocument: true` for a
standalone HTML document. Importing HTML replaces the document without marking
it dirty; inserting HTML is an undoable edit at the selection.

```ts
await client.import.html("<p>Olá, <strong>#autor</strong>.</p>");
client.commands.execute("insertHtml", {
  html: "<table><tr><td>#cnj</td></tr></table>",
});
const fragment = await client.export.html();
const completeDocument = await client.export.html({ fullDocument: true });

const imported = await client.io.import({ format: "html", data: fragment });
if (!imported.ok) throw new Error(imported.error.message);

const exported = await client.io.export({ format: "html" });
if (!exported.ok) throw new Error(exported.error.message);
const html = await exported.value.blob.text();
```

The imported markup is mapped to the Oasis semantic model (not retained as raw
DOM). HTML conversion covers paragraphs, headings, text formatting, lists,
tables, and images, but is not pixel-perfect or a general-purpose sanitizer
for displaying hostile HTML elsewhere. Treat external HTML as untrusted.

## Typed Built-In Commands

```ts
import { OASIS_TOOLBAR_ITEMS, type OasisCommandName } from "oasis-editor";

const command: OasisCommandName = "insertTable";

client.commands.execute(command, { rows: 3, columns: 4 });
client.commands.execute("setFontSize", { size: 12 });

createOasisEditor(root, {
  runtime: {
    customizeToolbar(registry) {
      registry.move(OASIS_TOOLBAR_ITEMS.insertTable, {
        before: OASIS_TOOLBAR_ITEMS.link,
      });
    },
  },
});
```

## React

The React adapter is mount-only: changing the config after mount does not
reconfigure the editor. Remount the component to apply a new config.

```tsx
import { OasisEditor } from "oasis-editor/react";
import "oasis-editor/style.css";

export function EditorScreen() {
  return (
    <OasisEditor
      ui={{ shell: "document" }}
      onClient={(client) => {
        void client.ready.then(() => client.commands.execute("find"));
      }}
    />
  );
}
```

## Vue

The Vue adapter follows the same mount-only contract.

```vue
<script setup lang="ts">
import { OasisEditor } from "oasis-editor/vue";
import "oasis-editor/style.css";
</script>

<template>
  <OasisEditor
    :config="{ ui: { shell: 'document' } }"
    :on-client="
      (client) => client.ready.then(() => client.commands.execute('find'))
    "
  />
</template>
```

## Plugins

Plugins register commands first, then reference those commands from toolbar,
menubar, and keymap contributions.

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
      id: "insertTimestamp",
      command: "insertTimestamp",
      group: "insert",
      icon: "clock-3",
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
```

## Toolbar And Menubar Customization

Use `runtime.customizeToolbar` and `runtime.customizeMenubar` after built-ins
and plugin contributions are registered.

```ts
createOasisEditor(root, {
  runtime: {
    plugins: [TimestampPlugin],
    customizeToolbar(registry) {
      registry.move("editor-toolbar-insert-table", {
        before: "editor-toolbar-link",
      });
      registry.register({
        id: "my-custom-action",
        type: "button",
        label: "Minha acao",
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
        id: "tools_timestamp",
        path: "Tools/Timestamp",
        command: "insertTimestamp",
      });
    },
  },
});
```

Toolbar items dispatch exclusively through commands. Menubar items should do the
same.

Ribbon view resizes by group. Set `ribbonGroupResize` on a group item to tune
collapse priority, compact width, collapsed width, collapsed icon, or the
allowed states for that group.

## Plugin UI Primitives

Plugin UI should import Solid primitives from `oasis-editor/ui` rather than
internal component paths.

```tsx
import {
  Button,
  ColorField,
  Dialog,
  DialogFooter,
  FieldGroup,
  Grid,
  Stack,
  TextAreaField,
  TextField,
} from "oasis-editor/ui";

export function PluginDialog(props: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={props.open}
      title="Plugin"
      onClose={props.onClose}
      footer={
        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      }
    >
      <Stack spacing={2}>
        <FieldGroup legend="General">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Name"
                onChange={(value) => console.log(value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Slug"
                onChange={(value) => console.log(value)}
              />
            </Grid>
          </Grid>
          <TextAreaField
            label="Notes"
            onChange={(value) => console.log(value)}
          />
          <ColorField label="Accent" onChange={(value) => console.log(value)} />
        </FieldGroup>
      </Stack>
    </Dialog>
  );
}
```

`Stack` and `Grid` use a MUI-like API for layout without bringing in MUI:
`Stack spacing={2}`, `Stack direction={{ xs: "column", sm: "row" }}`,
`Grid container spacing={2}`, and `Grid size={{ xs: 12, md: 6 }}` are valid
plugin UI patterns.
