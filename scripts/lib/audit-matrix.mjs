/**
 * Matrix rendering and UI-evidence validation. Pure with respect to the
 * caller: `wordcraft` is passed in explicitly.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function renderMatrix(data, wordcraft) {
  const code = (value) => "`" + value + "`";
  const dimension = (feature, key) =>
    feature[key] ??
    (key === "exposure" && feature.ribbonId ? "partial" : "unverified");
  const surface = (feature) =>
    feature.uiPath ??
    (feature.ribbonId ? code(feature.tab + "/" + feature.group) : "—");
  const rows = data.features.map((feature) =>
    "| " + code(feature.id) +
    " | " + (feature.wordcraftCommand ? code(feature.wordcraftCommand) : "—") +
    " | " + (feature.oasisCommand ? code(feature.oasisCommand) : "—") +
    " | " + surface(feature) +
    " | " + feature.status +
    " | " + dimension(feature, "exposure") +
    " | " + dimension(feature, "semantics") +
    " | " + dimension(feature, "persistence") + " |"
  ).join("\n");
  const questions = data.features.map((feature, index) =>
    (index + 1) + ". **" + feature.id + ":** " + feature.notes
  ).join("\n");
  return [
    "# Oasis Ribbon Parity Matrix — Phase 0 Seed",
    "",
    "> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.",
    "",
    "**Scope:** " + data.scope + "<br>",
    "**Pinned WordCraft inventory:** " + code(`${wordcraft.counts.features} entries / ${wordcraft.counts.surfaces} surfaces`) + "; this crosswalk maps " + code(data.features.length) + " Oasis capabilities and does not classify unmatched source rows as missing.<br>",
    "**Oasis baseline:** " + code(data.baseline.oasisCommit) + "<br>",
    "**WordCraft baseline:** " + code(data.baseline.wordcraftCommit),
    "",
    "The three dimensions below are independent of overall status. A legacy Ribbon-bound row defaults to `partial` exposure from its audited wiring; missing semantics or persistence evidence stays `unverified`. `core-only` means the command is registered but has no statically observed default Ribbon or menubar path. `menu-only` records a secondary path such as a dialog; each row supplies a UI path and source token that the audit checks. No status alone certifies complete DOCX round-trip, PDF/layout, accessibility or browser behavior.",
    "",
    "| Feature | WordCraft command | Oasis command | Oasis surface | Status | Exposure | Semantics | Persistence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Open verification questions",
    "",
    questions,
    "",
    "## Audit interpretation",
    "",
    "The audit scans the built-in command array, direct default-toolbar objects, style-gallery command declarations, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.",
    "",
    "**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.",
    "",
  ].join("\n");
}

export function validateUiEvidence(root, feature, errors) {
  if (!feature.uiPath?.trim()) {
    errors.push(feature.id + ": UI surface status needs an explicit UI path");
  }
  const evidence = feature.uiEvidence;
  if (!evidence?.file || !evidence?.token) {
    errors.push(feature.id + ": UI surface status needs source-file evidence");
    return;
  }
  const evidencePath = resolve(root, evidence.file);
  if (!existsSync(evidencePath)) {
    errors.push(feature.id + ": missing UI evidence file " + evidence.file);
  } else if (!readFileSync(evidencePath, "utf8").includes(evidence.token)) {
    errors.push(feature.id + ": UI evidence token not found: " + evidence.token);
  }
}

