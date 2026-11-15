# Layout ribbon alignment

Safari user report, 2026-11-15: paragraph input boundaries drift across rows; the group caption is offset; page setup controls lack a common visual width.

Implemented: intrinsic shared label/value/unit subgrid tracks (existing cm/pt commands and locale decimals unchanged), consistent input height and numeric alignment, centered captions, equally sized page setup dropdowns with shared icon/label/chevron bands. The simplified ribbon hides the two-row fields and retains the paragraph menu. No document schema, margin semantics, orientation or paragraph commands changed.

Added focused browser geometry assertions for English/Portuguese, both themes, five host-width transitions and all three engines through the existing Review regression workflow. CI and Safari confirmation pending.
