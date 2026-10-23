# Guia do Power Terminal

Este guia explica onde adicionar atalhos, destinos e ações. Os exemplos são do projeto atual: você não precisa percorrer todo o runtime.

Para criar e registrar projetos/comunicados com um helper local, consulte [CONTENT_HELPER.md](CONTENT_HELPER.md). Um projeto novo já recebe seu espaço e destino; um comunicado pode aparecer na Home, no mural e no espaço do projeto.

## Navegação nos dois idiomas e estilo Ubuntu

O terminal tem janela em estilo Ubuntu, prompt `guest@samuel-world:~/regiao$`, minimizar/fechar e alternar tamanho. Ele controla os destinos deste mundo. Comandos são aceitos em PT e EN independentemente do idioma da interface:

| Exemplo | Resultado |
| --- | --- |
| `ir generais`, `teleportar campeões`, `tp champions` | Conselho dos Generais |
| `ir para projetos`, `go to projects`, `cd projetos` | Territórios de projetos |
| `ir "Causas e iniciativas"` | Região das iniciativas, usando o nome traduzido |
| `teletransportar currículo`, `tp resume` | Currículo |
| `ls`, `listar`, `regions`, `regiões` | Lista de destinos |
| `pwd`, `onde` | Caminho atual |
| `cd ..`, `back`, `voltar` | Volta à cena anterior |
| `cd /`, `cd`, `ir início` | Entrada do mundo |
| `updates`, `novidades`, `atualizações` | Mural de comunicados |
| `help`, `ajuda` | Ajuda |
| `clear`, `limpar`, Ctrl+L | Limpa a saída |
| `exit`, `sair`, `fechar terminal`, Escape | Fecha o terminal |

Acentos, maiúsculas e espaços extras são normalizados. Os verbos de viagem são `tp`, `teleportar`, `teletransportar`, `ir`, `go` e `cd`. Também são aceitos o ID, atalhos de destinos e os nomes PT/EN vindos dos JSONs. Se dois conteúdos tiverem o mesmo nome, use o ID único. Tab completa comandos e destinos. A navegação mantém os mesmos destinos nos dois idiomas.

Regiões usam `visual.tone`: `intimidating` (generais), `neutral` (projetos) ou `humanitarian` (causas). O manifest do projeto pode personalizar seu próprio tom. Backgrounds aceitam `backgroundSize`, `backgroundPosition`, `backgroundOpacity` e `overlay`, sem criar uma regra React por champion.

## Qual arquivo eu edito?

| O que você quer adicionar | Arquivo | Precisa de React novo? |
| --- | --- | --- |
| Uma palavra que execute um comando existente | `src/data/commands.json` | Não |
| Um destino de texto, como currículo, contato ou formação | `src/data/home.json`, em `information` | Não |
| Um hall/categoria de projetos | `public/projects/index.json`, em `categories` | Não |
| Um projeto/champion | `public/projects/index.json` + `<id>/project.json` + assets | Não |
| Um botão na navegação da Home | `src/data/home.json`, em `navigation` | Não |
| Um card de entrada na Home | `src/data/home.json`, em `paths` | Não |
| Uma ação que ainda não existe no sistema | `src/runtime/commands.ts` | Apenas a implementação da nova ação |
| Um tipo de cena com estrutura realmente nova | `src/runtime/scenes.ts`, `destinations.ts` e `SceneManager.tsx` | Sim |

Adicionar um botão em `navigation` **não registra o destino**. Primeiro registre o conteúdo em `information`, `categories` ou `projects`. O destino `curriculum`, por exemplo, está registrado em `information`.

## Comandos disponíveis

| Comando | Resultado | Atalho em português |
| --- | --- | --- |
| `tp home` | Abre a Home | `inicio` |
| `tp projects` | Abre o hall de categorias | `projetos` |
| `tp champions` | Abre o Conselho dos Generais | `campeoes` |
| `tp curriculum` | Abre o currículo | `curriculo` |
| `tp <id>` | Abre qualquer destino registrado | Você pode criar um atalho |
| `back` | Volta à cena anterior, se houver | `voltar` |
| `open terminal` | Abre o terminal | `abrir terminal` |
| `close terminal` | Fecha o terminal | `fechar terminal` |
| `help` | Lista comandos, atalhos e destinos | `ajuda` |
| `clear` | Limpa a saída visual da sessão | `limpar` |

