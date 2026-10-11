# Fluxo para agentes de conteúdo

Objetivo: adicionar um general, projeto, iniciativa ou update com dados, sem criar páginas React ou alterar o motor de cenas. Execute os comandos a partir de `portfolio/`, com Node 24+.

## Contexto mínimo

1. Leia este arquivo e [PERSONALIZATION.md](PERSONALIZATION.md).
2. Leia `public/projects/index.json` para conhecer IDs ocupados e categorias existentes.
3. Leia [CONTENT_HELPER.md](CONTENT_HELPER.md) para a operação necessária. Para comandos/caminhos extras, leia [TERMINAL.md](TERMINAL.md); para cards pessoais, [PROFILE.md](PROFILE.md).
4. Para currículo/PDF, leia [RESUME.md](RESUME.md). O build regenera os dois documentos após mudanças nos dados.
5. Para conteúdo sobre Samuel, consulte [author/CONTEXT.md](author/CONTEXT.md) e [author/SOURCES.md](author/SOURCES.md). Eles preservam o contexto fornecido, as fontes e os limites das afirmações. Formação/cargos/benchmarks não devem ser ampliados por inferência.

Não é necessário ler todo o runtime. Use as categorias existentes: `champions` (generais), `initiatives` (causas), `experiments` e `other-projects` (projetos neutros).

## Entrada esperada

Obtenha do autor: nome público, categoria, descrição, estado atual, imagem local opcional e qualquer seção/link/resultado real. Use `id` estável em minúsculas com hífens. Traduza o conteúdo para PT/EN sem acrescentar fatos. Se faltar uma informação, mantenha a indicação de preparação gerada pelo helper. Não transforme lacunas em resultados, depoimentos, campanhas ou URLs inventadas.

## Adicionar um território automaticamente

Monte uma especificação fora de `public/projects/`, por exemplo `/tmp/novo-territorio.json`. O mínimo é:

```json
{
  "id": "novo-general",
  "name": "Nome fornecido pelo autor",
  "category": "champions",
  "presentation": { "icon": "swords", "secondaryAccent": "#db8268" }
}
```

Troque os valores de exemplo antes de executar. Acrescente os campos que o autor forneceu: `subtitle`, `status`, `image`, `sections`, `visual`, `hall`, `entrance`, `featured`. Textos descritivos usam `{ "pt": "...", "en": "..." }`; nomes próprios podem ser strings. `image` é um caminho local: o helper copia o arquivo e configura os caminhos do preview, fundo e hero.

```sh
npm run content -- project --file /tmp/novo-territorio.json
npm run content -- check
```

O helper cria `public/projects/<id>/project.json`, copia a arte opcional e registra o preview no catálogo. O item aparece na sua região, no terminal como `tp <id>` e no carrossel se `featured` for verdadeiro. **Não** acrescente um case em `SceneManager`, um botão específico em React ou um alias obrigatório em `commands.json`. Nome público e ID já são destinos reconhecidos.

Para impedir o destaque inicial, use `"featured": false`. Para uma causa, troque a categoria para `initiatives`; ela herda o tom acolhedor e o emblema `heart-handshake`. O estilo da categoria é suficiente quando não há personalização específica.

Não execute dois helpers simultaneamente: eles usam um lock e não sobrescrevem IDs/diretórios existentes. Se receber erro, corrija a entrada; não apague um projeto existente para liberar o ID.

## Atualizar um item existente

Edite apenas seus dados: apresentação/preview em `index.json`, conteúdo/fundo em `<id>/project.json`. Preserve o ID e o comando, pois são os caminhos estáveis. Para comunicar uma mudança real, use `npm run content -- update --file /tmp/update.json`, com a data real e `project` igual ao ID registrado. O comunicado aparece automaticamente na Home, no mural e na página do projeto. Consulte os exemplos completos em [CONTENT_HELPER.md](CONTENT_HELPER.md).

## Adicionar uma região ou um atalho

Uma região precisa ser registrada em `categories` com ID único, textos PT/EN, `visual` e `command: "tp <id>"`. Depois, os projetos podem apontar para ela. Se desejado, inclua um caminho em `home.paths` com `category`, `tone`, `icon` e o mesmo comando. Não crie uma cena nova para uma categoria comum.

Um atalho é opcional e aponta para um destino existente em `commands.json`. O comando canônico é `tp`; aliases em português e inglês compartilham o mesmo intérprete. Não duplique lógica de navegação em um card.

## Validação e entrega

```sh
npm run content -- check
npm test
npm run lint
npm run build
```

Recarregue o preview para renovar o cache do catálogo. Confira o caminho de entrada, o card, a página, o terminal e as traduções em tela larga e mobile. Confira também foco de teclado e movimento reduzido quando mudar aparência. Novos SVGs devem estar em `src/assets/icons/` com os respectivos avisos de licença.

Entregue os arquivos alterados, o comando `tp <id>`, os checks realizados e qualquer informação ainda pendente. O helper prepara conteúdo local; publicação segue o fluxo de deploy do autor.

## Prompt reutilizável

> Leia docs_autoupdate/AGENT_WORKFLOW.md e docs_autoupdate/PERSONALIZATION.md. Registre o conteúdo fornecido pelo helper, preservando itens existentes. Use JSON, PT/EN, assets locais e a apresentação compartilhada; não crie uma página React por item. Não invente fatos, links ou depoimentos. Verifique conteúdo, testes, lint, build e preview responsivo. Informe o destino tp, os arquivos alterados e as informações pendentes.
