/**
 * Find-and-replace service.
 *
 * The search engine and the document mutation live in the core
 * `findReplace` command module; this file is a thin re-export so existing
 * consumers keep their import path.
 */
export {
  findMatchesInDocument,
  replaceAllInDocument,
  type FindOptions,
  type FindReplaceMatch,
} from "@/core/commands/findReplace.js";
