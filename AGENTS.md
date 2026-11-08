# AGENTS.md

Guidance for AI coding agents working in this repository. This is a living
document: add conventions you discover as you go.

## Type-only imports for command payloads

The repo has a consistent rule for referencing a command-payload type (or any
other exported type) from a `.ts` module:

- **Type-only positions** (interface fields, annotations, `publicCommandTypes`,
  capabilities): use a top-level `import type { ... } from "<module>"` at the
  top of the file, NOT the inline `import("<module>").Type` form.

  ```ts
  // good
  import type { TableBorderPreset, TableRowHeight } from "@/core/commands/table.js";

  interface Cap {
    preset: TableBorderPreset;
    height: TableRowHeight;
  }
  ```

- **Value casts inside command-group handlers** (where adding a full import just
  for a cast would be noise): the inline `import("<module>").Type` form is the
  established idiom.

  ```ts
  // good — existing pattern in essentialsCommandGroups/table.ts
  p as import("@/core/commands/table.js").TableBorderPreset
  p as import("@/core/commands/table.js").TableCellMargins
  ```

Rule of thumb: if the type is written where a *declaration* lives, use top-level
`import type`. If it appears only as an *inline cast of a value*, the inline
form matches the codebase.

## Slice/shipping conventions

- SOLID code; separate the core command + tests from the wiring/parity in
  distinct commits (core first, then wiring).
- Gates before push: `npm run typecheck`, `npm run lint` (clean in changed
  files), non-UI vitest, `npm run audit:ribbon`, then `git pull --rebase`, then
  push.
- `.tsx`/Solid UI tests can't run in this harness (pre-existing
  `@solid-refresh` failures); CI is the authority.
- Long locale line keys must be prettier-wrapped (`eslint --fix` on locale
  files).
