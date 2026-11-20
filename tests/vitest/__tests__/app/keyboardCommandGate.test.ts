import { describe, expect, it, vi } from "vitest";
import { EditorCommandRegistry, defaultEditorKeyBindings } from "@/app/controllers/EditorCommandRegistry.js";
import type { EditorKeyboardDeps } from "@/app/controllers/EditorKeyboardDeps.js";

function keyEvent(): KeyboardEvent {
  return {
    key: "b",
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

const deps = {} as EditorKeyboardDeps;

describe("keyboard command dispatch", () => {
  it("runs the registered command instead of the local fallback", () => {
    const registry = new EditorCommandRegistry();
    const execute = vi.fn(() => true);
    registry.register({ id: "bold", command: "bold", key: "b", ctrlOrMeta: true, execute });
    const executeCommand = vi.fn();
    const event = keyEvent();

    const handled = registry.execute(event, deps, {
      executeCommand,
      canExecuteCommand: () => true,
    });

    expect(handled).toBe(true);
    expect(executeCommand).toHaveBeenCalledWith("bold");
    expect(execute).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("consumes a disabled command without running the fallback", () => {
    const registry = new EditorCommandRegistry();
    const execute = vi.fn(() => true);
    registry.register({ id: "bold", command: "bold", key: "b", ctrlOrMeta: true, execute });
    const executeCommand = vi.fn();
    const event = keyEvent();

    const handled = registry.execute(event, deps, {
      executeCommand,
      canExecuteCommand: () => false,
    });

    expect(handled).toBe(true);
    expect(executeCommand).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("keeps bindings without a command driven by their own handler", () => {
    const registry = new EditorCommandRegistry();
    const execute = vi.fn(() => true);
    registry.register({ id: "custom", key: "b", ctrlOrMeta: true, execute });
    const executeCommand = vi.fn();

    const handled = registry.execute(keyEvent(), deps, {
      executeCommand,
      canExecuteCommand: () => false,
    });

    expect(handled).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("reports an unhandled chord when the binding declines", () => {
    const registry = new EditorCommandRegistry();
    registry.register({
      id: "custom",
      key: "b",
      ctrlOrMeta: true,
      execute: () => false,
    });

    expect(registry.execute(keyEvent(), deps)).toBe(false);
  });
});

it("dispatches F9 to selected fields and honors the command gate",()=>{
  const registry=new EditorCommandRegistry();
  defaultEditorKeyBindings.forEach(binding=>registry.register(binding));
  const executeCommand=vi.fn();
  const event={...keyEvent(),key:"F9",ctrlKey:false} as KeyboardEvent;
  expect(registry.execute(event,deps,{executeCommand,canExecuteCommand:()=>true})).toBe(true);
  expect(executeCommand).toHaveBeenCalledExactlyOnceWith("updateSelectedFields");
  expect(registry.execute(event,deps,{executeCommand,canExecuteCommand:()=>false})).toBe(true);
  expect(executeCommand).toHaveBeenCalledTimes(1);
});
