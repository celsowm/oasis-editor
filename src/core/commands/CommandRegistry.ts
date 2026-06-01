import type { OasisCommand, OasisCommandRegistry } from "../plugin.js";

export class CommandRegistry implements OasisCommandRegistry {
  private commands = new Map<string, OasisCommand>();

  register<TPayload = unknown, TResult = unknown>(
    name: string,
    command: OasisCommand<TPayload, TResult>,
  ): void {
    this.commands.set(name, command as OasisCommand);
  }

  unregister(name: string): void {
    this.commands.delete(name);
  }

  get(name: string): OasisCommand | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  clear(): void {
    this.commands.clear();
  }
}
