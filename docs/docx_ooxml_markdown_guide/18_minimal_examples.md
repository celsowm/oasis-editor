# Minimal Examples

## Minimal package tree

```text
minimal.docx
├── [Content_Types].xml
├── _rels/.rels
└── word/document.xml
```

## `[Content_Types].xml`

```xml
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
```

## `/_rels/.rels`

```xml
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>
```

## `/word/document.xml`

```xml
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Hello DOCX</w:t>
      </w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>
```

## Heading

```xml
<w:p>
  <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
  <w:r><w:t>Chapter title</w:t></w:r>
</w:p>
```

Markdown:

```md
# Chapter title
```

## Hyperlink

```xml
<w:hyperlink r:id="rId2">
  <w:r><w:t>Example</w:t></w:r>
</w:hyperlink>
```

Relationship target is the URL. Markdown:

```md
[Example](https://example.com)
```

## Image

```xml
<a:blip r:embed="rId3"/>
```

Relationship target is `word/media/image1.png`. Markdown:

```md
![Alt text](assets/image1.png)
```

## Table

```xml
<w:tbl>
  <w:tr>
    <w:tc><w:p><w:r><w:t>Name</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:r><w:t>Age</w:t></w:r></w:p></w:tc>
  </w:tr>
</w:tbl>
```

Markdown if simple:

```md
| Name | Age |
|---|---|
```
