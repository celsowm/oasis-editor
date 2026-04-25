# Text, Paragraphs, Runs, and Formatting

## Paragraph properties

Common `w:pPr` children:

| Element | Meaning |
|---|---|
| `w:pStyle` | paragraph style ID |
| `w:numPr` | list/numbering info |
| `w:jc` | justification |
| `w:spacing` | spacing before/after/line |
| `w:ind` | indentation |
| `w:tabs` | tab stops |
| `w:outlineLvl` | outline level |
| `w:pageBreakBefore` | page break before paragraph |
| `w:bidi` | right-to-left paragraph |

## Run properties

Common `w:rPr` children:

| Element | Meaning |
|---|---|
| `w:rStyle` | character style |
| `w:b` | bold |
| `w:i` | italic |
| `w:u` | underline |
| `w:strike` | strike-through |
| `w:color` | text color |
| `w:highlight` | highlight |
| `w:sz` | size in half-points |
| `w:rFonts` | font selection |
| `w:vertAlign` | superscript/subscript |
| `w:vanish` | hidden text |
| `w:lang` | language |

## Whitespace

Text appears in `w:t`.

```xml
<w:t xml:space="preserve"> leading and trailing spaces </w:t>
```

Preserve raw text while parsing. Normalize only when rendering.

## Special inline tokens

| XML | Suggested text token |
|---|---|
| `w:tab` | `\t` |
| `w:br` | line break |
| `w:br w:type="page"` | page break token |
| `w:noBreakHyphen` | U+2011 |
| `w:softHyphen` | U+00AD |
| `w:sym` | symbol mapping or fallback |

## Units

| Context | Unit | Example |
|---|---|---|
| margins/indentation | twips | 1440 = 1 inch |
| font size `w:sz` | half-points | 24 = 12 pt |
| borders | eighths of a point | 8 = 1 pt |
| drawings | EMUs | 914400 = 1 inch |
| table pct width | fiftieths of percent | 5000 = 100% |

## Markdown mapping

| DOCX signal | Markdown |
|---|---|
| Heading style or outline level | `#`, `##`, etc. |
| bold | `**text**` |
| italic | `*text*` |
| strike | `~~text~~` if supported |
| hyperlink | `[text](url)` |
| line break | `<br>` or Markdown hard break |
| page break | HTML comment or target-specific marker |
| hidden text | omit by default |

## Merge adjacent runs

Word often splits words into many runs. Merge adjacent runs with equivalent Markdown semantics.

Bad:

```md
**Hel****lo**
```

Good:

```md
**Hello**
```
