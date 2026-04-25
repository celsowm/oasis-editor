# Relationships and Content Types

## Relationships

Relationships connect a package or part to another part or an external resource.

```xml
<Relationship Id="rId5"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
  Target="media/image1.png"/>
```

Fields:

| Field | Meaning |
|---|---|
| `Id` | Local identifier used by XML such as `r:id`, `r:embed`, or `r:link` |
| `Type` | Relationship semantic type URI |
| `Target` | Relative part name, absolute part name, or external URI |
| `TargetMode` | Usually `External` for external links |

## Resolving a relationship

```pseudo
function resolveRel(sourcePartName, relId):
  rels = relationshipsFor(sourcePartName)
  rel = rels[relId]
  if rel.TargetMode == "External":
    return ExternalResource(rel.Target)
  return Part(resolveRelative(sourcePartName, rel.Target))
```

Example:

```text
source part: /word/document.xml
target: media/image1.png
resolved part: /word/media/image1.png
```

## Common relationship types

| Purpose | Type suffix | Target example |
|---|---|---|
| Main document | `/officeDocument` | `word/document.xml` |
| Styles | `/styles` | `styles.xml` |
| Numbering | `/numbering` | `numbering.xml` |
| Image | `/image` | `media/image1.png` |
| Hyperlink | `/hyperlink` | `https://example.com` |
| Header | `/header` | `header1.xml` |
| Footer | `/footer` | `footer1.xml` |
| Footnotes | `/footnotes` | `footnotes.xml` |
| Endnotes | `/endnotes` | `endnotes.xml` |
| Comments | `/comments` | `comments.xml` |
| Theme | `/theme` | `theme/theme1.xml` |
| Settings | `/settings` | `settings.xml` |

## Content types

`[Content_Types].xml` maps file extensions and specific parts to content types.

```xml
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/styles.xml"
  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
```

Use content types to validate and classify parts, but use relationships to navigate.

## Writing checklist

When adding a new image, header, footer, comments part, or other part:

1. create the ZIP part;
2. add a content type default or override;
3. add a relationship from the source part;
4. reference the new relationship ID in XML;
5. ensure no dangling relationships.

## Security

Do not fetch external relationships automatically.

```text
TargetMode="External"
Target="file:///etc/passwd"
Target="http://internal-service.local"
```

For a converter, external links should be inert unless an explicit allowlist policy enables fetching.
