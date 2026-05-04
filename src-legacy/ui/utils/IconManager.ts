import { createIcons, icons } from "lucide";

/**
 * Singleton that auto-scans the DOM for new Lucide icons using a MutationObserver.
 * Replaces the need to call createIcons() from every component.
 */
let observer: MutationObserver | null = null;

export function startIconObserver(root: HTMLElement = document.body): void {
  if (observer) return;

  // Initial scan
  createIcons({ icons, nameAttr: "data-lucide", root });

  // Watch for new elements with data-lucide attributes
  observer = new MutationObserver((mutations) => {
    let needsScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        needsScan = true;
        break;
      }
    }
    if (needsScan) {
      createIcons({ icons, nameAttr: "data-lucide", root });
    }
  });

  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-lucide"] });
}

export function stopIconObserver(): void {
  observer?.disconnect();
  observer = null;
}
