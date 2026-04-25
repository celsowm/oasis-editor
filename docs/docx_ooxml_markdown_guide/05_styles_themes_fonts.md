# Styles, Themes, and Fonts

## Styles part

Styles usually live in `/word/styles.xml`.

```xml
<w:style w:type="paragraph" w:styleId="Heading1">
  <w:name w:val="heading 1"/>
  <w:basedOn w:val="Normal"/>
  <w:next w:val="Normal"/>
  <w:qFormat/>
  <w:pPr>
    <w:outlineLvl w:val="0"/>
  </w:pPr>
  <w:rPr>
    <w:b/>
    <w:sz w:val="32"/>
  </w:rPr>
</w:style>
```

## Style types

| Type | Applies to |
|---|---|
| `paragraph` | paragraphs |
| `character` | runs |
| `table` | tables |
| `numbering` | numbering/list formatting |

## Important style fields

| Element | Meaning |
|---|---|
| `w:name` | human-readable style name |
| `w:basedOn` | parent style |
| `w:next` | next paragraph style |
| `w:link` | linked paragraph/character style |
| `w:pPr` | paragraph properties |
| `w:rPr` | run properties |
| `w:tblPr` | table properties |
| `w:qFormat` | primary style shown in UI |
| `w:default` | default style for type |

## Document defaults

```xml
<w:docDefaults>
  <w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="160"/></w:pPr></w:pPrDefault>
</w:docDefaults>
```

## Semantic mapping

Do not rely only on English style names. Better heading detection:

1. known style IDs such as `Heading1`;
2. localized or normalized style names;
3. `w:outlineLvl`, where `0` means heading level 1;
4. formatting heuristics as weak fallback.

## Themes

Themes usually live in `/word/theme/theme1.xml`. Styles may reference theme colors and fonts.

```xml
<w:color w:val="000000" w:themeColor="accent1"/>
<w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/>
```

Markdown usually ignores theme details. HTML/PDF converters may resolve them into CSS or layout values.

## Font table

`/word/fontTable.xml` declares fonts. Do not assume fonts are installed. Use fallback.
