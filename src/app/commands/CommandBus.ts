import { CommandContext, EditorCommand } from "./EditorCommand.js";

export class CommandBus {
  private commands = new Map<string, EditorCommand>();
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
  }

  register(name: string, command: EditorCommand): void {
    this.commands.set(name, command);
  }

  execute(name: string, ...args: any[]): void {
    const command = this.commands.get(name);
    if (command) {
      command.execute(this.context, ...args);
    } else {
      console.warn(`Command not found: ${name}`);
    }
  }
}
