import { createContext } from "solid-js";

/** Logical ownership is preserved even when panels are portalled to body. */
export interface PopoverBranch {
  open: () => boolean;
  contains: (target: Node) => boolean;
  children: Set<PopoverBranch>;
}
export const PopoverBranchContext = createContext<PopoverBranch>();
