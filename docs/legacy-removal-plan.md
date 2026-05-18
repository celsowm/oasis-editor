# Legacy Removal Plan (Concluído)

Atualizado em: 2026-05-18

## Status

Plano de erradicação de legado concluído para runtime/editor:

1. Renderer canvas-only sem espelho DOM semântico.
2. Geometria/hit-test/seleção/caret em snapshot canvas.
3. Branches DOM mortos removidos.
4. Modelo canônico em `document.sections`.
6. Terminologia de hit-test limpa (`missReason`, sem `dom-fallback`/`fallbackReason`).

## Verificações de limpeza

Checks esperados no código (`src` + `tests`) estão verdes:

1. Sem `MinimalSemantic`, `domGeometry`, `positionAtPoint`.
2. Sem seletores semânticos legados (`data-paragraph-id`, `data-segment`, `data-char-index`, `editor-line`, `editor-run`, `editor-table-cell`, `editor-table-row`).
3. Sem `geometrySource`/`isCanvasGeometryMode`.
4. Sem `dom-fallback`/`fallbackReason`.
5. Sem compatibilidade retro de `document.blocks` no runtime.

## Observação operacional

A suíte `word-parity` foi consolidada para layout node/canvas e não depende mais de DOM walk semântico.
