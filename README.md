# Samuel's Domain


O portfólio é um mundo visitável: generais em regiões intimidantes, projetos com presença neutra e causas em territórios acolhedores. A entrada mostra caminhos e projetos para explorar, junto do mural de novidades. O [helper de conteúdo](docs_autoupdate/CONTENT_HELPER.md) registra projetos e comunicados sem criar páginas React.

Primeiro vertical slice do portfólio: Home → Projects → Champion Hall → Project Experience, com Power Terminal disponível em todas as cenas. React + TypeScript + Vite, sem router, Redux ou backend.

A interface e os conteúdos atuais têm suporte a português e inglês pelo seletor PT/EN no topo, com preferência salva no navegador. Para adicionar atalhos e destinos, consulte o [guia do terminal](docs_autoupdate/TERMINAL.md), com receitas de JSON e uma tabela de arquivos. Atalhos ficam em `src/data/commands.json` e entram automaticamente na ajuda e no autocomplete.

## Executar

O resumo e a página completa “Sobre mim” compartilham `src/data/profile.json`. Links, notas e depoimentos selecionados são cards por dados; o [guia de perfil](docs_autoupdate/PROFILE.md) explica como adicionar, ordenar e publicar. O carousel avança a cada 5 segundos, com pausa para interação e controle manual. O comando principal de navegação é `tp <destino>`.

```sh
npm install
npm run dev
npm run lint
npm test
npm run build
```

Os testes usam o runner e o suporte nativo a TypeScript do Node 24+. O runtime do site roda no navegador. `npm run preview` serve o build localmente; esta etapa não publica o site.

## Estrutura

```text
public/projects/
  index.json                       # Categorias e previews; registro de destinos
  derisor/
    project.json                   # Conteúdo inicial de champion
    assets/portrait.jpeg           # Imagem já fornecida no projeto
  recolhe/project.json             # Segunda configuração, conteúdo pendente
src/
  runtime/
    commands.ts                    # Interpreter, Command Bus, help, autocomplete
    destinations.ts                # Registro genérico de destinos
    scenes.ts                      # Estado, reducer, histórico, política de transição
    context.ts / useScenes.ts      # Contrato e acesso ao runtime
    SceneContext.tsx               # Provider, catálogo, execução e prefetch
    SceneManager.tsx               # Renderização das cenas e shell contínuo
  projects/
    loader.ts                      # Fetch, cache de promises, assets, prefetch
    validation.ts                  # Validação dos JSONs em runtime
    ProjectExperience.tsx          # Tema e entrada por manifest
    SectionRenderer.tsx            # hero / text / stats / gallery / links
  components/
    CommandButton.tsx               # Adaptador de UI → comandos
    CatalogNotice.tsx / Visual.tsx  # Erros recuperáveis e fallback de imagem
    Carousel/                      # Featured a partir do catálogo
    ChampionCard/                  # Card e efeitos por configuração
    PowerTerminal/                 # Overlay, sessão, input, teclado
  pages/
    Home.tsx / Projects.tsx / Champions.tsx / Information.tsx
  types/content.ts / project.ts
  data/home.json                   # Apresentação, navegação e informações PT/EN
  data/commands.json               # Atalhos do terminal, help e autocomplete
  data/profile.json                # Resumo, perfil completo e cards PT/EN
  profile/                         # Renderer e validação de links/notas/depoimentos
  i18n/                            # Idioma, textos da interface e preferência salva
tests/runtime.test.mjs
tests/i18n.test.mjs
docs_autoupdate/TERMINAL.md                    # Receitas para comandos e destinos
docs_autoupdate/PROFILE.md                     # Como adicionar cards e editar o perfil
```

## Command System

```text
botão / carousel / card / terminal
                ↓ executeCommand(string)
          Command Bus
                ↓ interpretCommand
     comando normalizado e tipado
                ↓ destinationRegistry / dispatch
           Scene Reducer
                ↓ estado
           Scene Manager
```

`CommandButton` e `PowerTerminal` chamam exatamente a mesma função. O terminal não contém parser nem regras de navegação. `help`, `clear`, `back`, `open terminal`, `close terminal`, `tp <destination>`, `projects` e `champions` são interpretados em `commands.ts`. `clear` retorna um resultado tipado para limpar o histórico visual da interface que recebeu o comando.

O registro combina os destinos fixos, os IDs de informação em `home.json`, as categorias e os projetos descobertos no catálogo. IDs em conflito são rejeitados. Nenhum código do runtime identifica um champion específico. Comandos de navegação assíncronos usam um contador de intenção: uma resposta antiga não sobrescreve uma navegação mais recente.

