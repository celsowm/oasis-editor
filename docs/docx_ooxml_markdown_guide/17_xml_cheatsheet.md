# XML Cheat Sheet

## Core package files

| File | Purpose |
|---|---|
| `[Content_Types].xml` | content type map |
| `_rels/.rels` | package relationships |
| `word/document.xml` | main story |
| `word/_rels/document.xml.rels` | main story relationships |
| `word/styles.xml` | styles |
| `word/numbering.xml` | lists |
| `word/settings.xml` | settings |
| `word/media/*` | media |
| `docProps/core.xml` | core metadata |

## WordprocessingML

| Element | Meaning |
|---|---|
| `w:document` | main document root |
| `w:body` | body |
| `w:p` | paragraph |
| `w:pPr` | paragraph properties |
| `w:r` | run |
| `w:rPr` | run properties |
| `w:t` | text |
| `w:tbl` | table |
| `w:tr` | row |
| `w:tc` | cell |
| `w:sectPr` | section properties |

## Lists

| Element | Meaning |
|---|---|
| `w:numbering` | numbering root |
| `w:abstractNum` | list template |
| `w:num` | concrete list instance |
| `w:lvl` | level definition |
| `w:numId` | concrete list ID |
| `w:ilvl` | level index |
| `w:numFmt` | marker format |
| `w:lvlText` | marker pattern |

## Tables

| Element | Meaning |
|---|---|
| `w:tblPr` | table properties |
| `w:tblGrid` | grid |
| `w:gridCol` | grid column |
| `w:trPr` | row properties |
| `w:tcPr` | cell properties |
| `w:gridSpan` | colspan |
| `w:vMerge` | rowspan |

## Images

| Element / attr | Meaning |
|---|---|
| `w:drawing` | modern drawing |
| `wp:inline` | inline image/object |
| `wp:anchor` | floating object |
| `wp:extent/@cx/@cy` | size in EMUs |
| `wp:docPr/@descr` | alt text |
| `a:blip/@r:embed` | image relationship |
| `w:pict` | legacy VML |

## Namespace constants

```ts
export const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  m: 'http://schemas.openxmlformats.org/officeDocument/2006/math',
  mc: 'http://schemas.openxmlformats.org/markup-compatibility/2006',
  v: 'urn:schemas-microsoft-com:vml'
};
```
