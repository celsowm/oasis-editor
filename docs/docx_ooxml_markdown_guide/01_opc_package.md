# OPC Package

## What OPC means

Open Packaging Conventions represent a document as a ZIP package of addressable **parts**. Each part has:

- a part name, usually URI-like, such as `/word/document.xml`;
- a content type;
- optional relationships to other parts or external resources.

DOCX uses OPC for Word documents. PPTX and XLSX also use OPC, but their XML vocabularies differ.

## Typical DOCX structure

```text
example.docx
├── [Content_Types].xml
├── _rels/
│   └── .rels
├── docProps/
│   ├── core.xml
│   ├── app.xml
│   └── custom.xml
├── word/
│   ├── document.xml
│   ├── styles.xml
│   ├── numbering.xml
│   ├── settings.xml
│   ├── fontTable.xml
│   ├── theme/theme1.xml
│   ├── media/image1.png
│   ├── comments.xml
│   ├── footnotes.xml
│   ├── endnotes.xml
│   ├── header1.xml
│   ├── footer1.xml
│   └── _rels/document.xml.rels
└── customXml/
```

Only a small subset is required for a minimal document. Many real files omit optional parts.

## Package entry points

### `[Content_Types].xml`

Defines MIME-style content types for parts.

```xml
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
```

### `/_rels/.rels`

Package-level relationships. This is normally the first logical entry point.

```xml
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>
```

## Loading algorithm

```pseudo
zip = openZip(file)
contentTypes = parse("/[Content_Types].xml")
packageRels = parse("/_rels/.rels")
mainRel = packageRels.find(type endsWith "/officeDocument")
mainPart = resolveFromPackageRoot(mainRel.Target)
mainXml = parse(mainPart)
mainRels = parseRelationshipsFor(mainPart)
```

## Important implementation details

- Use relationships to find parts. Do not assume `/word/document.xml` is always the main document.
- Resolve relative relationship targets against the source part directory.
- Relationship IDs are scoped to the source part.
- Missing optional parts should not crash the converter.
- Unknown parts should be ignored safely or preserved for round-trip workflows.
