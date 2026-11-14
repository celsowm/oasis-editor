import type {
  CommandState,
  OasisCommand,
  OasisCommandContext,
  OasisCommandRegistry,
} from "@/core/plugin.js";

export class CommandRegistry implements OasisCommandRegistry {
  private commands = new Map<string, OasisCommand>();
  private contextProvider: (() => OasisCommandContext) | undefined;
  /**
   * Policy-free notification hook invoked after a command executes
   * successfully. Repeat-last-action tracking (Word's F4) plugs in here
   * without the registry knowing anything about repeat semantics.
   */
  onExecuted?: (name: string, payload?: unknown) => void;

  setContextProvider(provider: () => OasisCommandContext): void {
    this.contextProvider = provider;
  }

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

  execute<TPayload = unknown, TResult = unknown>(
    name: string,
    payload?: TPayload,
  ): TResult {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(`Unknown command: ${name}`);
    }
    if (!this.canExecute(name, payload)) {
      throw new Error(`Command disabled: ${name}`);
    }
    const result = command.execute(
      payload,
      this.contextProvider?.(),
    ) as TResult;
    this.onExecuted?.(name, payload);
    return result;
  }

  canExecute(name: string, payload?: unknown): boolean {
    const command = this.commands.get(name);
    if (!command) {
      return false;
    }
    if (!command.refresh) {
      return true;
    }
    return (
      command.refresh(payload, this.contextProvider?.()).isEnabled !== false
    );
  }

  state(name: string, payload?: unknown): CommandState {
    const command = this.commands.get(name);
    return (
      command?.refresh?.(payload, this.contextProvider?.()) ?? {
        isEnabled: this.commands.has(name),
      }
    );
  }

  clear(): void {
    this.commands.clear();
  }
}
