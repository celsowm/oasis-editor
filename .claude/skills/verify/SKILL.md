---
name: verify
description: Build, launch and drive the oasis-editor app in a real browser to observe a change working end-to-end.
---

# Verifying oasis-editor

The surface is **pixels on a canvas**. The editor paints text, images, shapes
and tables into a `<canvas>`, so DOM assertions prove almost nothing — drive it
with Playwright and screenshot the canvas.

## Launch

Playwright 1.59 and Chromium are already installed. Reuse the perf harness's
dev-server recipe (`playwright.config.ts`):

```bash
node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4199 --strictPort
```

Wait for the port with a `curl` poll — **not** `waitUntil: "networkidle"`, which
never settles because Vite keeps an HMR websocket open. Use `waitUntil: "load"`
then `page.waitForSelector("canvas")` plus a ~2s settle for font loading.

Driver scripts must live **inside the repo** (e.g. `./.verify-drive.mjs`, then
delete it) so `import { chromium } from "@playwright/test"` resolves. A script
in the scratchpad cannot see `node_modules`.

## Gotchas

- **A first-run overlay blocks everything.** Dismiss it before any interaction:
  `page.getByRole("button", { name: /Agora não/i }).click()`.
- **Default UI language is pt-BR.** Match on Portuguese labels.
- Toolbar items only expose `data-testid` when the item declares `testId`.
  `editor-toolbar-file-dropdown` does not — reach it via
  `getByRole("button", { name: /Arquivo/i })`.
- Colour-swatch test ids use the palette's **lowercase** hex:
  `editor-toolbar-image-border-standard-swatch-c00000`.

## Useful handles

| What | How |
|---|---|
| Insert an image | `page.setInputFiles('[data-testid="editor-insert-image-input"]', 'public/branding/icon-192.png')` — the same hidden input the toolbar clicks |
| Import a DOCX | `[data-testid="editor-import-docx-input"]` |
| Select an object | `page.mouse.click()` on its canvas coordinates; contextual ribbon tabs then appear |
| Contextual tabs | `getByRole("tab", { name: /Formato da Imagem/i })`, `/Design da Tabela/i`, … |
| Export PDF | Arquivo tab → Arquivo dropdown → `[data-testid="editor-toolbar-export-pdf"]`; capture with `page.waitForEvent("download")` |

## Inspecting an exported PDF

Content streams are FlateDecode-compressed. Inflate each `/FlateDecode` stream
with `unzlibSync` from `fflate` and splice it back in place, then grep for
operators. This is the strongest evidence available for render changes — it
shows exactly what the app emitted. Example, for a dashed 3pt picture border:

```
0.753 0 0 RG
3 w
[3.75 2.25] 0 d
72 576 108 144 re
S
```

`tests/vitest/__tests__/export/pdfWriter.test.ts` has a `decodePdf` helper worth
copying.

## Ribbon CSS trap

Ribbon large-item rules are qualified as
`.oasis-editor-toolbar-view-ribbon .oasis-editor-toolbar-item-ribbon-large .oasis-editor-tool-button`
(specificity 0,3,0) and force `flex-direction: column; width: 64px`. A new
button class alone will silently lose to them. Always screenshot a new toolbar
control — a typecheck-clean, test-green control can still render wrong.
