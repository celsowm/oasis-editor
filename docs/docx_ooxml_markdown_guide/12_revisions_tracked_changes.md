# Revisions and Tracked Changes

## Common revision elements

| Element | Meaning |
|---|---|
| `w:ins` | inserted content |
| `w:del` | deleted content |
| `w:moveFrom` | moved-from content |
| `w:moveTo` | moved-to content |
| `w:rPrChange` | run property change |
| `w:pPrChange` | paragraph property change |
| `w:delText` | deleted text |

Example:

```xml
<w:ins w:id="1" w:author="Jane" w:date="2026-01-01T12:00:00Z">
  <w:r><w:t>new</w:t></w:r>
</w:ins>
<w:del w:id="2" w:author="Jane">
  <w:r><w:delText>old</w:delText></w:r>
</w:del>
```

## Revision modes

### Accept

- include `w:ins` and `w:moveTo`;
- exclude `w:del` and `w:moveFrom`.

### Reject

- exclude `w:ins` and `w:moveTo`;
- include `w:del` and `w:moveFrom`.

### Preserve

Markdown-ish:

```md
++inserted++ ~~deleted~~
```

HTML:

```html
<ins data-author="Jane">inserted</ins>
<del data-author="Jane">deleted</del>
```

## Recommended order

Apply revision policy before:

- reconstructing lists;
- normalizing tables;
- merging runs;
- extracting semantic text.

## Edge cases

| Case | Handling |
|---|---|
| revision wraps paragraphs | support block-level revision nodes |
| deleted paragraph mark | can merge paragraphs; warn if not supported |
| nested revisions | recurse |
| missing author/date | keep revision ID and type |
| revisions inside tables | normalize before grid reconstruction |
