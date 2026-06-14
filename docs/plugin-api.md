# Oasis Plugin API

Plugins extend Oasis through a small runtime contract:

- `name`: unique plugin name.
- `requires`: plugin dependencies, by name or by plugin object.
- `commands`: command registry entries.
- `toolbar`: toolbar buttons that dispatch registered commands.
- `menubar`: menu entries that dispatch registered commands.
- `keymaps`: keyboard shortcuts that dispatch registered commands.
- `ui`: persistent plugin UI contributions such as floating actions and side panels.
- `init`, `afterInit`, `destroy`: async lifecycle hooks.
- `install`: optional setup hook that can return an unsubscribe cleanup.

Commands are the integration boundary. UI contributions do not receive editor
internals or inline callbacks; they call command names or `CommandRef` objects.
The runtime command surface is `editor.commands`; do not call command aliases
directly on the editor instance.

```ts
import type { OasisPlugin } from "oasis-editor";

export const ExamplePlugin: OasisPlugin = {
  name: "Example",
  commands: {
    sayHello: {
      execute: (_payload, context) => {
        console.log(context?.getDocument().id);
        return "hello";
      },
      refresh: (_payload, context) => ({
        isEnabled: Boolean(context?.getSelection()),
      }),
    },
  },
  toolbar: [{ id: "sayHello", command: "sayHello", icon: "sparkles" }],
  menubar: [{ id: "tools_hello", path: "Tools/Hello", command: "sayHello" }],
};
```

Command handlers receive `(payload, context)`. The context exposes the public
editor facade needed by plugins: `editor`, `commands`, `getState()`,
`getDocument()`, and `getSelection()`. Prefer this context over importing UI
internals.

## Plugin UI

Native Oasis plugin UI uses Solid primitives from `oasis-editor/ui`.

```tsx
import type { OasisPlugin } from "oasis-editor";
import { Button, Dialog, DialogFooter, Tabs, TextField } from "oasis-editor/ui";

export const SettingsPlugin: OasisPlugin = {
  name: "Settings",
  commands: {
    openSettings: {
      execute: () => {
        // App-level UI state can render <SettingsDialog />.
      },
    },
  },
  toolbar: [
    {
      id: "settings",
      command: "openSettings",
      icon: "settings",
    },
  ],
};

export function SettingsDialog(props: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={props.open}
      title="Plugin settings"
      onClose={props.onClose}
      footer={
        <DialogFooter>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button variant="primary">Apply</Button>
        </DialogFooter>
      }
    >
      <Tabs
        items={[
          {
            id: "main",
            label: "Main",
            panel: <TextField label="Name" onChange={() => {}} />,
          },
        ]}
      />
    </Dialog>
  );
}
```

The UI subpath exports `Dialog`, `Tabs`, `Button`, `IconButton`, `TextField`,
`Checkbox`, `SelectField`, `DialogFooter`, `FloatingActionButton`, `SidePanel`,
`SidePanelHeader`, `SidePanelBody`, `SidePanelFooter`, and the lower-level
toolbar primitives. React and Vue wrappers for these primitives are not part of
this SDK layer.

## Floating Actions And Side Panels

Plugins can contribute persistent UI declaratively through `ui`, or register it
dynamically from lifecycle hooks through `editor.ui`.

```tsx
import type { OasisPlugin } from "oasis-editor";
import { Button, TextField } from "oasis-editor/ui";

export const AssistantPlugin: OasisPlugin = {
  name: "Assistant",
  commands: {
    toggleAssistant: {
      execute: (_payload, context) => {
        context?.ui.toggleSidePanel("assistant");
      },
    },
  },
  ui: {
    floatingActions: [
      {
        id: "assistant-floating-action",
        command: "toggleAssistant",
        icon: "sparkles",
        tooltip: "Assistant",
        scope: "container",
        placement: "bottom-right",
      },
    ],
    sidePanels: [
      {
        id: "assistant",
        title: "Assistant",
        icon: "sparkles",
        mode: "dock",
        width: 360,
        render: ({ closePanel }) => (
          <>
            <TextField
              label="Instruction"
              placeholder="Describe what you want to edit"
              onChange={() => {}}
            />
            <Button onClick={closePanel}>Close</Button>
          </>
        ),
      },
    ],
  },
};
```

Floating actions default to `scope: "container"` and `placement:
"bottom-right"`. Side panels default to `mode: "dock"` and render on the right;
use `mode: "overlay"` when the panel should cover the editor without changing
the document area. Plugin UI is not stored in the document.

Dependency ordering is enforced by `PluginCollection`; cycles and missing
dependencies fail initialization. If initialization fails, already registered
plugin commands are cleaned up.
