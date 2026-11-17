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

## Slice B — first real diagnostic remediation

CI 44001277782: 269 diagnostics over four positive fixtures (65 fresh paragraph, 71 fresh table, 65 source no-op, 68 source edited). Negative controls were detected. The actual JSON artifact shows repeated styles.xml cell-border ordering, qFormat/semiHidden lexical booleans, paragraph/run property ordering, and nested CSS font fallback strings exceeding Word font name limits. Fixes are applied in the generating serializers, not by deleting unknown imported XML. The positive gate now requires zero SDK/OPC diagnostics; if further findings emerge, fix them rather than adding a broad allowlist. No claim of a clean corpus until new CI passes. Official scope previously reached 17,531 contexts, 4,252 element declarations, 33,147 attribute occurrences and 102,094 enum value occurrences (still partial normative scope).

## Slice C — isolate remaining gallery metadata diagnostics and expand corpus

CI 44001670855 reduced the positive diagnostics from 269 to 88 (22 per package). The downloaded artifact confirms every remaining diagnostic was Sch_AttributeValueDataTypeDetailed in styles.xml on qFormat or semiHidden with explicit "true". The earlier numeric "1" was also rejected by this SDK profile; this is not proof that the XML Schema union itself disallows those lexemes. Fresh style generation now emits presence for true and explicit "off" for false (valid Transitional ST_OnOff token), including unhideWhenUsed. The importer already supports both forms; updated tests assert round-trip semantics. The existing zero-diagnostic gate remains intact and a fifth positive fixture explicitly exercises false flags. Focused serializer regression tests now run in the independent job rather than relying on Pages.

A separate extended-validation job generates seven feature packages (date field, header/footer, image, threaded comments, equation, decimal numbering, tracked property revisions), checks content markers and reports complete SDK/OPC diagnostics independently of the baseline gate. It fails on missing specimens or package-open errors; other diagnostics remain characterization until examined. No broad exception allowlist and no claim of clean output until the new CI confirms it. Both base and extended diagnostic reports print detailed IDs and XPath.
