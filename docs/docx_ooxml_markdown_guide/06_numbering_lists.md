# Numbering and Lists

## Paragraph list reference

A list paragraph points to numbering definitions through `w:numPr`.

```xml
<w:pPr>
  <w:numPr>
    <w:ilvl w:val="0"/>
    <w:numId w:val="3"/>
  </w:numPr>
</w:pPr>
```

- `w:numId` is the concrete list instance.
- `w:ilvl` is the level, usually 0 to 8.

## Numbering part

Lists usually live in `/word/numbering.xml`.

```xml
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
</w:numbering>
```

## Model

```text
abstractNum = reusable list template
num = concrete list instance that points to abstractNum
lvl = per-level formatting and counter rules
```

## Common level properties

| Element | Meaning |
|---|---|
| `w:start` | start value |
| `w:numFmt` | decimal, bullet, lowerLetter, upperRoman, etc. |
| `w:lvlText` | display pattern like `%1.` or `%1.%2.` |
| `w:lvlJc` | marker justification |
| `w:pPr` | paragraph properties for level |
| `w:rPr` | marker run properties |
| `w:suff` | suffix after marker |

## Formats

| `w:numFmt` | Markdown support |
|---|---|
| `bullet` | yes |
| `decimal` | yes |
| `lowerLetter` | partial |
| `upperLetter` | partial |
| `lowerRoman` | partial |
| `upperRoman` | partial |
| `none` | no direct marker |

## Counter algorithm

```pseudo
for paragraph in document order:
  numPr = paragraph.directNumPr or styleNumPr
  if not numPr:
    emit normal paragraph
    continue

  num = numbering.num[numPr.numId]
  abstract = numbering.abstractNum[num.abstractNumId]
  level = override(num, numPr.ilvl) or abstract.level[numPr.ilvl]
  update counter state for numId and ilvl
  emit list item
```

Apply tracked-change policy before reconstructing lists.
