// Public surface for editor-state construction, re-aggregated from
// editorState/ so the ~36 call sites across the codebase don't need to
// change. Split from a single 689-line file into cohesive slices: node
// factories, the default named-style set, document factories, and
// EditorState factories.
export * from "./editorState/nodeFactories.js";
export * from "./editorState/defaultStyles.js";
export * from "./editorState/documentFactories.js";
export * from "./editorState/stateFactories.js";
