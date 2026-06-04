import { For, Match, Show, Switch, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { OasisEditorApp } from "../ui/OasisEditorApp.js";

type RouteId = "editor" | "about" | "api" | "plugins";
type Language = "pt" | "en";

const routes: Array<{ id: RouteId; icon: string }> = [
  { id: "editor", icon: "ED" },
  { id: "about", icon: "OA" },
  { id: "api", icon: "API" },
  { id: "plugins", icon: "PL" },
];

const routeLabels: Record<Language, Record<RouteId, string>> = {
  pt: {
    editor: "Editor",
    about: "Sobre",
    api: "API amigavel",
    plugins: "Criar plugin",
  },
  en: {
    editor: "Editor",
    about: "About",
    api: "Friendly API",
    plugins: "Create plugin",
  },
};

const copy = {
  pt: {
    product: "Oasis Editor",
    eyebrow: "Editor documental extensivel",
    headline: "Editor, docs e extensibilidade no mesmo lugar.",
    description:
      "A demo abre direto no editor, mas agora tambem apresenta o que torna o Oasis Editor diferente, como integrar a API e como criar plugins.",
    collapse: "Recolher menu",
    expand: "Abrir menu",
    close: "Fechar menu",
    openNav: "Menu",
    language: "Idioma",
    editor: {
      title: "Editor",
      subtitle:
        "A rota padrao preserva a experiencia atual: editor documental com shell docs, toolbar, menus e import/export.",
      tip: "Dica: use ?shell=inline ou ?shell=balloon para testar outros shells.",
    },
    about: {
      title: "Por que Oasis Editor",
      subtitle:
        "O foco e documento real, API composable e extensibilidade sem forkar a interface.",
      cards: [
        {
          title: "Document-centric",
          text: "Modelo pensado para paginas, secoes, tabelas, imagens, notas e layout de documento, nao apenas HTML rico.",
        },
        {
          title: "Shells de UI",
          text: "Use document, inline ou balloon shell conforme o produto precisa, mantendo o mesmo runtime.",
        },
        {
          title: "DOCX e PDF",
          text: "Importacao DOCX e exportacao DOCX/PDF fazem parte da proposta central do editor.",
        },
        {
          title: "Toolbar customizavel",
          text: "A toolbar e baseada em registry, permitindo adicionar, mover, substituir ou remover controles.",
        },
        {
          title: "Plugins por comandos",
          text: "Plugins contribuem comandos, toolbar, menubar e keymaps atraves de uma API declarativa.",
        },
        {
          title: "Paridade de layout",
          text: "O projeto prioriza comportamento de documento e fidelidade visual em vez de uma superficie generica.",
        },
      ],
    },
    api: {
      title: "API amigavel",
      subtitle:
        "Use o editor como app pronto, container sem chrome ou runtime customizado com plugins.",
      sections: [
        {
          title: "Montagem imperativa",
          text: "Ideal para integrar em qualquer pagina sem depender de framework.",
          code: `import { createOasisEditor } from "oasis-editor";
import "oasis-editor/style.css";

const instance = createOasisEditor(document.getElementById("editor")!, {
  ui: { shell: "document", uiVariant: "docs" },
  document: { persistenceEnabled: true },
});

instance.dispose();`,
        },
        {
          title: "Props principais",
          text: "A configuracao e dividida entre UI, documento e runtime.",
          code: `type OasisEditorAppProps = {
  ui?: {
    shell?: "document" | "inline" | "balloon";
    uiVariant?: "classic" | "docs";
    locale?: "pt-BR" | "en";
  };
  document?: {
    readOnly?: boolean;
    initialDocument?: EditorDocument;
    onStateChange?: (state: EditorState) => void;
  };
  runtime?: {
    plugins?: OasisPlugin[];
    customizeToolbar?: (registry: ToolbarRegistry) => void;
  };
};`,
        },
        {
          title: "Container sem chrome",
          text: "Quando o produto ja tem toolbar ou chrome proprio, use o container.",
          code: `import { OasisEditorContainer } from "oasis-editor";

<OasisEditorContainer
  ui={{ viewportHeight: "72vh" }}
  runtime={{ plugins: [TimestampPlugin] }}
/>;`,
        },
      ],
    },
    plugins: {
      title: "Como criar um plugin",
      subtitle:
        "Um plugin registra comandos e declara onde eles aparecem. O runtime cuida da integracao.",
      steps: [
        "Defina um objeto OasisPlugin com name unico.",
        "Registre comandos em commands e retorne CommandState em refresh.",
        "Conecte comandos a toolbar, menubar ou keymaps.",
        "Passe o plugin em runtime.plugins ao montar o editor.",
      ],
      code: `import type { OasisPlugin } from "oasis-editor";

export const TimestampPlugin: OasisPlugin = {
  name: "Timestamp",
  commands: {
    insertTimestamp: {
      execute: () => new Date().toISOString(),
      refresh: () => ({ isEnabled: true }),
    },
  },
  toolbar: [
    {
      id: "insertTimestamp",
      command: "insertTimestamp",
      group: "insert",
      icon: "clock-3",
    },
  ],
  menubar: [
    {
      id: "insert_timestamp",
      path: "Insert/Timestamp",
      command: "insertTimestamp",
      shortcut: "Ctrl+Alt+T",
    },
  ],
  keymaps: [{ key: "Ctrl+Alt+T", command: "insertTimestamp" }],
};`,
      hooks:
        "Use init, afterInit, install e destroy quando o plugin precisar preparar estado, ouvir eventos ou limpar recursos.",
      usage: `createOasisEditor(root, {
  runtime: {
    plugins: [TimestampPlugin],
  },
});`,
    },
  },
  en: {
    product: "Oasis Editor",
    eyebrow: "Extensible document editor",
    headline: "Editor, docs, and extensibility in one place.",
    description:
      "The demo still opens in the editor, but now also explains what makes Oasis Editor different, how to use the API, and how to create plugins.",
    collapse: "Collapse menu",
    expand: "Open menu",
    close: "Close menu",
    openNav: "Menu",
    language: "Language",
    editor: {
      title: "Editor",
      subtitle:
        "The default route preserves the current experience: document editor with docs shell, toolbar, menus, and import/export.",
      tip: "Tip: use ?shell=inline or ?shell=balloon to test other shells.",
    },
    about: {
      title: "Why Oasis Editor",
      subtitle:
        "The focus is real documents, composable APIs, and extensibility without forking the interface.",
      cards: [
        {
          title: "Document-centric",
          text: "A model designed for pages, sections, tables, images, footnotes, and document layout, not only rich HTML.",
        },
        {
          title: "UI shells",
          text: "Use document, inline, or balloon shell depending on product needs while keeping the same runtime.",
        },
        {
          title: "DOCX and PDF",
          text: "DOCX import and DOCX/PDF export are part of the editor's core direction.",
        },
        {
          title: "Custom toolbar",
          text: "The toolbar is registry-driven, so products can add, move, replace, or remove controls.",
        },
        {
          title: "Command plugins",
          text: "Plugins contribute commands, toolbar items, menubar items, and keymaps through a declarative API.",
        },
        {
          title: "Layout parity",
          text: "The project prioritizes document behavior and visual fidelity over a generic editing surface.",
        },
      ],
    },
    api: {
      title: "Friendly API",
      subtitle:
        "Use the editor as a ready-made app, a chromeless container, or a customized runtime with plugins.",
      sections: [
        {
          title: "Imperative mount",
          text: "Useful when integrating into any page without coupling to a framework.",
          code: `import { createOasisEditor } from "oasis-editor";
import "oasis-editor/style.css";

const instance = createOasisEditor(document.getElementById("editor")!, {
  ui: { shell: "document", uiVariant: "docs" },
  document: { persistenceEnabled: true },
});

instance.dispose();`,
        },
        {
          title: "Main props",
          text: "Configuration is split between UI, document, and runtime.",
          code: `type OasisEditorAppProps = {
  ui?: {
    shell?: "document" | "inline" | "balloon";
    uiVariant?: "classic" | "docs";
    locale?: "pt-BR" | "en";
  };
  document?: {
    readOnly?: boolean;
    initialDocument?: EditorDocument;
    onStateChange?: (state: EditorState) => void;
  };
  runtime?: {
    plugins?: OasisPlugin[];
    customizeToolbar?: (registry: ToolbarRegistry) => void;
  };
};`,
        },
        {
          title: "Chromeless container",
          text: "When your product already owns the toolbar or chrome, use the container.",
          code: `import { OasisEditorContainer } from "oasis-editor";

<OasisEditorContainer
  ui={{ viewportHeight: "72vh" }}
  runtime={{ plugins: [TimestampPlugin] }}
/>;`,
        },
      ],
    },
    plugins: {
      title: "How to create a plugin",
      subtitle:
        "A plugin registers commands and declares where they appear. The runtime handles integration.",
      steps: [
        "Define an OasisPlugin object with a unique name.",
        "Register commands in commands and return CommandState in refresh.",
        "Connect commands to toolbar, menubar, or keymaps.",
        "Pass the plugin through runtime.plugins when mounting the editor.",
      ],
      code: `import type { OasisPlugin } from "oasis-editor";

export const TimestampPlugin: OasisPlugin = {
  name: "Timestamp",
  commands: {
    insertTimestamp: {
      execute: () => new Date().toISOString(),
      refresh: () => ({ isEnabled: true }),
    },
  },
  toolbar: [
    {
      id: "insertTimestamp",
      command: "insertTimestamp",
      group: "insert",
      icon: "clock-3",
    },
  ],
  menubar: [
    {
      id: "insert_timestamp",
      path: "Insert/Timestamp",
      command: "insertTimestamp",
      shortcut: "Ctrl+Alt+T",
    },
  ],
  keymaps: [{ key: "Ctrl+Alt+T", command: "insertTimestamp" }],
};`,
      hooks:
        "Use init, afterInit, install, and destroy when the plugin needs to prepare state, listen to events, or clean up resources.",
      usage: `createOasisEditor(root, {
  runtime: {
    plugins: [TimestampPlugin],
  },
});`,
    },
  },
};

function getHashRoute(): RouteId {
  const route = window.location.hash.replace(/^#\/?/, "");
  return routes.some((item) => item.id === route) ? (route as RouteId) : "editor";
}

function getRequestedShell() {
  const params = new URLSearchParams(window.location.search);
  const requestedShell = params.get("shell");
  return requestedShell === "inline" || requestedShell === "balloon" ? requestedShell : "document";
}

function loadLanguage(): Language {
  const stored = window.localStorage.getItem("oasis-site-language");
  return stored === "en" ? "en" : "pt";
}

export function OasisSiteApp() {
  const [activeRoute, setActiveRoute] = createSignal<RouteId>(getHashRoute());
  const [language, setLanguage] = createSignal<Language>(loadLanguage());
  const [collapsed, setCollapsed] = createSignal(false);
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const text = createMemo(() => copy[language()]);

  const syncRoute = () => {
    const nextRoute = getHashRoute();
    setActiveRoute(nextRoute);
    setMobileOpen(false);
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/editor");
    }
  };

  const setLanguagePreference = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem("oasis-site-language", nextLanguage);
  };

  onMount(() => {
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
  });

  onCleanup(() => {
    window.removeEventListener("hashchange", syncRoute);
  });

  return (
    <div
      classList={{
        "oasis-site": true,
        "oasis-site-sidebar-collapsed": collapsed(),
        "oasis-site-mobile-open": mobileOpen(),
      }}
    >
      <Show when={mobileOpen()}>
        <button
          class="oasis-site-scrim"
          type="button"
          aria-label={text().close}
          onClick={() => setMobileOpen(false)}
        />
      </Show>

      <aside class="oasis-site-sidebar" aria-label="Oasis Editor">
        <div class="oasis-site-brand">
          <div class="oasis-site-brand-mark">OE</div>
          <Show when={!collapsed()}>
            <div>
              <div class="oasis-site-brand-title">{text().product}</div>
              <div class="oasis-site-brand-subtitle">{text().eyebrow}</div>
            </div>
          </Show>
        </div>

        <nav class="oasis-site-nav">
          <For each={routes}>
            {(route) => (
              <a
                classList={{
                  "oasis-site-nav-item": true,
                  "oasis-site-nav-item-active": activeRoute() === route.id,
                }}
                href={`#/${route.id}`}
                title={routeLabels[language()][route.id]}
              >
                <span class="oasis-site-nav-icon">{route.icon}</span>
                <Show when={!collapsed()}>
                  <span>{routeLabels[language()][route.id]}</span>
                </Show>
              </a>
            )}
          </For>
        </nav>

        <div class="oasis-site-sidebar-footer">
          <Show when={!collapsed()}>
            <div class="oasis-site-language-label">{text().language}</div>
          </Show>
          <div class="oasis-site-language-switch" role="group" aria-label={text().language}>
            <button
              type="button"
              classList={{ "is-active": language() === "pt" }}
              onClick={() => setLanguagePreference("pt")}
            >
              PT
            </button>
            <button
              type="button"
              classList={{ "is-active": language() === "en" }}
              onClick={() => setLanguagePreference("en")}
            >
              EN
            </button>
          </div>
          <button
            class="oasis-site-collapse"
            type="button"
            aria-label={collapsed() ? text().expand : text().collapse}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed() ? ">" : "<"}
          </button>
        </div>
      </aside>

      <main class="oasis-site-main">
        <header class="oasis-site-topbar">
          <button
            class="oasis-site-mobile-menu"
            type="button"
            onClick={() => setMobileOpen(true)}
          >
            {text().openNav}
          </button>
          <div>
            <p>{text().eyebrow}</p>
            <h1>{text().headline}</h1>
            <span>{text().description}</span>
          </div>
        </header>

        <Switch>
          <Match when={activeRoute() === "editor"}>
            <EditorPage language={language()} />
          </Match>
          <Match when={activeRoute() === "about"}>
            <AboutPage language={language()} />
          </Match>
          <Match when={activeRoute() === "api"}>
            <ApiPage language={language()} />
          </Match>
          <Match when={activeRoute() === "plugins"}>
            <PluginsPage language={language()} />
          </Match>
        </Switch>
      </main>
    </div>
  );
}