`projects`, `champions`, `home` e `curriculum` também são atalhos. Os IDs e comandos canônicos permanecem iguais nos dois idiomas. O seletor PT/EN muda os textos e as respostas; ambos os conjuntos de atalhos funcionam em qualquer idioma.

Enter executa, Tab completa o primeiro prefixo, ↑/↓ recuperam comandos e Escape fecha. `clear` limpa a saída, mas conserva os comandos para ↑/↓. No início do histórico de navegação, `back` mantém a cena atual. Não digite os sinais `< >`: use, por exemplo, `tp derisor`.

## Receita 1: adicionar um atalho

Adicione este objeto ao array de `src/data/commands.json`:

```json
{ "command": "sobre", "target": "tp about" }
```

Agora `sobre` executa exatamente o mesmo mecanismo de `tp about`. Ele aparece automaticamente em `help` e no autocomplete. Não precisa editar o componente do terminal.

Também pode criar um atalho de ação:

```json
{ "command": "sair", "target": "close terminal" }
```

Use nomes únicos em minúsculas e espaços simples. `target` precisa ser um comando canônico completo: `tp <id>`, `back`, `help`, `clear`, `open terminal` ou `close terminal`. Não aponte para outro atalho: não há expansão recursiva. Evite redefinir os comandos canônicos. Atalhos são correspondências exatas, não templates de argumentos.

## Receita 2: adicionar um destino de texto

Em `src/data/home.json`, adicione em `information`:

```json
{
  "id": "formacao",
  "title": { "pt": "Formação", "en": "Education" },
  "description": {
    "pt": "Adicione aqui os dados reais da sua formação.",
    "en": "Add your actual education details here."
  },
  "note": { "pt": "EM PREPARAÇÃO — conteúdo pendente.", "en": "PLACEHOLDER — content pending." }
}
```

Isso registra `tp formacao` automaticamente, com uma cena de texto, entrada no `help` e autocomplete.

Para criar também um botão na Home, adicione em `navigation`:

```json
{
  "label": { "pt": "Formação", "en": "Education" },
  "command": "tp formacao"
}
```

Se quiser um card de entrada, adicione em `paths`:

```json
{
  "label": { "pt": "Minha formação", "en": "My education" },
  "description": { "pt": "Conheça minha trajetória de estudos.", "en": "Explore my education journey." },
  "symbol": "↗",
  "command": "tp formacao"
}
```

## Receita 3: adicionar um hall

Em `public/projects/index.json`, adicione em `categories`:

```json
{
  "id": "tools",
  "label": { "pt": "Ferramentas", "en": "Tools" },
  "description": { "pt": "Ferramentas que estou construindo.", "en": "Tools I am building." },
  "visual": { "accent": "#b8d19a", "symbol": "05" },
  "command": "tp tools"
}
```

`tp tools` abre um hall genérico. A categoria aparece em Projects. Projetos com `"category": "tools"` aparecem nesse hall. Um hall sem projetos continua funcionando e exibe uma mensagem de espaço disponível.

## Receita 4: adicionar um projeto/champion

1. Crie `public/projects/<id>/project.json` e, se necessário, `assets/`.
2. Adicione uma entrada em `projects` de `public/projects/index.json`.
3. Use exatamente o mesmo `id` no catálogo e no manifest.

Exemplo de registro:

```json
{
  "id": "meu-projeto",
  "manifest": "meu-projeto/project.json",
  "category": "champions",
  "featured": true,
  "identity": {
    "name": "Meu Projeto",
    "subtitle": { "pt": "Descrição curta", "en": "Short description" },
    "status": { "pt": "em construção", "en": "in progress" }
  },
  "hall": {
    "accent": "#a6d8e8",
    "hoverText": { "pt": "CONHEÇA O PROJETO", "en": "MEET THE PROJECT" },
    "hoverEffect": "scan"
  },
  "command": "tp meu-projeto"
}
```

