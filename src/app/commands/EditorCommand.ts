import { IDocumentRuntime } from "../../core/runtime/IDocumentRuntime.js";
import { OasisEditorPresenter } from "../presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "../OasisEditorView.js";

export interface CommandContext {
  runtime: IDocumentRuntime;
  presenter: OasisEditorPresenter;
  view: OasisEditorView;
}

export interface EditorCommand<T = any> {
  execute(context: CommandContext, args: T): void;
}
