import type { OasisEditor, OasisPlugin, Unsubscribe } from "./plugin.js";

export class PluginHost {
  private plugins: OasisPlugin[] = [];
  private cleanups: Unsubscribe[] = [];

  constructor(private editorInstance: OasisEditor, plugins: OasisPlugin[] = []) {
    for (const p of plugins) {
      this.register(p);
    }
  }

  register(plugin: OasisPlugin) {
    if (this.plugins.some((registered) => registered.name === plugin.name)) {
      return;
    }

    this.plugins.push(plugin);
    if (plugin.commands) {
      for (const [name, command] of Object.entries(plugin.commands)) {
        this.editorInstance.registerCommand(name, command);
      }
    }

    plugin.init?.(this.editorInstance);

    if (plugin.install) {
      const cleanup = plugin.install(this.editorInstance);
      if (cleanup) {
        this.cleanups.push(cleanup);
      }
    }

    plugin.afterInit?.(this.editorInstance);
  }

  destroy() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    for (const plugin of this.plugins) {
      plugin.destroy?.(this.editorInstance);
      if (plugin.commands) {
        for (const commandName of Object.keys(plugin.commands)) {
          this.editorInstance.unregisterCommand(commandName);
        }
      }
    }
    this.plugins = [];
    this.cleanups = [];
  }

  getPlugins() {
    return this.plugins;
  }
}
