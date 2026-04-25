# Converter Architecture

## Pipeline

```text
Safe ZIP reader
  -> OPC graph builder
    -> part registry
      -> WordprocessingML normalizer
        -> DocumentIR
          -> renderer
```

## Stage responsibilities

### Safe ZIP reader

- prevent zip bombs;
- prevent path traversal;
- enforce size limits;
- expose byte streams.

### OPC graph builder

- parse `[Content_Types].xml`;
- parse `.rels`;
- resolve targets;
- classify parts.

### Part registry

Lazy-load known parts:

```ts
interface DocxPackage {
  mainDocument: XmlPart;
  styles?: StylesPart;
  numbering?: NumberingPart;
  comments?: CommentsPart;
  footnotes?: NotesPart;
  endnotes?: NotesPart;
  media: AssetRegistry;
}
```

### Normalizer

- resolve `mc:AlternateContent`;
- apply revision policy;
- unwrap content controls if configured;
- build style and numbering registries;
- resolve relationships into typed references.

### Renderer

A Markdown renderer should:

- coalesce adjacent compatible runs;
- escape Markdown syntax;
- render headings/lists/tables/links/images;
- fallback to HTML for complex structures;
- emit assets and warnings.

## Configuration

```ts
interface ConversionOptions {
  revisionMode: 'accept' | 'reject' | 'preserve';
  headersFooters: 'omit' | 'metadata' | 'inline' | 'sidecar';
  comments: 'omit' | 'footnotes' | 'html' | 'sidecar';
  imageMode: 'copy' | 'dataUri' | 'placeholder';
  complexTableMode: 'html' | 'flatten' | 'placeholder';
  fieldMode: 'cachedResult' | 'instruction' | 'preserve';
  hiddenTextMode: 'omit' | 'include' | 'mark';
  externalRelationshipPolicy: 'preserveLink' | 'strip' | 'fetchWithAllowlist';
}
```

## Warning model

```ts
interface ConversionWarning {
  code: string;
  message: string;
  partName?: string;
  xmlPath?: string;
  severity: 'info' | 'warning' | 'error';
}
```

Examples:

- `MISSING_RELATIONSHIP`
- `UNSUPPORTED_ALTCHUNK`
- `COMPLEX_TABLE_HTML_FALLBACK`
- `EXTERNAL_IMAGE_BLOCKED`
- `UNKNOWN_EXTENSION_MARKUP`
