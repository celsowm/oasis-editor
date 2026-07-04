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
import {
  Button,
  ColorField,
  Dialog,
  DialogFooter,
  FieldGroup,
  Grid,
  Stack,
  Tabs,
  TextField,
  TextAreaField,
} from "oasis-editor/ui";

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
            panel: (
              <Stack spacing={2}>
                <FieldGroup legend="General">
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Name" onChange={() => {}} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Slug" onChange={() => {}} />
                    </Grid>
                  </Grid>
                  <TextAreaField label="Notes" onChange={() => {}} />
                  <ColorField label="Accent" onChange={() => {}} />
                </FieldGroup>
              </Stack>
            ),
          },
        ]}
      />
    </Dialog>
  );
}
```

The UI subpath exports semantic/composition primitives such as `Text`,
`Heading`, `StatusText`, `ActionRow`, `Stack`, `Grid`, `FormField`, `FieldGroup`,
`SurfaceButton`, `TextAreaField`, and `ColorField`, along with `Dialog`, `Tabs`,
`Button`, `IconButton`, `TextField`, `Checkbox`, `SelectField`, `DialogFooter`,
`FloatingActionButton`, `SidePanel`, `SidePanelHeader`, `SidePanelBody`,
`SidePanelFooter`, and the lower-level toolbar primitives. Plugin and feature
UI should import these from `oasis-editor/ui` instead of composing ad hoc
native `button`/`input`/`label`/`span` markup in Solid components unless the
code is a low-level primitive or renderer surface.

`Stack` and `Grid` intentionally follow a MUI-like layout API for plugin
authors: `Stack spacing={2}`, `Stack direction={{ xs: "column", sm: "row" }}`,
`Grid container spacing={2}`, and `Grid size={{ xs: 12, md: 6 }}` are supported
without requiring a MUI theme or `sx` runtime.

## Contextual Ribbon Tabs

Most ribbon tabs are always visible. A **contextual tab** appears only while a
gating command reports `isActive` — the mechanism behind the Word-style
**Table Design** / **Table Layout** tabs, which show only when the caret is
inside a table and hide again when it leaves.

The vocabulary lives in the core (`src/core/pluginUiTypes.ts`):

```ts
export const RIBBON_TABS = [
  /* … */ "view",
  "tableDesign",
  "tableLayout",
  "plugins",
  "ai",
] as const;

// Maps a contextual tab id → the command id whose `isActive` state gates it.
export const CONTEXTUAL_TABS: Partial<Record<RibbonTabId, string>> = {
  tableDesign: "tableContext",
  tableLayout: "tableContext",
};
```

To register a new contextual tab:

1. Add its id to `RIBBON_TABS` and a `CONTEXTUAL_TABS[id] = "<gatingCommand>"`
   entry. The gating command's `state(...).isActive` decides visibility.
2. Add a `TAB_LABEL_KEYS` entry (and matching `ribbon.tab.*` i18n keys), plus
   any `RIBBON_GROUP_ORDER` / group label keys for its groups
   (`src/ui/components/Toolbar/ribbon/ribbonModel.ts`).
3. Place items on the tab with `tab: "<id>"` — ordinary ribbon items; they only
   render while the tab is visible.

The tab strip filters through `buildRibbonTabDefinitions(t, api)` /
`isRibbonTabVisible(id, api)` and re-renders reactively on selection change.
`Toolbar.tsx` auto-focuses the first contextual tab when its gate turns on and
falls back to **Home** when it turns off, matching Word.

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
