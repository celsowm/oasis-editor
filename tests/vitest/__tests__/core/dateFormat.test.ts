import { describe, expect, it } from "vitest";
import { DATE_FORMATS, formatDate } from "@/core/format/dateFormat.js";

describe("formatDate", () => {
  // A fixed reference date: 2026-11-08 14:05:07 (Sunday).
  const value = new Date(2026, 10, 8, 14, 5, 7);

  it("formats a default M/d/yyyy picture", () => {
    expect(formatDate(value, "M/d/yyyy")).toBe("11/8/2026");
  });

  it("formats a two-digit padded month/day", () => {
    expect(formatDate(value, "MM/dd/yyyy")).toBe("11/08/2026");
  });

  it("formats weekday and long month names", () => {
    expect(formatDate(value, "dddd, MMMM d, yyyy")).toBe("Sunday, November 8, 2026");
  });

  it("formats abbreviated month and two-digit year", () => {
    expect(formatDate(value, "d-MMM-yy")).toBe("8-Nov-26");
  });

  it("formats a time-bearing picture with am/pm", () => {
    expect(formatDate(value, "M/d/yyyy h:mm am/pm")).toBe("11/8/2026 2:05 pm");
  });

  it("formats 24-hour H and seconds", () => {
    expect(formatDate(value, "yyyy-MM-dd HH:mm:ss")).toBe("2026-11-08 14:05:07");
  });

  it("formats 12-hour h wrapping midnight/noon", () => {
    const midnight = new Date(2026, 10, 8, 0, 0, 0);
    const noon = new Date(2026, 10, 8, 12, 0, 0);
    expect(formatDate(midnight, "h:mm am/pm")).toBe("12:00 am");
    expect(formatDate(noon, "h:mm am/pm")).toBe("12:00 pm");
  });

  it("round-trips every vocabulary picture without error", () => {
    for (const picture of DATE_FORMATS) {
      expect(typeof formatDate(value, picture)).toBe("string");
    }
  });
});
