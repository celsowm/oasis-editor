// Facade for the text-editing commands. The implementation is split by concern
// into cohesive modules; this file re-exports them so existing consumers keep
// importing from `@/core/commands/text.js` (S2 hotspot decomposition).

export {
  moveOrCopySelectionToPosition,
  insertTextAtSelection,
  insertPlainTextAtSelection,
} from "./textEditing.js";

export { deleteBackward, deleteForward } from "./textDeletion.js";

export {
  toggleTextStyle,
  clearSelectedTextFormatting,
  setTextStyleValue,
} from "./textFormatting.js";

export {
  type TextCaseMode,
  transformSelectedText,
  changeSelectedTextCase,
} from "./textCase.js";
