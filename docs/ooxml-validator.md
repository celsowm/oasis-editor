# Open XML validator (OX-002, slice A)

The .NET 8 console tool uses Microsoft DocumentFormat.OpenXml 3.3.0,
Office2021 validation profile, and independent OPC structural checks.
It opens generated documents read-only; external targets are never fetched.
This is not an independent Strict conformance certification or a Word
open/save oracle. No Word installation is required.

The opt-in Vitest corpus uses production export, import + source attachment,
no-op and localized mutation. Negative controls break a relationship and
insert an invalid WML element. CI checks that the two controls are detected
and that production outputs can be opened. Reports contain fixture SHA256,
diagnostic ID, category, part URI, XPath and description.

Local (Bash):
    OOXML_VALIDATION_CORPUS=test-results/ooxml-validation/corpus npx vitest run tests/vitest/__tests__/ooxml/validationCorpus.test.ts
    dotnet run --project tools/ooxml-validator/OoxmlValidator.csproj -- test-results/ooxml-validation/corpus/positive test-results/ooxml-validation/positive.json
    dotnet run --project tools/ooxml-validator/OoxmlValidator.csproj -- test-results/ooxml-validation/corpus/negative test-results/ooxml-validation/negative.json
    node scripts/ooxml/check-validator-corpus.mjs test-results/ooxml-validation/positive.json test-results/ooxml-validation/negative.json

Pass --require-clean to the validator for strict zero-diagnostic mode.
The first CI is intentionally a characterization run for existing
production artifacts: schema/semantic findings are reported, not silently
allowlisted. Next slice must inspect the actual results, fix serializer bugs
and/or pin narrowly reviewed fixture-specific exceptions, then hard-fail new
diagnostics. No Word parity, full package graph correctness, arbitrary
untrusted file safety or Strict profile is claimed. Run only on trusted
synthetic corpus in CI; resource/security hardening remains OX-003.

The existing XSD inventory also has a mandatory official corpus smoke
gate: the two Word profiles must reach body/p/r/t, enumerate numbering
formats and reach substantial attribute counts. The previous green CI
produced only 75 root rows and zero attributes because QName resolution
failed on official default namespaces. The new test covers this case.
