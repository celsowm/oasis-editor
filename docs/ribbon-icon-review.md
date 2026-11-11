# Ribbon SVG review — document stories and footnotes

This is the first implemented family review from I01–I07 in the [execution plan](ribbon-office-execution-plan.md). Other families remain open in [the delivery ledger](ribbon-office-progress.md).

## Decisions and artwork

Classic Word's page/story organization is the semantic reference. The new vectors are original Oasis artwork, using a 24×24 viewBox, a shared page silhouette, 1.7–1.8 unit strokes, and the owning theme's accent. No Microsoft or WordCraft icon files are copied.

| Action or menu                  | Previous icon                       | Current icon            | Decision and observed defect                                                                                                                                                                                                 |
| ------------------------------- | ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header/Footer destinations menu | `panel-top`                         | `pageHeaderFooter`      | Replace an application-panel metaphor with a page showing both story regions. This is a menu trigger, not a document command.                                                                                                |
| `editHeader`                    | `panel-top`                         | `pageHeader`            | Replace: identify a page's upper region.                                                                                                                                                                                     |
| `editFooter`                    | `panel-bottom`                      | `pageFooter`            | Replace: use the same page family with a distinct lower region.                                                                                                                                                              |
| `insertPageNumber`              | `hash`                              | `pageNumber`            | Replace: identify numbering in a page context rather than a generic hash.                                                                                                                                                    |
| `insertPageNumberXOfY`          | `hash`                              | `pageCount`             | Replace: the old icon was identical to the single-number action; multiple pages now distinguish the count-aware operation. Its label still specifies X of Y.                                                                 |
| `placePageNumberTop`            | `panel-top`                         | `pageNumberTop`         | Replace: distinguish placing a number from editing the header.                                                                                                                                                               |
| `placePageNumberBottom`         | `panel-bottom`                      | `pageNumberBottom`      | Replace: distinguish placing a number from editing the footer.                                                                                                                                                               |
| `insertFootnote`                | Font-based `ab` and superscript `1` | Path-based `footnote`   | Refine: remove SVG text/system-font metric dependencies and use a theme-aware accent instead of fixed dark red.                                                                                                              |
| Underline toggle                | Font-rendered `U`                   | Vector `underlineGlyph` | Replace: text-font metrics made the U wider than the adjacent Bold/Italic letterforms. The 18 px vector keeps their stroke weight and vertical ink bounds while making the U modestly narrower; it is not reduced in height. |

The positions and silhouettes carry meaning independently of accent color. Decorative SVGs remain `aria-hidden`; their action controls retain translated names. These changes reuse existing commands and do not establish new document semantics or file compatibility.

The Home Ribbon comparison uses the actual Bold, Italic and Underline controls at 1440 px. Their 18 px SVG boxes share the 24×24 viewBox and 2-unit stroke. The path bounds are y=4..20 for all three; Underline's x=6..18 path is slightly narrower than Bold's x=6..19 and Italic's x=5..19. This keeps equal top/bottom clearance while avoiding the over-wide text glyph.

## Reproducible review sheet

With Vite running, open `/tests/browser/ribbon/icons.html`. The action, theme and surface selectors compare the previous and current artwork at actual CSS sizes of 16, 20 and 24 px, with normal, active and disabled states. Button, menu and collapsed-group samples are available. The historical footnote renderer exists only in this test host.

The structured decisions are in `scripts/ribbon-parity/icon-review.json`. Origins: Oasis vectors use the repository's MIT license; Lucide comparison glyphs use the installed package's ISC license.

Run:

```sh
npm run test:ribbon:icons
RIBBON_BROWSER=firefox npm run test:ribbon:icons
RIBBON_BROWSER=webkit npm run test:ribbon:icons
```

Each engine records 54 review scenes, with nine current samples per scene. The checks assert actual dimensions, nonempty path bounds within the viewBox, decorative accessibility attributes, named controls, no SVG text in the new glyphs, no unresolved placeholders and no stale SVG accumulation during name changes. Screenshots and measured colors accompany the results.

`ToolIcon` now owns its Lucide SVG nodes through Solid rather than allowing an observer to replace those nodes behind the renderer. Mixed-sibling lifecycle tests cover Lucide → Lucide → custom → unresolved → Lucide transitions. Unknown names retain a diagnostic placeholder and warning. The legacy observer remains for direct placeholder markup.

## Limits and remaining review

This is artwork/rendering evidence. It does not certify screen-reader behavior, every visual contrast/state combination, every command, or Office-equivalent workflows. The suite captures the chosen surfaces, while actual toolbar/menu placement is also exercised by synthetic reference captures.

Clipboard optical weights, font color/highlight/shading, margins/orientation, table operation grids, distribution/AutoFit, alignment/sort, themes/styles and advanced-tool families remain in the review queue. Keep readable existing artwork; refine or replace each remaining family only with an observed defect and a comparison at its final control size.
