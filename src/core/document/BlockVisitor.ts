import { BlockNode } from "./BlockTypes.js";

export type BlockTransform = (block: BlockNode) => BlockNode | BlockNode[] | null;

/**
 * Recursively transforms a list of blocks.
 */
export function transformBlocks(blocks: BlockNode[], transformer: BlockTransform): BlockNode[] {
    const next: BlockNode[] = [];
    for (const block of blocks) {
        // Apply transformer to the current block
        const transformed = transformer(block);
        if (transformed === null) continue;

        const items = Array.isArray(transformed) ? transformed : [transformed];
        for (const item of items) {
            // Recursively transform children/nested structures
            next.push(transformContainerDeep(item, transformer) as BlockNode);
        }
    }
    return next;
}

/**
 * Deeply transforms any object that might contain blocks.
 */
function transformContainerDeep(container: any, transformer: BlockTransform): any {
    if (!container || typeof container !== "object") return container;

    const result = { ...container };
    let hasChanges = false;

    for (const key in result) {
        const value = result[key];
        if (Array.isArray(value)) {
            if (isBlockArray(value)) {
                result[key] = transformBlocks(value, transformer);
                hasChanges = true;
            } else if (value.length > 0 && typeof value[0] === "object") {
                // Possibly an array of rows or other nested structures
                result[key] = value.map(item => transformContainerDeep(item, transformer));
                hasChanges = true;
            }
        } else if (value && typeof value === "object" && value.kind !== undefined) {
            // Single nested object that might be a container
            result[key] = transformContainerDeep(value, transformer);
            hasChanges = true;
        }
    }

    return hasChanges ? result : container;
}

function isBlockArray(arr: any[]): arr is BlockNode[] {
    return arr.length > 0 && arr[0] && typeof arr[0] === "object" && "kind" in arr[0] && "id" in arr[0];
}
