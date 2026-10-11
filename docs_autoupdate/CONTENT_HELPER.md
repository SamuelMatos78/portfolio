# Conteúdo novo sem páginas novas

O terminal do visitante navega pelo mundo. O helper local registra seus territórios e comunicados: gera os JSONs, copia a imagem opcional, valida o conteúdo e atualiza o catálogo. Um segundo assistente pode usar os mesmos comandos. Não precisa editar React.

Execute a partir de `portfolio/`, com Node 24+.

## Novo general

```sh
npm run content -- project --id meu-general --name "Meu General" --category champions --image "/caminho/local/retrato.png"
```

Sem imagem, omita `--image`. O helper cria:

```text
public/projects/meu-general/
  project.json
  assets/portrait.png
```

E registra o projeto em `public/projects/index.json`. Ele entra no terminal, no Conselho dos Generais e no carousel da entrada. A experiência herda o tom intimidante da categoria. `--no-featured` desativa a inclusão no carousel.

O nome é um nome público compartilhado. Descrições e dados não fornecidos ficam explicitamente em preparação; nenhum benchmark, resultado ou link é inventado. Edite os textos/seções gerados no JSON, ou forneça uma especificação curta.

## Especificação para um segundo helper

Crie um arquivo fora do catálogo, por exemplo `/tmp/novo-projeto.json`:

```json
{
  "id": "novo-projeto",
  "name": "Novo Projeto",
  "category": "initiatives",
  "subtitle": { "pt": "Descrição real em português", "en": "Actual description in English" },
  "status": { "pt": "em construção", "en": "in progress" },
  "sections": [
    { "type": "hero", "title": "Novo Projeto", "description": { "pt": "Apresentação real", "en": "Actual introduction" } },
    { "type": "text", "title": { "pt": "Propósito", "en": "Purpose" }, "body": { "pt": "Conteúdo fornecido pelo autor.", "en": "Content supplied by the author." } }
  ]
}
```

Execute:

```sh
npm run content -- project --file /tmp/novo-projeto.json
```

Campos mínimos: `id`, `name`, `category`. O resto tem defaults. Você pode fornecer `subtitle`, `status`, `sections`, `visual`, `hall`, `presentation`, `entrance`, `featured` e `image` (arquivo local a copiar). Textos de conteúdo aceitam string compartilhada ou `{ "pt": "...", "en": "..." }`.

`presentation` compartilha `tone`, `icon`, `secondaryAccent`, `imageFit` e `imagePosition` entre card, carrossel e página. Campos opcionais herdam `src/data/presentation-presets.json`. O helper registra o tom selecionado automaticamente. Ícones devem existir em `src/assets/icons/`. Consulte [PERSONALIZATION.md](PERSONALIZATION.md) para os valores e [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) para o fluxo de outro assistente.

Os tons são `intimidating`, `neutral` e `humanitarian`, herdados de `category.visual.tone`. `--tone` permite definir o tom da experiência. Cada general pode ter imagens, cores, hover e atmosfera próprios por dados.

Na criação, a prioridade é `presentation.tone`, depois `--tone`/`tone`, depois `visual.tone` e finalmente o tom da categoria. O helper escolhe a paleta e registra o mesmo tom no preview e no manifest.

Os defaults de cores, fonte e atmosfera ficam em `src/data/region-themes.json`, compartilhados pelo helper e pela experiência enquanto o manifest chega. Um manifest pode sobrescrever esses valores. Se omitir `visual.tone` em um JSON escrito manualmente, a experiência usa o tom da categoria.

## Comunicado/update de um projeto

```sh
npm run content -- update --id meu-comunicado --project derrisor --date 2026-10-10 --title-pt "Título real" --title-en "Actual title" --body-pt "Mudança real fornecida pelo autor." --body-en "Actual change supplied by the author."
```

Use a **data real do comunicado**. Este exemplo não publica um update por si só. O item aparece na Home, no mural de novidades e na experiência do projeto. Sem `--project`, o comunicado é geral.

Também aceita arquivo:

```json
{
  "id": "meu-comunicado",
  "project": "derrisor",
  "date": "2026-10-10",
  "title": { "pt": "Título real", "en": "Actual title" },
  "body": { "pt": "Atualização real.", "en": "Actual update." }
}
```

```sh
npm run content -- update --file /tmp/comunicado.json
```

O catálogo começa com o mural vazio: nenhuma campanha ou atualização competitiva foi inventada. Atualizar um projeto existente continua sendo editar o seu `project.json`; um comunicado é uma entrada separada sobre a mudança.

## Verificar tudo

```sh
npm run content -- check
npm test
npm run lint
npm run build
```

O helper recusa IDs duplicados, categorias inexistentes, datas inválidas, traduções incompletas e referências a projetos inexistentes. Não sobrescreve diretórios de projetos. Se uma imagem falhar, remove o novo diretório e conserva o catálogo. O catálogo é substituído atomicamente após a validação. O lock `.content-lock` impede dois helpers de alterar o catálogo ao mesmo tempo; após uma interrupção, confirme que nenhum helper está ativo antes de remover um lock que permaneceu.

Depois de mudar o catálogo, recarregue o preview para renovar o cache da sessão. Para disponibilizar ao público, faça o build/deploy pelo fluxo de publicação usado no projeto.

## Instrução curta para outro assistente

> Leia docs_autoupdate/CONTENT_HELPER.md. Adicione o conteúdo fornecido com npm run content, sem editar o runtime nem criar uma página React. Preserve os itens existentes. Use PT/EN, o tom da região e assets locais. Não invente links ou resultados. Execute content check, testes, lint e build. Informe os arquivos criados e os dados que continuam em preparação.

Para novos atalhos de navegação e regiões, consulte [TERMINAL.md](TERMINAL.md).
