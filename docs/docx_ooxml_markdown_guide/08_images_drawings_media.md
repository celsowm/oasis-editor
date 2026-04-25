# Images, Drawings, and Media

## Modern images: DrawingML

Images usually appear inside `w:drawing`.

```xml
<w:drawing>
  <wp:inline>
    <wp:extent cx="1828800" cy="914400"/>
    <wp:docPr id="1" name="Picture 1" descr="Alt text"/>
    <a:graphic>
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic>
          <pic:blipFill>
            <a:blip r:embed="rId5"/>
          </pic:blipFill>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

The binary image is a separate part. Resolve `a:blip/@r:embed` using the current part's relationships.

## Inline vs anchored

| Element | Meaning | Conversion |
|---|---|---|
| `wp:inline` | inline with text flow | easy to emit at run position |
| `wp:anchor` | floating positioned object | approximate or preserve metadata |

## Dimensions

Drawing sizes use EMUs:

```text
914400 EMUs = 1 inch
12700 EMUs = 1 point
9525 EMUs ~= 1 px at 96 DPI
```

## Alt text

Look for:

| Location | Meaning |
|---|---|
| `wp:docPr/@descr` | description / alt text |
| `wp:docPr/@title` | title |
| `pic:cNvPr/@descr` | picture description |
| `pic:cNvPr/@name` | picture name |

## Markdown output

```md
![Alt text](assets/image1.png)
```

Copy images to an assets folder using sanitized deterministic names.

## Legacy VML images

Older documents may use `w:pict` and VML.

```xml
<w:pict>
  <v:shape style="width:100pt;height:50pt">
    <v:imagedata r:id="rId8"/>
  </v:shape>
</w:pict>
```

Support VML image extraction if broad compatibility matters.

## Other objects

| Object | Common representation | Strategy |
|---|---|---|
| chart | chart part | render/placeholder |
| SmartArt | diagram parts | placeholder or image fallback |
| OLE object | embedded object | untrusted binary placeholder |
| equation | OMML | convert to MathML/LaTeX or placeholder |
| text box | DrawingML/VML | parse nested text if needed |
