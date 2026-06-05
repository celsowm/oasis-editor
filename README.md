<p align="center">
  <img src="branding/generated/logo-full.png" alt="Oasis Editor" width="320" />
</p>

## soon

## Toolbar customization

Toolbar layout is configured through `ui.toolbar.layout`. The default is
`"overflow"`, which moves items that do not fit into the `[...]` menu. Use
`"wrap"` to keep all items visible and let the toolbar span multiple rows.

Toolbar items and order are configured through `runtime.customizeToolbar`,
after built-in items and plugin contributions are registered.

```ts
createOasisEditor(root, {
  ui: {
    toolbar: {
      layout: "wrap",
    },
  },
  runtime: {
    customizeToolbar(registry) {
      registry.remove("editor-toolbar-footnote");
      registry.move("editor-toolbar-insert-table", { before: "editor-toolbar-link" });
      registry.register({
        id: "my-custom-action",
        type: "button",
        label: "Minha ação",
        command: "myCommand",
      });
    },
  },
});
```
