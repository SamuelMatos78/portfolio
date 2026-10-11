# Resumo, perfil e cards por dados

Edite `src/data/profile.json`. O mesmo conteúdo alimenta o resumo da Home, acessível ao rolar, e a página completa aberta com `tp about` ou pelo botão “Conhecer mais sobre mim”. Não precisa criar uma página para cada card.

## Textos e detalhes

- `name`: seu nome.
- `photo`: retrato local opcional. Exemplo: `{ "src": "me.jpeg", "alt": { "pt": "Foto de Samuel", "en": "Samuel's photo" }, "position": "50% 35%" }`. `src` é um nome de arquivo em `src/assets`, sem diretórios. JPEG, PNG, WebP e AVIF são descobertos automaticamente. A foto aparece no resumo e no perfil completo; falhas de carregamento usam as iniciais.
- `eyebrow`, `title`, `summary`: apresentação curta na Home.
- `details`: lista livre de pares `label` / `value`.
- `full.title`, `full.paragraphs`, `full.note`: conteúdo adicional da página completa.
- `full.sections`: seções opcionais `hero`, `text`, `stats`, `gallery` e `links`, na ordem desejada. Formação, experiências e competências atuais usam essas seções; não precisam de componentes específicos.
- `cards`: lista livre de cards.

Os textos aceitam uma string compartilhada ou `{ "pt": "Português", "en": "English" }`. Mantenha os dois idiomas quando usar um objeto.

## Card de LinkedIn ou qualquer link

Os cards de LinkedIn e GitHub já usam as URLs fornecidas por Samuel. Para adicionar outro perfil, inclua `href` com sua URL real:

```json
{
  "id": "linkedin",
  "type": "link",
  "symbol": "in",
  "title": "LinkedIn",
  "description": { "pt": "Meu perfil profissional.", "en": "My professional profile." },
  "href": "https://www.linkedin.com/in/SEU-PERFIL",
  "published": true
}
```

`SEU-PERFIL` é um marcador do exemplo: substitua antes de publicar. Sem `href`, o card mostra “Link em preparação”, sem um link falso. Esse mesmo tipo serve para outros perfis, artigos ou sites: basta mudar os dados. Links abrem em outra aba.

## Card com comentário selecionado de outro dev

O arquivo inclui um modelo oculto com `published: false`. Substitua os marcadores pelo depoimento real que você escolheu e pelo nome do autor, depois publique:

```json
{
  "id": "depoimento-colega",
  "type": "testimonial",
  "symbol": "“",
  "title": { "pt": "Quem já trabalhou comigo", "en": "From someone I've worked with" },
  "quote": { "pt": "DEPOIMENTO REAL EM PORTUGUÊS", "en": "ACTUAL TESTIMONIAL IN ENGLISH" },
  "author": {
    "name": "NOME REAL DO AUTOR",
    "role": { "pt": "Função do autor", "en": "Author's role" },
    "relationship": { "pt": "Contexto em que trabalhamos juntos", "en": "How we worked together" }
  },
  "published": true
}
```

`role` e `relationship` são opcionais. O exemplo contém marcadores, não um depoimento publicado. Você seleciona o que aparece na lista; não existe coleta automática de comentários.

## Card livre de texto

```json
{
  "id": "uma-nota",
  "type": "note",
  "symbol": "✦",
  "title": { "pt": "Título", "en": "Title" },
  "body": { "pt": "Seu conteúdo real.", "en": "Your actual content." },
  "published": true
}
```

## Adicionar e organizar

Adicione objetos ao array `cards`, usando IDs únicos. A ordem do array é a ordem de exibição. `symbol` é opcional. `published: false` guarda um rascunho sem mostrar na Home ou no perfil; omitido, o card é publicado. Todos os campos do rascunho ainda devem ser válidos.

O renderer escolhe o layout por `type`: `link`, `note` ou `testimonial`. Novos conteúdos desses tipos exigem somente JSON. Um tipo visual totalmente novo precisa de uma extensão do renderer, como nas seções de projeto.

Os dados são validados: IDs não podem se repetir, links precisam ser HTTP(S) absolutos e objetos traduzidos precisam ter PT/EN. Erros no perfil aparecem em sua seção e permitem continuar explorando os projetos.

## Carousel

Com mais de um item, o carousel avança a cada 5 segundos. Pausa durante hover/foco, enquanto o terminal está aberto e quando a aba está oculta. O botão de pausa permite parar/retomar manualmente. Movimento reduzido inicia com alternância pausada; o visitante pode retomá-la pelo botão. As setas continuam funcionando.

## Conferir

```sh
npm test
npm run content -- check
npm run lint
npm run build
```

Abra a Home, role até o resumo, teste o botão da página completa e confira PT/EN. Para projetos e updates, continue usando [CONTENT_HELPER.md](CONTENT_HELPER.md); para os comandos, use [TERMINAL.md](TERMINAL.md).

## Conquistas, contato e currículo

O cabeçalho dessas páginas continua em `src/data/home.json`, no array `information`. O conteúdo está em `src/data/information.json`, organizado pelo mesmo ID do destino, por exemplo:

```json
{
  "contact": [
    { "type": "links", "title": { "pt": "Vamos conversar", "en": "Let’s connect" }, "items": [{ "label": "LinkedIn", "href": "https://www.linkedin.com/in/SEU-PERFIL" }] }
  ]
}
```

É um exemplo: preserve as outras páginas do arquivo e use uma URL real. Novas páginas precisam primeiro de um ID em `home.information`; o conteúdo aceita os mesmos tipos de seção. `content: "profile"` mantém o perfil compartilhado. `note` no cabeçalho é opcional. `content check` valida seções, traduções, links, IDs registrados e a existência da foto.

O contexto fornecido pelo autor está em [author/CONTEXT.md](author/CONTEXT.md), e a origem das afirmações/limites está em [author/SOURCES.md](author/SOURCES.md). Use esses arquivos ao preencher conteúdo. O depoimento modelo permanece oculto. O currículo usa `content: "resume"` e tem PDFs gerados em PT/EN a partir dos dados; consulte [RESUME.md](RESUME.md).
