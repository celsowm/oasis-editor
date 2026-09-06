import type { EssentialsBrowserCapability } from "@/plugins/internal/essentialsCapabilities.js";

export function buildEssentialsBrowser(): EssentialsBrowserCapability {
  return {
    copy: (): void => {
      document.execCommand("copy");
    },
  };
}
