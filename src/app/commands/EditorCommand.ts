import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { OasisEditorPresenter } from "../presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "../OasisEditorView.js";

export interface CommandContext {
  runtime: DocumentRuntime;
  presenter: OasisEditorPresenter;
  view: OasisEditorView;
}

export interface EditorCommand {
  execute(context: CommandContext, ...args: any[]): void;
}
