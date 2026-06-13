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

```ts
import type { OasisPlugin } from "oasis-editor";

export const ExamplePlugin: OasisPlugin = {
  name: "Example",
  commands: {
    sayHello: {
      execute: () => "hello",
      refresh: () => ({ isEnabled: true }),
    },
  },
  toolbar: [{ id: "sayHello", command: "sayHello", icon: "sparkles" }],
  menubar: [{ id: "tools_hello", path: "Tools/Hello", command: "sayHello" }],
};
```

Dependency ordering is enforced by `PluginCollection`; cycles and missing
dependencies fail initialization. If initialization fails, already registered
plugin commands are cleaned up.
