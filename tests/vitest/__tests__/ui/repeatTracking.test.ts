import { describe, expect, it, vi } from "vitest";
import {
  createRepeatTracking,
  isRepeatableCommand,
} from "@/ui/app/createRepeatTracking.js";

describe("isRepeatableCommand", () => {
  it("denies history/navigation/chrome commands", () => {
    for (const name of [
      "undo",
      "redo",
      "repeatLastAction",
      "find",
      "replace",
      "print",
      "newDocument",
    ]) {
      expect(isRepeatableCommand(name)).toBe(false);
    }
  });
  it("allows editing commands", () => {
    expect(isRepeatableCommand("bold")).toBe(true);
    expect(isRepeatableCommand("setFontSize")).toBe(true);
  });
});

describe("createRepeatTracking", () => {
  it("records the last repeatable command and re-executes it", () => {
    const execute = vi.fn(() => true);
    const tracking = createRepeatTracking(execute, () => true);
    tracking.record("bold");
    tracking.record("setFontSize", { size: "12" });
    expect(tracking.lastCommand()).toBe("setFontSize");
    expect(tracking.canExecute()).toBe(true);
    tracking.execute();
    expect(execute).toHaveBeenCalledWith("setFontSize", { size: "12" });
  });

  it("ignores denylisted commands even when executed", () => {
    const tracking = createRepeatTracking(() => true, () => true);
    tracking.record("bold");
    tracking.record("undo");
    expect(tracking.lastCommand()).toBe("bold");
  });

  it("canExecute reflects the live bus, not the recording", () => {
    const tracking = createRepeatTracking(
      () => true,
      (name) => name === "bold",
    );
    tracking.record("bold");
    expect(tracking.canExecute()).toBe(true);
    expect(tracking.lastCommand()).toBe("bold");
  });

  it("execute is a no-op before anything repeatable happened", () => {
    const execute = vi.fn();
    const tracking = createRepeatTracking(execute, () => true);
    tracking.execute();
    expect(execute).not.toHaveBeenCalled();
    expect(tracking.canExecute()).toBe(false);
  });

  it("propagates execution failures without losing the target", () => {
    const execute = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("boom");
      })
      .mockReturnValue(true);
    const tracking = createRepeatTracking(execute, () => true);
    tracking.record("bold");
    expect(() => tracking.execute()).toThrow("boom");
    expect(() => tracking.execute()).not.toThrow();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
