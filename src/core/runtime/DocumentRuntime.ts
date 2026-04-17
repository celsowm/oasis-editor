// @ts-nocheck








import { createDocument, createParagraph } from "../document/DocumentFactory.js";
import { reduceDocumentState } from "./DocumentReducer.js";

export class DocumentRuntime {








  constructor() {
    const doc = createDocument();
    this.state = {
      document: doc,
      selection: {
        anchor: {
          sectionId: doc.sections[0].id,
          blockId: doc.sections[0].children[0].id,
          inlineId: doc.sections[0].children[0].children[0].id,
          offset: 0,
        },
        focus: {
          sectionId: doc.sections[0].id,
          blockId: doc.sections[0].children[0].id,
          inlineId: doc.sections[0].children[0].children[0].id,
          offset: 0,
        },
      },
    };
    this.history = [];
    this.future = [];
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  dispatch(operation) {
    this.history.push(this.state);
    this.future = [];
    this.state = reduceDocumentState(this.state, operation);
    this.emit();
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.unshift(this.state);
    this.state = previous;
    this.emit();
  }

  redo() {
    const next = this.future.shift();
    if (!next) return;
    this.history.push(this.state);
    this.state = next;
    this.emit();
  }

  exportJson() {
    return JSON.stringify(
      {
        version: "5.1.0-solid-clean",
        engine: "document-runtime",
        document: this.state.document,
        selection: this.state.selection,
      },
      null,
      2,
    );
  }

  emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
