import { createIcons, icons } from "lucide";

let observer: MutationObserver | null = null;

export function startIconObserver(root: HTMLElement = document.body): void {
  if (observer) return;

  createIcons({ icons, nameAttr: "data-lucide", root });

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