`tp meu-projeto` já será descoberto pelo terminal. `featured: true` inclui o projeto no carousel; `category: "champions"` inclui no Hall dos Campeões. `hall.image` é opcional e relativo ao catálogo, por exemplo `meu-projeto/assets/portrait.webp`. O manifest aceita as seções genéricas `hero`, `text`, `stats`, `gallery` e `links`; o formato completo está no [README](../README.md#adicionar-um-projeto).

Você pode copiar a estrutura de um `project.json` existente e substituir os dados. O `id` e os caminhos precisam ser atualizados; não copie resultados ou links fictícios. Imagens dentro do manifest são relativas a esse manifest.

## Textos em português e inglês

Os campos de conteúdo aceitam uma string compartilhada:

```json
"title": "GitHub"
```

Ou um objeto com **os dois idiomas**:

```json
"title": { "pt": "Arquitetura", "en": "Architecture" }
```

Isso vale para títulos, descrições, subtítulos, status, texto de hover, corpo de texto, labels, notas e legendas/alt de imagens. `identity.name` é o nome compartilhado do projeto. IDs, comandos, tipos de seção, paths de arquivos, URLs e tokens visuais permanecem strings técnicas estáveis.

Textos fixos da interface ficam em `src/i18n/messages.ts`: adicione a mesma chave em `pt` e `en` e use `t("chave")` no componente. Para conteúdo vindo de JSON, use `text(campo)`. O idioma é lembrado em `localStorage` com a chave `portfolio.locale`; sem preferência salva, usa PT ou EN do navegador, com PT como fallback. Trocar idioma não reinicia a navegação nem a sessão. As respostas já executadas no terminal conservam o idioma em que foram produzidas.

## Quando realmente é necessário editar TypeScript?

Se você quer **um novo verbo com comportamento novo**, como uma ação que o sistema ainda não possui:

1. Em `src/runtime/commands.ts`, adicione o comando à união `Command` e reconheça sua sintaxe em `interpretCommand`.
2. No mesmo arquivo, implemente a ação no `switch (command.type)` de `createCommandBus`.
3. Registre sua descrição em `commandHelp` e em PT/EN em `src/i18n/messages.ts`.
4. Inclua o comando canônico em `commandCompletions`, caso tenha uma sintaxe fixa, e teste a ação.

O bus recebe `dispatch`, `resolveDestination` e `listDestinations` pelo provider. Se a nova ação precisar de uma capacidade diferente, acrescente um handler ao contrato e forneça-o em `SceneContext.tsx`. A UI continua chamando `executeCommand`, sem implementar a ação de novo.

Para uma **estrutura de cena inédita**, acrescente seu tipo em `SceneLocation` (`src/runtime/scenes.ts`), registre o ID em `baseDestinations` (`destinations.ts`) e renderize o componente no switch de `SceneManager.tsx`. Use este caminho somente quando as cenas genéricas de texto, hall e experiência não atenderem ao conteúdo.

## Regras para os destinos

- IDs: letras minúsculas, números e hífens; por exemplo `meu-projeto`.
- Não repita IDs entre informações, categorias e projetos. `home`, `projects`, `champions` e `updates` já são usados.
- O comando é `tp <id>`. O ID é um destino do domínio, não uma URL ou pasta da máquina.
- Alterar só `navigation` não cria uma cena. Alterar só `commands.json` não cria conteúdo.
- Depois de alterar JSONs públicos, recarregue o navegador para limpar o cache da sessão. Prefetch e revisitas usam esse cache.
- Não são adicionadas URLs/deep links nesta etapa.

## Checklist rápido

1. Execute `npm run dev`.
2. Abra o terminal e rode `help` ou `ajuda`; confira seu destino/atalho.
3. Teste o comando e o botão que aponta para ele.
4. Teste `back`, PT/EN e Tab.
5. Rode `npm test`, `npm run lint` e `npm run build`.

Se aparecer “Destino desconhecido”, confira o registro e o ID. Se o JSON falhar, confira vírgulas, campos obrigatórios e os dois idiomas do objeto traduzido. Se um projeto não aparecer no hall, confira `category` e se a categoria existe no catálogo.