## Scene Manager

Context + reducer mantêm `currentScene`, `previousScene`, `selectedProject`, `terminalOpen` e uma pilha de até 100 destinos para `back`. Repetir o destino atual não adiciona histórico. Voltar no início da sessão mantém a cena. O histórico também preserva o projeto quando retorna a uma experiência.

As cenas iniciais são `home`, `projects`, `champions` e `project-experience`. `category` reutiliza o hall para outras categorias; `information` apresenta Conquistas, Sobre, Contato e Currículo a partir de dados.

A shell mantém o terminal e os controles montados enquanto troca o conteúdo da cena. Transições CSS respeitam movimento reduzido. `sceneTransition(origin, destination)` é o ponto para futuras políticas por origem/destino; o manifest também define a entrada das suas seções. Não há reload, troca de documento nem sincronização de URL nesta etapa. Links externos fornecidos em manifests podem abrir uma nova aba; não são usados para navegar entre cenas.

O terminal mantém saída e histórico de comandos durante a sessão (até 200 entradas e 100 comandos). Enter executa, Tab completa o primeiro prefixo correspondente, ↑/↓ recuperam comandos e Escape fecha. O foco fica no diálogo, a cena de fundo fica `inert` e o foco retorna ao trigger ao fechar. O terminal permanece aberto durante teleportes.

## Adicionar um projeto

1. Crie `public/projects/<id>/project.json` e os assets necessários.
2. Adicione uma entrada em `public/projects/index.json`, com uma categoria registrada.
3. Use `featured: true` para aparecer automaticamente no carousel. Use a categoria `champions` para aparecer no Champion Hall.

Não é necessário importar o JSON em TypeScript ou criar uma página React. O catálogo contém previews pequenos; a identidade no manifest descreve a experiência completa. Mantenha ambos consistentes. Os IDs aceitam letras minúsculas, números e hífens; devem ser únicos entre cenas, categorias e projetos.

Exemplo de entrada em `index.json`:

```json
{
  "id": "new-champion",
  "manifest": "new-champion/project.json",
  "category": "champions",
  "featured": true,
  "identity": {
    "name": "New Champion",
    "subtitle": "Descrição fornecida pelo autor",
    "status": "dormant"
  },
  "hall": {
    "image": "new-champion/assets/portrait.webp",
    "accent": "#a6d8e8",
    "hoverText": "SIGNAL DETECTED",
    "hoverEffect": "scan"
  },
  "command": "tp new-champion"
}
```

`hall.image` é opcional e relativo a `index.json`. Efeitos disponíveis: `scan`, `pulse`, `lift`, `none`. Os mesmos cards aceitam mouse e foco de teclado. A ausência/falha de imagem preserva a geometria e mostra um visual de placeholder.

Exemplo de manifest completo mínimo:

```json
{
  "id": "new-champion",
  "identity": {
    "name": "New Champion",
    "subtitle": "Descrição fornecida pelo autor",
    "status": "dormant"
  },
  "visual": {
    "background": "#080e13",
    "foreground": "#e7f1f5",
    "accent": "#a6d8e8",
    "font": "ui-monospace, Consolas, monospace",
    "overlay": 0.9,
    "vignette": true,
    "atmosphere": "grid"
  },
  "entrance": { "transition": "rise", "durationMs": 300 },
  "sections": [
    { "type": "hero", "title": "New Champion", "description": "Descrição inicial" },
    { "type": "text", "title": "About", "body": "PLACEHOLDER — conteúdo pendente." },
    { "type": "stats", "title": "Record", "items": [{ "label": "Benchmarks", "value": "—", "note": "Ainda não medido" }] },
    { "type": "gallery", "title": "Gallery", "items": [{ "alt": "Imagem futura", "caption": "PLACEHOLDER — asset pendente." }] },
    { "type": "links", "title": "GitHub", "items": [{ "label": "Repository pending", "note": "URL ainda não fornecida" }] }
  ]
}
```

`visual.backgroundImage`, imagens de `hero` e imagens de `gallery` são opcionais e relativas ao manifest. `hero.eyebrow` é opcional. `overlay` vai de 0 a 1 e escurece o background image; `atmosphere` aceita `grid`, `scanlines`, `none`. `entrance.transition` aceita `fade` e `rise`, com duração de 0 a 2000 ms. `links.items[].href` é opcional; sem ele, o item aparece como conteúdo pendente, sem link falso. URLs fornecidas precisam ser HTTP(S) absolutas.

