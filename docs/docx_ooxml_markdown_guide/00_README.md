# DOCX / OOXML Converter Knowledge Base

This is an agent-friendly Markdown knowledge base for building a `.docx` converter.

A `.docx` file is an **Office Open XML** package. Internally it is a ZIP archive that follows the **Open Packaging Conventions** (OPC). The word-processing XML vocabulary inside the package is **WordprocessingML**.

## Main mental model

```text
.docx ZIP package
  [Content_Types].xml
  _rels/.rels
    -> relationship to /word/document.xml
  word/document.xml
    -> paragraphs, tables, sections
  word/_rels/document.xml.rels
    -> relationships to images, hyperlinks, headers, footers, comments, etc.
  word/styles.xml
  word/numbering.xml
  word/media/*
  docProps/*
```

## Reading order

1. `01_opc_package.md`
2. `02_relationships_content_types.md`
3. `03_wordprocessingml_model.md`
4. `04_text_paragraphs_runs.md`
5. `05_styles_themes_fonts.md`
6. `06_numbering_lists.md`
7. `07_tables.md`
8. `08_images_drawings_media.md`
9. `09_links_bookmarks_notes_comments.md`
10. `10_fields_content_controls_custom_xml.md`
11. `11_sections_headers_footers_layout.md`
12. `12_revisions_tracked_changes.md`
13. `13_compatibility_strict_transitional.md`
14. `14_converter_architecture.md`
15. `15_validation_testing_security.md`
16. `16_edge_cases.md`
17. `17_xml_cheatsheet.md`
18. `18_minimal_examples.md`
19. `99_references.md`

## Converter principle

Do not treat DOCX as one XML file. Treat it as a package graph:

```pseudo
open zip
parse [Content_Types].xml
parse /_rels/.rels
locate officeDocument relationship
load /word/document.xml
load relationships for each source part
parse styles, numbering, notes, comments, media, headers, footers as needed
emit an intermediate representation
render Markdown/HTML/plain text/etc.
```

## Recommended intermediate representation

```ts
interface DocumentIR {
  metadata: Metadata;
  blocks: Block[];
  styles: StyleRegistry;
  numbering: NumberingRegistry;
  assets: AssetRegistry;
  notes: NotesRegistry;
  comments: CommentRegistry;
  warnings: ConversionWarning[];
}

type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListItemBlock
  | TableBlock
  | SectionBreakBlock
  | UnsupportedBlock;

type Inline =
  | TextInline
  | StrongInline
  | EmphasisInline
  | LinkInline
  | ImageInline
  | BreakInline
  | FieldInline
  | NoteReferenceInline
  | CommentReferenceInline
  | UnsupportedInline;
```

## Namespace warning

Never parse by literal prefix such as `w:p`. Prefixes are aliases. Match by namespace URI and local name.
