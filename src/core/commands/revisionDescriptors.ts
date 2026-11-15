import type { EditorState } from "@/core/model.js";
import { getDocumentParagraphs } from "@/core/model.js";
import {
  collectSectionRevisions,
  collectTableRevisions,
} from "@/core/commands/cellRevisions.js";

/**
 * One descriptor per tracked revision id, covering every kind: run-level
 * insert/delete/formatting, table/row/cell/grid structural and property
 * revisions, and section-level `w:sectPrChange`. Previously the only complete
 * assembly of author/date/type/snippet lived inside the Reviewing Pane's
 * `createMemo`; this pure walker makes that metadata reusable by margin
 * balloons, hover cards and any future surface.
 */
export interface RevisionDescriptor {
  id: string;
  /** Show Markup category (grid/merge are reviewer-filtered only). */
  type: "insert" | "delete" | "property" | "merge" | "grid";
  author: string;
  date: number;
  snippet: string;
  /** Paragraph ids the revision touches (nested tables/sections included). */
  paragraphIds: string[];
  scope: "run" | "table" | "row" | "cell" | "section";
}

interface Accumulator {
  id: string;
  type: RevisionDescriptor["type"];
  author: string;
  date: number;
  scope: RevisionDescriptor["scope"];
  snippetParts: string[];
  paragraphIds: string[];
}

const truncate = (text: string): string =>
  text.length > 96 ? `${text.slice(0, 93)}…` : text;

interface Meta {
  id: string;
  type: RevisionDescriptor["type"];
  author: string;
  date: number;
  scope: RevisionDescriptor["scope"];
}

export function collectRevisionDescriptors(
  state: EditorState,
): RevisionDescriptor[] {
  const acc = new Map<string, Accumulator>();
  const add = (meta: Meta, paragraphIds: string[], snippet?: string): void => {
    const existing = acc.get(meta.id);
    if (existing) {
      existing.paragraphIds.push(...paragraphIds);
      if (snippet) existing.snippetParts.push(snippet);
      return;
    }
    acc.set(meta.id, {
      ...meta,
      paragraphIds: [...paragraphIds],
      snippetParts: snippet ? [snippet] : [],
    });
  };

  // Run-level revisions, in document order across every section and story.
  for (const paragraph of getDocumentParagraphs(state.document)) {
    for (const run of paragraph.runs) {
      const revision = run.revision;
      const property = run.styles?.propertyRevision;
      const meta: Meta | undefined =
        revision && (revision.type === "insert" || revision.type === "delete")
          ? {
              id: revision.id,
              type: revision.type,
              author: revision.author,
              date: revision.date,
              scope: "run",
            }
          : property
            ? {
                id: property.id,
                type: "property",
                author: property.author,
                date: property.date,
                scope: "run",
              }
            : undefined;
      if (meta) add(meta, [paragraph.id], run.text);
    }
  }

  // Structural/property revisions have no run to carry their id.
  for (const revision of collectTableRevisions(state)) {
    add(
      {
        id: revision.id,
        type: revision.type,
        author: revision.author,
        date: revision.date,
        scope: revision.scope,
      },
      revision.paragraphIds,
      revision.snippet,
    );
  }
  for (const revision of collectSectionRevisions(state)) {
    add(
      {
        id: revision.id,
        type: revision.type,
        author: revision.author,
        date: revision.date,
        scope: "section",
      },
      revision.paragraphIds,
      revision.snippet,
    );
  }

  return [...acc.values()].map((entry): RevisionDescriptor => ({
    id: entry.id,
    type: entry.type,
    author: entry.author,
    date: entry.date,
    scope: entry.scope,
    snippet: truncate(entry.snippetParts.join("").trim()),
    paragraphIds: [...new Set(entry.paragraphIds)],
  }));
}
