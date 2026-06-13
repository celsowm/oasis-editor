# Oasis Plugin API

Plugins extend Oasis through a small runtime contract:

- `name`: unique plugin name.
- `requires`: plugin dependencies, by name or by plugin object.
- `commands`: command registry entries.
- `toolbar`: toolbar buttons that dispatch registered commands.
- `menubar`: menu entries that dispatch registered commands.
- `keymaps`: keyboard shortcuts that dispatch registered commands.
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

Dependency ordering is enforced by `PluginCollection`; cycles and missing
dependencies fail initialization. If initialization fails, already registered
plugin commands are cleaned up.
