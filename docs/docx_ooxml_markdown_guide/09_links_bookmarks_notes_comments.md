# Hyperlinks, Bookmarks, Notes, and Comments

## Hyperlinks

External hyperlink:

```xml
<w:hyperlink r:id="rId6">
  <w:r><w:t>Example</w:t></w:r>
</w:hyperlink>
```

Relationship:

```xml
<Relationship Id="rId6"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
  Target="https://example.com"
  TargetMode="External"/>
```

Internal hyperlink:

```xml
<w:hyperlink w:anchor="BookmarkName">
  <w:r><w:t>Jump</w:t></w:r>
</w:hyperlink>
```

Markdown:

```md
[Example](https://example.com)
[Jump](#bookmarkname)
```

## Bookmarks

```xml
<w:bookmarkStart w:id="0" w:name="Chapter1"/>
<w:r><w:t>Chapter 1</w:t></w:r>
<w:bookmarkEnd w:id="0"/>
```

Markdown has no universal anchor syntax. Use HTML anchors or renderer-specific slug logic.

## Footnotes

Reference:

```xml
<w:footnoteReference w:id="2"/>
```

Body in `/word/footnotes.xml`:

```xml
<w:footnote w:id="2">
  <w:p><w:r><w:t>Footnote text.</w:t></w:r></w:p>
</w:footnote>
```

Markdown:

```md
Text.[^2]

[^2]: Footnote text.
```

## Endnotes

Endnotes are similar to footnotes, using `w:endnoteReference` and `/word/endnotes.xml`.

## Comments

A comment can span a range.

```xml
<w:commentRangeStart w:id="3"/>
<w:r><w:t>commented text</w:t></w:r>
<w:commentRangeEnd w:id="3"/>
<w:r><w:commentReference w:id="3"/></w:r>
```

Comment body:

```xml
<w:comment w:id="3" w:author="Jane" w:date="2026-01-01T10:00:00Z">
  <w:p><w:r><w:t>Please revise.</w:t></w:r></w:p>
</w:comment>
```

## Conversion policies

| Feature | Plain Markdown | HTML |
|---|---|---|
| hyperlink | native Markdown link | `<a>` |
| bookmark | HTML anchor | `<a id>` |
| footnote | footnote extension | linked note section |
| endnote | final notes section | linked note section |
| comment | sidecar/footnote | annotation spans/sidebar |

Notes and comments may contain rich block content. Model them as block arrays, not plain strings.
