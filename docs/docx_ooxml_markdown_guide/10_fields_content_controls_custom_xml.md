# Fields, Content Controls, and Custom XML

## Fields

Fields are dynamic Word constructs: page numbers, dates, references, TOCs, formulas, merge fields.

### Simple field

```xml
<w:fldSimple w:instr="DATE \@ &quot;yyyy-MM-dd&quot;">
  <w:r><w:t>2026-04-25</w:t></w:r>
</w:fldSimple>
```

### Complex field

```xml
<w:r><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
<w:r><w:fldChar w:fldCharType="separate"/></w:r>
<w:r><w:t>1</w:t></w:r>
<w:r><w:fldChar w:fldCharType="end"/></w:r>
```

Meaning:

```text
begin -> instruction -> separate -> cached result -> end
```

## Field policy

| Field | Suggested Markdown behavior |
|---|---|
| `HYPERLINK` | convert to link |
| `PAGE`, `NUMPAGES` | omit or placeholder |
| `TOC` | use cached result or regenerate from headings |
| `DATE`, `TIME` | use cached result |
| `REF`, `PAGEREF` | internal link or cached result |
| `MERGEFIELD` | `{{FieldName}}` placeholder |
| formula | cached result or expression metadata |

Default: render cached result and preserve instruction in metadata.

## Content controls

Content controls use `w:sdt`.

```xml
<w:sdt>
  <w:sdtPr>
    <w:alias w:val="Customer Name"/>
    <w:tag w:val="customer.name"/>
  </w:sdtPr>
  <w:sdtContent>
    <w:p><w:r><w:t>Ada Lovelace</w:t></w:r></w:p>
  </w:sdtContent>
</w:sdt>
```

Important properties:

| Element | Meaning |
|---|---|
| `w:alias` | label |
| `w:tag` | machine tag |
| `w:id` | control ID |
| `w:dataBinding` | binding to custom XML |
| `w:placeholder` | placeholder |
| `w:checkbox` | checkbox |
| `w:dropDownList` | dropdown |
| `w:date` | date control |

## Custom XML

Custom XML parts are usually under `/customXml/`. Content controls can bind to them with XPath.

```xml
<w:dataBinding
  w:storeItemID="{...}"
  w:xpath="/customer/name[1]"
  w:prefixMappings="xmlns:c='urn:customer'"/>
```

## altChunk

`w:altChunk` imports external content by relationship.

```xml
<w:altChunk r:id="rId10"/>
```

Resolve the relationship, inspect content type, then parse HTML/plain text/DOCX if supported. Otherwise emit a placeholder and warning.
