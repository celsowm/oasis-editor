# OOXML capability tooling (OX-001 prototype)

The seed is a narrow, manually audited sample, not an official schema inventory. Each context has five independent dimensions. Passing the exact Vitest case promotes its scoped dimensions to **partial** only; no entry is marked supported. Missing is an explicit static finding, unknown is not verified, and the JSON denominator is null.

Commands (from repository root):
- npm run ooxml:audit — validates seed/evidence links, deterministic report and synthetic XSD inventory tests.
- npm run ooxml:evidence — runs the exact suite files with Vitest JSON output.
- npm run ooxml:report -- --evidence test-results/ooxml/vitest.json --require-evidence — generates JSON and Markdown; fails if any declared case was absent, skipped or failed.
- npm run ooxml:report — generates a static report without marking any test passed.
- npm run ooxml:inventory -- --manifest /path/to/manifest.json — includes lexically extracted schema declarations and unresolved references in the report. This is a prototype, not an effective schema graph or ECMA-376 denominator.

Manifest shape: version 1 and files array. Each file has path (relative to the manifest), profile (transitional/strict/extension), edition, source, license and SHA-256 (lowercase hex). Obtain official schemas legally; pin and verify each file. No schemas are bundled until provenance is verified. The parser does not fetch imports and rejects DTDs. The extracted names/contexts remain lexical and not resolved across types, imports or substitution groups. OX-001 remains open for that work and full inventory expansion.

Deployment generates the report into dist-app/ooxml after Vite build, alongside the static explorer copied from public/ooxml. Access the explorer at /oasis-editor/ooxml/ on project Pages. The CI checks evidence separately from the full suite; it does not treat a missing result as passing. The build does not add any editor runtime dependencies or modify editor semantics.

Future hardening: tie test results to immutable CI artifacts/commit (local evidence can be stale), effective schema expansion, attribute/enum coverage, previous-release regression baseline, and broader fixture metadata. Never infer complete coverage from the seed.

## Pinned official sources and direct schema links (slice B)

Run npm run ooxml:schemas to acquire the official ECMA Part 1 (Strict), Part 2 (OPC), and Part 4 (Transitional) archives, with checksums pinned in scripts/ooxml/ecma-sources.json against the independently published mirror checksum list. The downloader fails closed on a hash mismatch; acquisition and byte identity must be confirmed by CI. It extracts only XSD into test-results, not the editor distribution. For offline use, supply --archives /path/to/verified-zips. Do not redistribute source XSDs without the full applicable copyright notice. Part 3 defines MC primarily in prose and remains an explicitly separate scope.

Then run npm run ooxml:inventory -- --manifest test-results/ooxml/ecma/manifest.json. The report contains declaration counts by kind, contextual attributes, enums, default/fixed/form, direct namespace-resolved type/base/group/attribute/element references, and unresolved/ambiguous links. This is not effective schema expansion and still has a null denominator. Standalone spreadsheet/presentation schemas may be present in the archives; final DOCX scope must be computed separately.

For an explicitly reviewed earlier runner report, use npm run ooxml:report -- --evidence test-results/ooxml/vitest.json --require-evidence --baseline path/to/previous-capabilities.json. This detects removal or downgrade of witnessed dimensions. The historical baseline is not yet pinned in CI; do not infer certification from a fabricated or stale local result.

A separate OOXML Compatibility workflow now records test evidence and schema inventory independently from Ribbon/deploy failures. The official download job and evidence job have independent outcomes. Previous Pages deployment failed before OOXML checks because the Ribbon icon inventory was stale; this change does not bypass or modify that independent gate.

## Effective type projection and verified baseline (slice C)

CI run 43997135742 verified 51 official XSDs and passed every declared evidence case. Its schema inventory failure was a UTF-8 BOM rejected by xmldom. The parser now strips a leading BOM only from the decoded XML, after verifying original bytes; errors identify the file. Added a BOM regression test.

The effective projection expands direct type inheritance, attribute groups, attribute references and simple enum restrictions. It retains sequence/choice/all/group structure, local occurrence bounds, namespace qualification and source paths; recursive element types remain references, and unsupported restriction/wildcard behavior produces diagnostics. Substitution/list/union links are inventoried but their full semantics are not expanded. Scope reachability and unknown attribute coverage are not yet complete. Never use counts as a denominator.

The initial historical regression baseline is pinned in src/ooxml/capabilities/baseline.json from the seed at the successful evidence job, not from unrun claims. Its provenance links the exact run/job; the separate OOXML workflow now rejects a removal or downgrade of a witnessed dimension. New evidence may expand this baseline after review of a passing immutable CI run.

npm-install audit in that run reported 20 advisories (2 low, 12 moderate, 4 high, 2 critical); dependency remediation is separate from this schema slice. Ribbon inventory still blocks Pages deploy; do not bypass that gate.

## DOCX context scope (slice D)

The previous CI run 43999538901 passed both jobs (51 verified XSDs, effective schema projection, exact evidence, historical regression gate). Pages remains blocked by the unrelated stale Ribbon icon inventory.

The new docx-scope.mjs traverses actual effective element-particle links from an explicit list of document part and drawing payload roots, separately per profile. The traversal tracks declaration-parent edges rather than expanding infinitely recursive paths. SpreadsheetML and PresentationML document roots are not added. Missing or ambiguous root selectors and unresolved particle links are reported. Shared and relationship-linked structures may still require explicit root extensions, including modern Microsoft namespaces and custom XML payloads; this is a partial candidate scope, not a complete OPC conformance inventory.

The generated docx-scope.json includes contextual elements, attributes, enum values, origin declarations, root/domain memberships and counts by profile. All schema row/attribute/value statuses start unknown. Matching namespace/profile/name registry observations are listed separately (parent-name match is only a hint), and never promoted to schema-wide evidence. This avoids conflating a test of one paragraph with all paragraph contexts. The new searchable scope.html paginates rows and supports attribute and enum search. The deployment generates the compact capability report plus scope JSON from verified schemas and passing evidence, without bundling the raw XSDs or entire internal graph.

The schema CI job now combines the actual Vitest evidence with the official inventory. Future work: exact schema-context evidence bindings, broader root and substitution/wildcard resolution, finer enum evidence, formal validator (OX-002). No coverage percentage is claimed.
