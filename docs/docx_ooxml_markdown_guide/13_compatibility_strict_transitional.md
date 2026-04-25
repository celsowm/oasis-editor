# Compatibility, Extensions, Strict, and Transitional

## Markup compatibility

DOCX may contain extension namespaces such as `w14`, `w15`, or `w16*`.

```xml
<w:document
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
```

`mc:Ignorable` means unsupported namespaces can be ignored.

## AlternateContent

```xml
<mc:AlternateContent>
  <mc:Choice Requires="w14">
    <!-- newer markup -->
  </mc:Choice>
  <mc:Fallback>
    <!-- compatible fallback -->
  </mc:Fallback>
</mc:AlternateContent>
```

Choose the first supported `Choice`; otherwise use `Fallback`.

## Strict vs Transitional

OOXML has Strict and Transitional variants. Transitional includes legacy compatibility features; Strict removes many legacy constructs.

Practical advice:

- accept Transitional for broad real-world input;
- support Strict namespaces if coverage matters;
- emit a conservative subset when writing;
- preserve unknown markup when round-tripping.

## Legacy and modern areas

| Area | Markup | Notes |
|---|---|---|
| modern drawings | DrawingML | preferred |
| legacy drawings | VML | common in older docs |
| equations | OMML | convert or placeholder |
| extension features | `w14`, `w15`, etc. | often ignorable |
| macros | `.docm`, not normal `.docx` | security-sensitive |

## Unknown markup policy

```pseudo
if namespace supported:
  parse
elif marked ignorable:
  skip or preserve
elif fallback exists:
  use fallback
else:
  warn and preserve placeholder
```
