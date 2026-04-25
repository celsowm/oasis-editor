# Common Edge Cases

## Text split across runs

Word can split a visual word across multiple runs. Merge where semantic formatting allows.

## Empty paragraphs

An empty paragraph can carry a page break, bookmark, comment marker, or section break. Inspect properties before dropping it.

## Styles are localized

Do not rely only on English style names like "Heading 1". Use style IDs and outline levels.

## Fake lists

Some documents use plain text bullets or numbers instead of real numbering. Detect heuristically only as an option.

## Tables are richer than Markdown

Merged cells, nested tables, and multiple paragraphs per cell require HTML or a structured sidecar.

## Source-scoped relationships

Images and links inside headers resolve through header `.rels`, not `document.xml.rels`.

## External images

External images should not be fetched unless explicitly allowed.

## Fields may be stale

Cached field results can be outdated. For Markdown, cached result is usually the least surprising output.

## Comments are ranges

A comment may cover a range, not just a point.

## Footnotes can be rich

Notes can contain tables, images, lists, and links.

## Text boxes contain text

Text boxes may be inside DrawingML or VML. Parse them if extraction completeness matters.

## OMML equations

Equations need OMML-to-MathML/LaTeX conversion or placeholders.

## Strict namespaces

Strict OOXML can use different namespace URIs. Support both if input coverage matters.

## Word repair behavior

Word opens some broken packages after repair. Decide whether to emulate repair or report warnings.
