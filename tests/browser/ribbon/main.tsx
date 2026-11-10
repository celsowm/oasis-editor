import { render } from "solid-js/web";
import { OasisEditorApp } from "@/ui/OasisEditorApp.js";
import type { OasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { setWelcomeSeen } from "@/app/services/userPreferences.js";
import {
  canonicalReferenceDocument,
  referenceFonts,
  sha256,
} from "./fixtureMetadata.js";
import { prepareRibbonFixture, ribbonFixtures } from "./fixtures.js";
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
      fingerprintFonts: () => Promise<{ fonts: object; fontSha256: string }>;
      metadata: {
        documentSha256: string;
        definitionSha256: string;
        fonts: object;
        fontSha256: string;
      };
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
          try {
            await prepareRibbonFixture(client, fixture);
            await document.fonts.ready;
            const fonts = referenceFonts();
            const metadata = {
              documentSha256: await sha256(
                canonicalReferenceDocument(client.document.get()),
              ),
              definitionSha256: await sha256(
                JSON.stringify({
                  version: 1,
                  fixture,
                  html: ribbonFixtures[fixture],
                }),
              ),
              fonts,
              fontSha256: await sha256(JSON.stringify(fonts)),
            };
            window.ribbonReference = {
              client,
              theme,
              locale,
              fixture,
              metadata,
              fingerprintFonts: async () => {
                await document.fonts.ready;
                const fonts = referenceFonts();
                return {
                  fonts,
                  fontSha256: await sha256(JSON.stringify(fonts)),
                };
              },
            };
            document.documentElement.dataset.referenceReady = "true";
          } catch (error) {
            document.documentElement.dataset.referenceError =
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : String(error);
            throw error;
          }
        },
      }}
    />
  ),
  root,
);
