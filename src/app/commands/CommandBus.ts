import { CommandContext, EditorCommand } from "./EditorCommand.js";
import { Logger } from "../../core/utils/Logger.js";

export class CommandBus {
  private commands = new Map<string, EditorCommand>();
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
  }

  register(name: string, command: EditorCommand): void {
    this.commands.set(name, command);
  }

  execute<T>(name: string, args: T): void {
    const command = this.commands.get(name);
    if (command) {
      command.execute(this.context, args);
    } else {
      Logger.warn(`Command not found: ${name}`);
    }
  }
}