O renderer escolhe o componente exclusivamente por `section.type`. JSONs inválidos têm mensagem recuperável e retry, sem derrubar a Home ou o terminal.

## Performance e limites

O catálogo é buscado em segundo plano na entrada. Manifests são buscados ao hover/foco de cards ou ao entrar na experiência, com cache de promises compartilhado (incluindo requisições em andamento). Imagens principais são pré-carregadas no prefetch; galerias usam lazy loading. Assets ausentes não bloqueiam a experiência. Buscas têm timeout de 8 segundos e falhas são removidas do cache para permitir retry. A base do Vite é respeitada nos paths do catálogo.

O JS das pequenas cenas fica no bundle inicial: dividir agora acrescentaria espera aos teleportes. O conteúdo pesado permanece em JSON/assets fora do bundle.

Pendências deliberadas: URLs/deep links, transições de saída e políticas mais elaboradas, restauração de scroll por cena, invalidação/versionamento do cache após atualização de conteúdo e esquema JSON formal/editor. A identidade aparece no preview e no manifest; uma etapa de geração/checagem do catálogo pode evitar divergências futuras. Esta etapa valida todo o catálogo em conjunto; isolamento por entrada inválida pode ser adicionado quando houver mais conteúdo.

## Conteúdo pendente

Derisor usa a imagem já existente e mantém About, Architecture, Combat Record, captura de gameplay e GitHub como placeholders explícitos. Não há benchmarks, resultados ou URLs inventados. ReColhe conserva somente o nome e a descrição existentes; o restante é placeholder. Titles, biografia detalhada e contato também aguardam dados reais. Experiments e Other Projects são halls vazios funcionais.

## Validação

`npm test` cobre o vertical slice no runtime, a equivalência entre comandos de botões e aliases do terminal, registro de um novo champion apenas por dados, comandos inválidos, prioridade entre navegações, colisões de destinos e validação dos manifests.

Os testes de idioma também verificam preferência, textos PT/EN, atalhos configurados, destinos da Home e rejeição de traduções incompletas. A atualização da Home foi validada no Chromium com troca de idioma mantendo a cena, preferência após reload, ajuda/atalhos traduzidos, as duas experiências e viewports de 320, 390 e 768 px.

Checklist de navegador:

1. Home → Champions → hover/foco em Derisor (TARGET DETECTED) → Explore.
2. Conferir status DORMANT, seções e placeholders da experiência.
3. Abrir Power Terminal → `tp home` → Escape → reabrir.
4. `tp champions` → `help` → `clear` → `back` (Home).
5. Conferir histórico ↑/↓, Tab, Escape e navegação por teclado.
6. Home → Projects → Champions; carousel → Explore em ambos os projetos.
7. Conferir telas pequenas e falhas de manifest/imagens com retry/fallback.

Validação desta etapa (10/10/2026): o fluxo acima foi exercitado em Chromium com Playwright e as capturas foram inspecionadas. Confirmados: um único documento durante todos os teleportes, uma única busca do manifest entre hover e revisitas, os dois itens do carousel, histórico/Tab/Escape/foco do terminal e ausência de erros de runtime no fluxo principal. Um champion adicional injetado somente no catálogo e manifest apareceu no hall e abriu no engine. Falhas simuladas de catálogo/manifest e assets foram recuperadas; viewport de 390 px não apresentou overflow horizontal e respeitou movimento reduzido. Playwright e Chromium foram usados apenas em `/tmp`, sem adicionar dependências ao projeto.

Validação do mundo e terminal (10/10/2026): 14 testes passaram, content check confirmou 2 projetos e nenhum comunicado fictício, lint sem avisos e build aprovado. No Chromium, conferidos verbos PT/EN com acentos e nomes traduzidos, ls/pwd/cd/back, maximizar e Ctrl+L, fundo do Derisor em 1920 px, temas das regiões, update por dados na Home/experiência e telas de 320/390/768 px. Nenhum ID de projeto é tratado especialmente no runtime.

## Currículo e PDFs

A página `tp curriculum` apresenta a trajetória e permite baixar o currículo no idioma atual. `npm run resume:pdf` regenera os documentos; `npm run dev` e `npm run build` também fazem isso automaticamente. Consulte [RESUME.md](docs_autoupdate/RESUME.md). Os PDFs gerados não são versionados e são incluídos no build.
