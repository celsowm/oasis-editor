import { describe, expect, it, vi } from "vitest";
import { createCommandBuilder, createActionCommandBuilder, createValueCommandBuilder } from "@/plugins/internal/essentialsCommandBuilders.js";
import { buildCoreFormattingCommands } from "@/plugins/internal/essentialsCommandGroups/coreFormatting.js";
import type {
  EssentialsFormattingCapability,
  EssentialsStyleCapability,
  EssentialsFeatureGate,
  EssentialsHistoryCapability,
  EssentialsSelectionCapability,
  EssentialsLinkCapability,
} from "@/plugins/internal/essentialsCapabilities.js";

function commands(gateEnabled: () => boolean, hasToc: () => boolean, hasRevision: () => boolean) {
  const gate: EssentialsFeatureGate = {
    isCommandEnabled: () => gateEnabled(),
  };
  const formatting = {
    insertTableOfContents: vi.fn(() => true),
    updateTableOfContents: vi.fn(() => true),
    hasTableOfContents: hasToc,
    hasRevisionsInSelection: hasRevision,
    acceptRevisions: vi.fn(() => true),
    rejectRevisions: vi.fn(() => true),
    isTrackChangesEnabled: () => true,
    areMarginsVisible: () => false,
    areParagraphMarksVisible: () => true,
    formatPainterOnce: vi.fn(() => true),
    formatPainterContinuous: vi.fn(() => true),
    cancelFormatPainter: vi.fn(() => true),
    formatPainterMode: () => null,
    canCaptureFormatPainter: () => true,
  } as unknown as EssentialsFormattingCapability;
  const result = buildCoreFormattingCommands({
    gate,
    style: { state: () => ({}) } as EssentialsStyleCapability,
    selection: { isCollapsed: () => true } as EssentialsSelectionCapability,
    history: { canUndo: () => false, canRedo: () => false } as EssentialsHistoryCapability,
    formatting,
    link: { canPrompt: () => false } as EssentialsLinkCapability,
    command: createCommandBuilder(gate.isCommandEnabled),
    actionCommand: createActionCommandBuilder(gate.isCommandEnabled),
    valueCommand: createValueCommandBuilder(gate.isCommandEnabled),
  });
  return { result, formatting };
}

describe("Essentials Ribbon command registrations", () => {
  it("exposes distinct painter modes and blocks capture in read-only mode", () => {
    let enabled = true;
    let painterMode: "once" | "continuous" | null = null;
    let canCapture = true;
    const { result, formatting } = commands(() => enabled, () => true, () => true);
    formatting.formatPainterMode = () => painterMode;
    formatting.canCaptureFormatPainter = () => canCapture;
    expect(result.formatPainter?.refresh?.().isEnabled).toBe(true);
    expect(result.formatPainter?.execute()).toBe(true);
    expect(formatting.formatPainterOnce).toHaveBeenCalledOnce();
    painterMode = "once";
    expect(result.formatPainter?.refresh?.().isActive).toBe(true);
    expect(result.formatPainterContinuous?.refresh?.().isActive).toBe(false);
    painterMode = "continuous";
    expect(result.formatPainterContinuous?.refresh?.().isActive).toBe(true);
    expect(result.cancelFormatPainter?.refresh?.().isEnabled).toBe(true);
    canCapture = false;
    expect(result.formatPainter?.refresh?.().isEnabled).toBe(false);
    enabled = false;
    expect(result.formatPainterContinuous?.refresh?.().isEnabled).toBe(false);
    painterMode = null;
    expect(result.cancelFormatPainter?.refresh?.().isEnabled).toBe(false);
  });

  it("registers both TOC commands as actual executable actions", () => {
    const { result, formatting } = commands(() => true, () => true, () => true);
    expect(result.insertTableOfContents).toBeDefined();
    expect(result.updateTableOfContents).toBeDefined();
    expect(result.insertTableOfContents?.execute()).toBe(true);
    expect(result.updateTableOfContents?.execute()).toBe(true);
    expect(formatting.insertTableOfContents).toHaveBeenCalledOnce();
    expect(formatting.updateTableOfContents).toHaveBeenCalledOnce();
  });

  it("disables updating an absent TOC and respects read-only mode", () => {
    let enabled = true;
    let toc = false;
    const { result } = commands(() => enabled, () => toc, () => true);
    expect(result.updateTableOfContents?.refresh?.().isEnabled).toBe(false);
    toc = true;
    expect(result.updateTableOfContents?.refresh?.().isEnabled).toBe(true);
    enabled = false;
    expect(result.updateTableOfContents?.refresh?.().isEnabled).toBe(false);
  });

  it("enables accepting or rejecting revisions only for a resolvable selection", () => {
    let selected = false;
    let enabled = true;
    const { result } = commands(() => enabled, () => true, () => selected);
    for (const command of ["acceptRevisions", "rejectRevisions"] as const) {
      expect(result[command]?.refresh?.().isEnabled).toBe(false);
    }
    selected = true;
    for (const command of ["acceptRevisions", "rejectRevisions"] as const) {
      expect(result[command]?.refresh?.().isEnabled).toBe(true);
    }
    enabled = false;
    expect(result.acceptRevisions?.refresh?.().isEnabled).toBe(false);
  });

  it("reports active toggle state instead of always appearing inactive", () => {
    const { result } = commands(() => true, () => true, () => true);
    expect(result.toggleTrackChanges?.refresh?.().isActive).toBe(true);
    expect(result.toggleShowMargins?.refresh?.().isActive).toBe(false);
    expect(result.toggleShowParagraphMarks?.refresh?.().isActive).toBe(true);
  });
});
