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
