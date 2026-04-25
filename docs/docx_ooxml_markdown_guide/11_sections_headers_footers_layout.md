# Sections, Headers, Footers, and Layout

## Section properties

Section properties are `w:sectPr`. They can appear at the end of `w:body` or inside a paragraph's `w:pPr`.

```xml
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
```

## Common section properties

| Element | Meaning |
|---|---|
| `w:pgSz` | page size and orientation |
| `w:pgMar` | margins |
| `w:cols` | columns |
| `w:type` | break type |
| `w:headerReference` | header relationship |
| `w:footerReference` | footer relationship |
| `w:titlePg` | different first page |
| `w:lnNumType` | line numbering |
| `w:pgBorders` | page borders |

## Headers and footers

```xml
<w:sectPr>
  <w:headerReference w:type="default" r:id="rId9"/>
  <w:footerReference w:type="default" r:id="rId10"/>
</w:sectPr>
```

Types:

| Type | Meaning |
|---|---|
| `default` | regular pages |
| `first` | first page |
| `even` | even pages |

Resolve header/footer `r:id` through the source part's relationships.

## Page breaks

Run-level page break:

```xml
<w:br w:type="page"/>
```

Section break:

```xml
<w:sectPr>
  <w:type w:val="nextPage"/>
</w:sectPr>
```

## Section parsing

```pseudo
currentSection = default
for each block in body:
  parse block
  if paragraph has pPr/sectPr:
    close section after this paragraph
    start new section
if body has sectPr:
  apply to final section
```

## Markdown policy

Markdown does not model page geometry. Common options:

- omit headers/footers;
- export as metadata;
- render inline at section boundaries;
- export sidecar files;
- preserve page breaks as comments such as `<!-- page break -->`.
