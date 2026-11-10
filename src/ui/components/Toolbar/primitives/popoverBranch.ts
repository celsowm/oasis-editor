import { createContext } from "solid-js";

/** Logical ownership is preserved even when panels are portalled to body. */
export interface PopoverBranch {
  open: () => boolean;
  contains: (target: Node) => boolean;
  children: Set<PopoverBranch>;
  /** A chosen action ends this menu path; opening a child does not. */
  closeAll: () => void;
}
export const PopoverBranchContext = createContext<PopoverBranch>();
