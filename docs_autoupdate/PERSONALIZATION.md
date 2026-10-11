# Personalizar o mundo por dados

Cards, carrossel e experiência compartilham a identidade do catálogo. Não crie um componente por general/projeto. Para adicionar conteúdo automaticamente, siga [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md).

## Onde editar

| Arquivo | Controla |
| --- | --- |
| `public/projects/index.json` | Categorias, previews, ícone, cores compartilhadas, hover, destaque e comunicados |
| `public/projects/<id>/project.json` | Fundo, atmosfera, entrada e seções da página |
| `src/data/presentation-presets.json` | Emblema, cor secundária e enquadramento padrão por tom |
| `src/data/region-themes.json` | Cores, fonte e atmosfera padrão usados pelo helper |
| `src/data/home.json` | Textos PT/EN, caminhos e ícones da entrada |
| `src/data/profile.json` | Resumo pessoal, detalhes, links e depoimentos selecionados |
| `src/data/information.json` | Seções de conquistas, contato e currículo |
| `src/data/resume.json` | Destaques, contatos e projetos da página de currículo; PDFs em PT/EN |
| `src/data/commands.json` | Atalhos do terminal; consulte [TERMINAL.md](TERMINAL.md) |

`Samuel Matos/domain` é a marca fixa no cabeçalho. O conteúdo ao redor continua traduzido.

## Uma identidade para três superfícies

Em **um projeto dentro de `index.json`**, configure:

```json
{
  "presentation": {
    "tone": "intimidating",
    "icon": "swords",
    "secondaryAccent": "#db8268",
    "imageFit": "contain",
    "imagePosition": "center"
  },
  "hall": {
    "image": "meu-general/assets/portrait.webp",
    "accent": "#a6d8e8",
    "hoverText": { "pt": "ENTRE NO TERRITÓRIO", "en": "ENTER THE TERRITORY" },
    "hoverEffect": "scan"
  }
}
```

Este é um **trecho**, não substitua o catálogo por ele. Preserve `id`, `manifest`, `category`, `identity`, `featured` e `command` do registro.

Todos os campos de `presentation` são opcionais. O card e o carrossel usam `presentation.tone` ou o tom da categoria. A página usa `presentation.tone`, depois `visual.tone` do manifest e depois o tom da categoria. O helper registra o tom escolhido na apresentação para manter as três superfícies alinhadas. Campos omitidos herdam `presentation-presets.json`.

`hall.accent` é a cor principal compartilhada pelo card, carrossel e página. `visual.accent` permanece como fallback quando o preview não fornece uma cor. O helper preenche ambas com o mesmo valor ao criar o projeto. Use valores CSS de cor válidos, preferencialmente hexadecimais.

`presentation.imageFit` e `imagePosition` controlam os retratos. O fundo da página usa configurações separadas do manifest. Use `contain` para mostrar uma carta/arte inteira; `cover` preenche o espaço e pode recortar a imagem.

## Tons e interações

| Tom | Intenção visual | Hover recomendado |
| --- | --- | --- |
| `intimidating` | Generais: superfícies escuras, molduras angulares, luz secundária e sombras profundas | `scan` ou `pulse` |
| `neutral` | Projetos: contraste sóbrio, camadas e presença | `lift` |
| `humanitarian` | Causas: superfícies claras, cantos suaves e sombras discretas | `lift` |

`scan` acrescenta uma varredura sobre a arte; `pulse` pulsa o emblema; `lift` usa elevação. Todos os três têm luz que acompanha o mouse, inclinação leve, sombra e movimento da arte. `none` desliga esses efeitos no card; o sinal de navegação continua acessível. Teclado mostra o estado de exploração com foco, e telas de toque mostram o sinal sem exigir hover.

A preferência do sistema por movimento reduzido desliga animações, inclinação e zoom de hover. O carrossel continua alternando a cada **5 segundos**, com pausa em hover, foco, terminal aberto ou aba oculta; inicia pausado com movimento reduzido. Seções da página aparecem suavemente ao entrar na área visível; sem suporte a esse recurso, permanecem visíveis.

## Fundo e entrada de uma página

No `project.json`:

```json
{
  "visual": {
    "background": "#080e13",
    "backgroundImage": "assets/portrait.webp",
    "backgroundSize": "contain",
    "backgroundPosition": "right top",
    "backgroundOpacity": 0.75,
    "overlay": 0.32,
    "vignette": true,
    "atmosphere": "scanlines"
  },
  "entrance": { "transition": "rise", "durationMs": 360 }
}
```

Também é um trecho: preserve os demais campos de `visual`, `identity`, `id` e `sections`. `backgroundOpacity` e `overlay` vão de 0 a 1: aumente a primeira para mostrar a imagem e aumente o segundo para escurecer. Atmosfera: `scanlines`, `grid` ou `none`. Entrada: `rise` ou `fade`, duração de 0 a 2000 ms. O fundo tem uma composição própria em telas grandes para não desaparecer atrás do texto.

Caminhos de imagens em `hall.image` são relativos a `public/projects/`; caminhos no manifest são relativos à pasta do projeto. O loader resolve o caminho de publicação, inclusive quando o site está em uma subpasta. Não use `/src/assets/...` nos manifests públicos.

## Ícones locais

Os SVGs estão em `src/assets/icons/`, baixados do [repositório oficial do Lucide](https://github.com/lucide-icons/lucide/tree/main/icons). A licença ISC e os avisos MIT dos ícones derivados de Feather estão em `src/assets/icons/LICENSE` e devem ser preservados.

Disponíveis: `swords`, `shield`, `heart-handshake`, `layers`, `compass`, `sparkles`, `terminal`, `scroll-text`, `user-round`, `arrow-up-right`, `arrow-left`, `arrow-right`, `pause` e `play`.

Use o nome do arquivo **sem `.svg`** em `presentation.icon`, `category.visual.icon` ou `home.paths[].icon`. Um novo SVG colocado nessa pasta é descoberto pelo componente `Icon` no próximo build; não exige editar uma lista em React. Prefira SVGs de traço, `viewBox="0 0 24 24"`, fundo transparente e sem texto, scripts ou recursos externos. Eles são usados como máscara CSS e recebem a cor da superfície.

O helper e `content check` recusam ícones inexistentes em projetos/categorias. Na UI, um nome desconhecido usa `compass` como fallback. Reinicie o preview se o Vite não detectar a adição de um novo arquivo.

## Mais conteúdo

Adicione seções `hero`, `text`, `stats`, `gallery` e `links` pelo array `sections`, na ordem desejada. Elas herdam o estilo da região. Não escreva condições por ID no renderer.

Para cartões de LinkedIn, notas e depoimentos, use [PROFILE.md](PROFILE.md). Para criar um item com arte, textos e estilo numa operação, use o helper com `--file`, conforme [CONTENT_HELPER.md](CONTENT_HELPER.md). Confira o preview em desktop/mobile e nos dois idiomas antes de publicar.
