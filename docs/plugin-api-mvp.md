# Plugin API MVP Guide

API estavel (MVP):

- `Editor` runtime com `plugins`.
- `editor.commands.register/unregister/get/has`.
- `editor.execute(name, payload?)` e `editor.canExecute(name)`.
- `OasisPlugin.requires` com resolucao de dependencias.
- `toolbar` e `menubar` declarativos no plugin (modo compativel).

Limites atuais:

- `init`/`afterInit` de plugin sao sincronos neste runtime.
- `model.change`, schema extensivel e conversores plugaveis ainda fora do MVP.
- toolbar dinamica via registry ainda e incremental; fluxo atual da UI continua valendo.
- o `TitleBar` nao expoe mais acoes mockadas (share/usuario/star/folder/titulo do documento/icone de documento).

Exemplo:

- Veja `docs/examples/timestamp-plugin.ts`.
