# Tables

## Basic structure

```xml
<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="5000" w:type="pct"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="2400"/>
    <w:gridCol w:w="2400"/>
  </w:tblGrid>
  <w:tr>
    <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
  </w:tr>
</w:tbl>
```

## Elements

| Element | Meaning |
|---|---|
| `w:tbl` | table |
| `w:tblPr` | table properties |
| `w:tblGrid` | grid definition |
| `w:gridCol` | grid column |
| `w:tr` | row |
| `w:trPr` | row properties |
| `w:tc` | cell |
| `w:tcPr` | cell properties |

## Cell properties

| Element | Meaning |
|---|---|
| `w:tcW` | cell width |
| `w:gridSpan` | horizontal merge / colspan |
| `w:vMerge` | vertical merge / rowspan |
| `w:tcBorders` | borders |
| `w:shd` | shading |
| `w:vAlign` | vertical alignment |
| `w:textDirection` | rotated/directional text |

## Horizontal merge

```xml
<w:tcPr>
  <w:gridSpan w:val="2"/>
</w:tcPr>
```

## Vertical merge

```xml
<w:vMerge w:val="restart"/>
<w:vMerge/>
```

The first starts a rowspan; the continuation cells point to the cell above.

## Normalized grid algorithm

```pseudo
for each row:
  col = 0
  apply pending vertical merges
  for each cell:
    col = next free column
    colspan = gridSpan or 1
    if vMerge restart: start rowspan
    if vMerge continuation: attach to owner above
    place cell
```

## Markdown fallback policy

Markdown tables only handle simple rectangular tables. Use HTML when the table has:

- merged cells;
- nested tables;
- multiple block paragraphs per cell;
- images or notes in cells;
- complex alignment or vertical text.

## IR

```ts
interface TableBlock {
  rows: TableRow[];
  grid: GridColumn[];
  canRenderAsMarkdown: boolean;
}

interface TableCell {
  rowSpan: number;
  colSpan: number;
  blocks: Block[];
}
```
