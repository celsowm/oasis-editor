# WordprocessingML Document Model

## Minimal document

```xml
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Hello</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>
```

## Core hierarchy

```text
w:document
  w:body
    w:p      paragraph
    w:tbl    table
    w:sdt    content control
    w:altChunk imported external content
    w:sectPr final section properties
```

## Stories

WordprocessingML documents are organized as stories. The main story is required; others are optional.

| Story | Part | Root |
|---|---|---|
| Main document | `/word/document.xml` | `w:document` |
| Header | `/word/headerN.xml` | `w:hdr` |
| Footer | `/word/footerN.xml` | `w:ftr` |
| Footnotes | `/word/footnotes.xml` | `w:footnotes` |
| Endnotes | `/word/endnotes.xml` | `w:endnotes` |
| Comments | `/word/comments.xml` | `w:comments` |
| Glossary | `/word/glossary/document.xml` or similar | `w:glossaryDocument` |
| Text box | inside drawing/VML | nested WordprocessingML-like content |

## Paragraphs and runs

```xml
<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading1"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/></w:rPr>
    <w:t>Title</w:t>
  </w:r>
</w:p>
```

- `w:p` is a paragraph.
- `w:pPr` contains paragraph properties.
- `w:r` is a run: a span of inline content with common properties.
- `w:rPr` contains run properties.
- `w:t` contains text.

## Run children

Runs can contain more than text.

| Element | Meaning |
|---|---|
| `w:t` | text |
| `w:tab` | tab |
| `w:br` | line/page/column break |
| `w:drawing` | modern drawing/image |
| `w:pict` | legacy VML drawing/image |
| `w:footnoteReference` | footnote reference |
| `w:endnoteReference` | endnote reference |
| `w:commentReference` | comment marker |
| `w:fldChar`, `w:instrText` | complex field |
| `m:oMath`, `m:oMathPara` | Office Math |

## Formatting cascade

Effective formatting can come from:

```text
document defaults
  -> base style chain
    -> paragraph or character style
      -> numbering level properties
        -> direct paragraph/run properties
```

For Markdown, preserve semantics first. For visual conversion, compute effective properties.
