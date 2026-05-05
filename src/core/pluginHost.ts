import type { OasisPlugin } from "./plugin.js";

export class PluginHost {
  private plugins: OasisPlugin[] = [];
  private cleanups: Array<() => void> = [];

  constructor(private editorInstance: any, plugins: OasisPlugin[] = []) {
    for (const p of plugins) {
      this.register(p);
    }
  }

  register(plugin: OasisPlugin) {
    this.plugins.push(plugin);
    if (plugin.install) {
      const cleanup = plugin.install(this.editorInstance);
      if (cleanup) {
        this.cleanups.push(cleanup);
      }
    }
  }

  destroy() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.plugins = [];
    this.cleanups = [];
  }

  getPlugins() {
    return this.plugins;
  }
}
