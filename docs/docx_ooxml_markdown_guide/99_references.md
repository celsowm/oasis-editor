# References

## Standards

- ECMA-376, Office Open XML File Formats: https://ecma-international.org/publications-and-standards/standards/ecma-376/
- ISO/IEC 29500, Office Open XML File Formats: https://www.iso.org/standard/71691.html

## Microsoft documentation

- Structure of a WordprocessingML document: https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document
- Open Packaging Conventions fundamentals: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/opc/open-packaging-conventions-overview
- Open XML SDK overview: https://learn.microsoft.com/en-us/office/open-xml/about-the-open-xml-sdk
- Working with WordprocessingML tables: https://learn.microsoft.com/en-us/office/open-xml/word/working-with-wordprocessingml-tables

## Useful libraries and tools

- Open XML SDK for .NET
- docx4j for Java
- python-docx for Python
- mammoth for DOCX to HTML
- pandoc for document conversion
- LibreOffice for cross-implementation testing

## Agent notes

When generating converter code:

1. implement OPC and relationship resolution first;
2. parse styles and numbering before rendering paragraphs;
3. apply revision policy before list/table reconstruction;
4. use HTML fallback for complex tables and annotations;
5. emit structured warnings rather than silently dropping features.
