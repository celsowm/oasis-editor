import { render } from "solid-js/web";
import { OasisEditorApp } from "@/ui/OasisEditorApp.js";
import type { OasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { setWelcomeSeen } from "@/app/services/userPreferences.js";
import { ribbonFixtures } from "./fixtures.js";
import type { RibbonFixture } from "./fixtures.js";
import "@/styles/oasis-editor.css";

const params = new URLSearchParams(location.search);
const theme = params.get("theme") === "dark" ? "dark" : "light";
const locale = params.get("locale") === "pt-BR" ? "pt-BR" : "en";
const requestedFixture = params.get("fixture") ?? "text";
if (!(requestedFixture in ribbonFixtures))
  throw new Error("Unknown reference fixture");
const fixture = requestedFixture as RibbonFixture;
const root = document.getElementById("ribbon-reference-root")!;
document.documentElement.lang = locale;
setWelcomeSeen();

declare global {
  interface Window {
    ribbonReference?: {
      client: OasisEditorClient;
      theme: "light" | "dark";
      locale: "pt-BR" | "en";
      fixture: RibbonFixture;
    };
  }
}

render(
  () => (
    <OasisEditorApp
      ui={{
        theme,
        locale,
        showTitleBar: false,
        showMenubar: false,
        showOutline: false,
        viewportHeight: "100vh",
      }}
      document={{ persistenceEnabled: false, remoteWebFonts: false }}
      runtime={{
        onReady: async (client) => {
          await client.import.html(ribbonFixtures[fixture]);
          window.ribbonReference = { client, theme, locale, fixture };
          document.documentElement.dataset.referenceReady = "true";
        },
      }}
    />
  ),
  root,
);
