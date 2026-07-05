import type { EssentialsBrowserCapability } from "@/plugins/internal/essentialsCapabilities.js";

export function buildEssentialsBrowser(): EssentialsBrowserCapability {
  return {
    print: (): void => window.print(),
    copy: (): void => {
      document.execCommand("copy");
    },
  };
}
