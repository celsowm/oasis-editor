interface Window {
  /**
   * Debug flag for oasis-editor. When true, enables verbose logging via Logger.log/debug/trace.
   * Should be false/undefined in production builds.
   */
  OASIS_DEBUG?: boolean;
}

// Custom event map for editor-specific events
interface CustomEventMap {
  "image-resize-request": CustomEvent;
  "oasis-textinput": CustomEvent;
  "image-select": CustomEvent<{ blockId: string }>;
}
