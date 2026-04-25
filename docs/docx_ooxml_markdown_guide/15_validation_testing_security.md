# Validation, Testing, and Security

## Validation layers

1. ZIP validity and limits.
2. OPC package structure.
3. XML well-formedness.
4. Relationship graph integrity.
5. WordprocessingML feature parsing.
6. Target output validation.

## Package checklist

- `[Content_Types].xml` exists.
- `/_rels/.rels` exists.
- `officeDocument` relationship exists.
- main document part exists.
- relationship targets resolve.
- external targets are blocked or sanitized.
- media content types match expected types.
- XML parser does not fetch external entities.

## Test fixture suite

Create fixtures for:

- minimal document;
- formatted runs;
- headings;
- nested lists and restarts;
- simple and complex tables;
- images with alt text;
- external/internal links;
- bookmarks;
- footnotes/endnotes;
- comments;
- fields and TOC;
- sections, headers, footers;
- tracked changes;
- RTL text;
- OMML equations;
- VML images;
- Strict namespace documents;
- malformed packages.

## Security

### ZIP bombs

Limit uncompressed size, file count, compression ratio, and XML depth.

### Path traversal

Never extract ZIP names directly. Sanitize and verify output paths.

### External relationships

Never fetch external targets by default.

### Embedded objects

Treat OLE/embedded packages as untrusted binary data.

### XML parser

Disable DTDs and external entity resolution.

## Testing strategy

Use golden tests:

```text
fixture.docx
expected.md
expected-assets/
expected-warnings.json
```

Compare output text, asset hashes, warnings, and metadata.
