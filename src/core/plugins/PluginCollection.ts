import type { OasisEditor, OasisPlugin, PluginReference, Unsubscribe } from "../plugin.js";

interface RegisteredPlugin {
  plugin: OasisPlugin;
  commandNames: string[];
}

export class PluginCollection {
  private plugins: OasisPlugin[] = [];
  private cleanups: Unsubscribe[] = [];
  private initialized: RegisteredPlugin[] = [];
  private isInitialized = false;

  constructor(private editorInstance: OasisEditor, plugins: OasisPlugin[] = []) {
    this.plugins = this.resolvePlugins(plugins);
  }

  private resolvePlugins(input: OasisPlugin[]): OasisPlugin[] {
    const byName = new Map<string, OasisPlugin>();
    const all = [...input];

    const register = (plugin: OasisPlugin) => {
      if (!byName.has(plugin.name)) {
        byName.set(plugin.name, plugin);
        all.push(plugin);
      }
    };

    for (const plugin of input) {
      register(plugin);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const ordered: OasisPlugin[] = [];

    const resolveRef = (owner: OasisPlugin, ref: PluginReference): OasisPlugin => {
      if (typeof ref === "string") {
        const found = byName.get(ref) ?? all.find((candidate) => candidate.name === ref);
        if (!found) {
          throw new Error(`Plugin '${owner.name}' requires missing plugin '${ref}'.`);
        }
        register(found);
        return found;
      }
      register(ref);
      return ref;
    };

    const visit = (plugin: OasisPlugin) => {
      if (visited.has(plugin.name)) {
        return;
      }
      if (visiting.has(plugin.name)) {
        throw new Error(`Cyclic plugin dependency detected at '${plugin.name}'.`);
      }
      visiting.add(plugin.name);

      for (const ref of plugin.requires ?? []) {
        visit(resolveRef(plugin, ref));
      }

      visiting.delete(plugin.name);
      visited.add(plugin.name);
      ordered.push(plugin);
    };

    for (const plugin of input) {
      visit(plugin);
    }

    return ordered;
  }

  async initializeAll() {
    if (this.isInitialized) {
      return;
    }

    try {
      for (const plugin of this.plugins) {
        await this.initializePlugin(plugin);
      }
      for (const entry of this.initialized) {
        await entry.plugin.afterInit?.(this.editorInstance);
      }
      this.isInitialized = true;
    } catch (error) {
      await this.destroy();
      throw error;
    }
  }

  private async initializePlugin(plugin: OasisPlugin) {
    const commandNames: string[] = [];

    this.registerPluginCommands(plugin, commandNames);
    this.initialized.push({ plugin, commandNames });

    await plugin.init?.(this.editorInstance);

    if (plugin.install) {
      const cleanup = plugin.install(this.editorInstance);
      if (cleanup) {
        this.cleanups.push(cleanup);
      }
    }
  }

  private registerPluginCommands(plugin: OasisPlugin, commandNames: string[]) {
    if (!plugin.commands) {
      return;
    }

    for (const [name, command] of Object.entries(plugin.commands)) {
      this.editorInstance.commands.register(name, command);
      commandNames.push(name);
    }
  }

  async destroy() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }

    for (let index = this.initialized.length - 1; index >= 0; index -= 1) {
      const entry = this.initialized[index]!;
      await entry.plugin.destroy?.(this.editorInstance);
      for (const commandName of entry.commandNames) {
        this.editorInstance.commands.unregister(commandName);
      }
    }

    this.initialized = [];
    this.cleanups = [];
    this.isInitialized = false;
  }

  getPlugins() {
    return this.plugins;
  }
}