function PageIntro(props: { title: string; subtitle: string }) {
  return (
    <section class="oasis-site-page-intro">
      <h2>{props.title}</h2>
      <p>{props.subtitle}</p>
    </section>
  );
}

function EditorPage(props: { language: Language }) {
  const editorCopy = () => copy[props.language].editor;

  return (
    <section class="oasis-site-editor-page">
      <PageIntro title={editorCopy().title} subtitle={editorCopy().subtitle} />
      <div class="oasis-site-editor-tip">{editorCopy().tip}</div>
      <div class="oasis-site-editor-frame">
        <OasisEditorApp
          ui={{
            shell: getRequestedShell(),
            uiVariant: "docs",
            locale: props.language === "pt" ? "pt-BR" : "en",
          }}
        />
      </div>
    </section>
  );
}

function AboutPage(props: { language: Language }) {
  const about = () => copy[props.language].about;

  return (
    <section class="oasis-site-page">
      <PageIntro title={about().title} subtitle={about().subtitle} />
      <div class="oasis-site-card-grid">
        <For each={about().cards}>
          {(card) => (
            <article class="oasis-site-card">
              <span />
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          )}
        </For>
      </div>
    </section>
  );
}

function ApiPage(props: { language: Language }) {
  const api = () => copy[props.language].api;

  return (
    <section class="oasis-site-page">
      <PageIntro title={api().title} subtitle={api().subtitle} />
      <div class="oasis-site-doc-stack">
        <For each={api().sections}>
          {(section) => (
            <article class="oasis-site-doc-panel">
              <div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </div>
              <pre>
                <code>{section.code}</code>
              </pre>
            </article>
          )}
        </For>
      </div>
    </section>
  );
}

function PluginsPage(props: { language: Language }) {
  const plugins = () => copy[props.language].plugins;

  return (
    <section class="oasis-site-page">
      <PageIntro title={plugins().title} subtitle={plugins().subtitle} />
      <div class="oasis-site-plugin-layout">
        <article class="oasis-site-steps">
          <For each={plugins().steps}>
            {(step, index) => (
              <div class="oasis-site-step">
                <strong>{index() + 1}</strong>
                <span>{step}</span>
              </div>
            )}
          </For>
          <p>{plugins().hooks}</p>
          <pre>
            <code>{plugins().usage}</code>
          </pre>
        </article>
        <pre class="oasis-site-plugin-code">
          <code>{plugins().code}</code>
        </pre>
      </div>
    </section>
  );
}
