import { describe, expect, it } from "vitest";
import {
  scoreCommandSearchEntry,
  searchCommandEntries,
  type CommandSearchEntry,
} from "@/core/commands/commandSearch.js";

const entries: CommandSearchEntry[] = [
  { id: "bold", label: "Bold", command: "bold", source: "ribbon" },
  { id: "bold-borders", label: "Borders: bold lines", command: "noop-c", source: "ribbon" },
  { id: "italic", label: "Italic", command: "italic", source: "ribbon" },
  { id: "insert-toc", label: "Insert Table of Contents", command: "insertTableOfContents", source: "ribbon" },
  { id: "update-toc", label: "Update Table of Contents", command: "updateTableOfContents", source: "ribbon" },
  { id: "find", label: "Find", command: "find", shortcut: "Ctrl+F", source: "ribbon" },
  { id: "replace", label: "Replace", command: "replace", shortcut: "Ctrl+H", source: "ribbon" },
  { id: "accept-all", label: "Accept All Revisions", command: "requestAcceptAllRevisions", source: "ribbon" },
];

describe("scoreCommandSearchEntry", () => {
  it("scores an exact match above everything", () => {
    expect(
      scoreCommandSearchEntry("bold", entries[0])!,
    ).toBeGreaterThan(
      scoreCommandSearchEntry("bold", entries[1])!,
    );
  });

  it("prefers a prefix match over a mid-string match", () => {
    const prefix = scoreCommandSearchEntry("find", entries[5])!; // "Find"
    const mid = scoreCommandSearchEntry("ind", entries[5])!;    // "Find" mid-string
    expect(prefix).toBeGreaterThan(mid);
  });

  it("matches subsequence queries like a palette", () => {
    const hit = scoreCommandSearchEntry("intoc", entries[3]);
    expect(hit).not.toBeNull();
  });

  it("rejects non-matching queries", () => {
    expect(scoreCommandSearchEntry("xyzabc", entries[0])).toBeNull();
  });

  it("returns 0 for an empty query", () => {
    expect(scoreCommandSearchEntry("   ", entries[0])).toBe(0);
  });
});

describe("searchCommandEntries", () => {
  it("returns the full surface alphabetically for an empty query", () => {
    const hits = searchCommandEntries("", entries);
    expect(hits.length).toBe(entries.length);
    const labels = hits.map((hit) => hit.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it("ranks prefix matches first and honors the limit", () => {
    const hits = searchCommandEntries("table of contents", entries, 2);
    expect(hits.length).toBe(2);
    expect(hits[0].label).toContain("Table of Contents");
  });

  it("finds TOC entries with a fuzzy subsequence", () => {
    const hits = searchCommandEntries("toc", entries);
    expect(hits.map((h) => h.command)).toContain("insertTableOfContents");
  });

  it("is case-insensitive", () => {
    const hits = searchCommandEntries("BOLD", entries);
    expect(hits[0]?.command).toBe("bold");
  });

  it("falls back to the command id when the localized label does not match", () => {
    const localized: CommandSearchEntry[] = [
      { id: "bold", label: "Negrito", command: "bold", source: "ribbon" },
    ];
    const hits = searchCommandEntries("bold", localized);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.command).toBe("bold");
  });
});
