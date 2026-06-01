import type { OasisEditor, OasisPlugin, PluginReference, Unsubscribe } from "../plugin.js";

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value) && typeof (value as Promise<unknown>).then === "function";
}

interface RegisteredPlugin {
  plugin: OasisPlugin;
  commandNames: string[];
}

export class PluginCollection {
  private plugins: OasisPlugin[] = [];
  private cleanups: Unsubscribe[] = [];
  private initialized: RegisteredPlugin[] = [];

  constructor(private editorInstance: OasisEditor, plugins: OasisPlugin[] = []) {
    this.plugins = this.resolvePlugins(plugins);
    this.initializeAll();
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

  private initializeAll() {
    try {
      for (const plugin of this.plugins) {
        this.initializePlugin(plugin);
      }
      for (const entry of this.initialized) {
        const result = entry.plugin.afterInit?.(this.editorInstance);
        if (isPromiseLike(result)) {
          throw new Error(`Plugin '${entry.plugin.name}' afterInit must be synchronous in this runtime.`);
        }
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  private initializePlugin(plugin: OasisPlugin) {
    const commandNames: string[] = [];

    if (plugin.commands) {
      for (const [name, command] of Object.entries(plugin.commands)) {
        this.editorInstance.commands.register(name, command);
        commandNames.push(name);
      }
    }

    const initResult = plugin.init?.(this.editorInstance);
    if (isPromiseLike(initResult)) {
      throw new Error(`Plugin '${plugin.name}' init must be synchronous in this runtime.`);
    }

    if (plugin.install) {
      const cleanup = plugin.install(this.editorInstance);
      if (cleanup) {
        this.cleanups.push(cleanup);
      }
    }

    this.initialized.push({ plugin, commandNames });
  }

  destroy() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }

    for (let index = this.initialized.length - 1; index >= 0; index -= 1) {
      const entry = this.initialized[index]!;
      entry.plugin.destroy?.(this.editorInstance);
      for (const commandName of entry.commandNames) {
        this.editorInstance.commands.unregister(commandName);
      }
    }

    this.initialized = [];
    this.plugins = [];
    this.cleanups = [];
  }

  getPlugins() {
    return this.plugins;
  }
}
