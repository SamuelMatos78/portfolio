# Currículo e PDF por dados

`tp curriculum` abre a página com foto, apresentação, linha do tempo, detalhes profissionais e projetos selecionados. O botão de download entrega um PDF A4 real no idioma atual. Não abre a janela de impressão nem depende de um serviço externo.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `src/data/profile.json` | Nome, foto, resumo, detalhes e links de contato |
| `src/data/information.json`, chave `curriculum` | Formação, experiências e competências; fonte compartilhada pela página e pelos PDFs |
| `src/data/resume.json` | Apresentação visual, tecnologias em destaque, IDs dos cards de contato, projetos selecionados e nomes dos PDFs |
| `src/data/home.json` | Destino com `content: "resume"`; preserve o ID usado em `information.json` |
| `src/data/github-stats.json` | Estatísticas públicas e distribuição de linguagens por bytes, com data de coleta |
| `scripts/generate-resume.mjs` | Gerador Node com PDFKit; fontes locais em `scripts/assets/fonts/` |

Continue usando textos PT/EN e fatos fornecidos pelo autor. `contactCards` aponta para cards `link` publicados, com URLs reais no perfil. `selectedProjects` aponta para IDs existentes no catálogo. Para destacar outro projeto, edite somente o array. `focus` aceita strings compartilhadas ou `{ "pt": "...", "en": "..." }`.

Os nomes em `documents.pt` e `documents.en` devem ser diferentes, em minúsculas e hífens, terminando em `.pdf`. Não use diretórios nem URLs externas. O componente acrescenta o caminho base de publicação ao link, inclusive para sites hospedados em subpastas.

## Gerar e atualizar

```sh
npm run resume:pdf
```

Gera `public/resume/samuel-oliveira-matos-pt.pdf` e `public/resume/samuel-oliveira-matos-en.pdf`. Os nomes vêm do JSON. Textos são selecionáveis, acentos e símbolos usam fontes incorporadas, contatos são links e o documento tem paginação. O gerador adiciona páginas conforme o conteúdo cresce, sem truncar as seções.

O build tenta renovar o snapshot do GitHub antes de gerar os PDFs, com fallback para dados locais válidos se a API estiver indisponível. As linguagens declaradas permanecem; as medidas por bytes são informação adicional com data. Veja [LINKS_AND_GITHUB.md](LINKS_AND_GITHUB.md).

`npm run dev` gera os PDFs antes de iniciar o preview. `npm run build` gera os PDFs novamente e o Vite os inclui em `dist/resume/`. Se mudar os dados enquanto o preview está aberto, rode `npm run resume:pdf` para atualizar também os downloads.

Os PDFs gerados ficam no `.gitignore`; mantenha os dados, o gerador, fontes/licença e lockfile versionados. O deploy deve executar `npm ci` com as dependências de desenvolvimento e `npm run build`, em Node 24+. PDFKit é uma ferramenta de build e não entra no bundle do visitante.

## Verificação

```sh
npm run content -- check
npm test
npm run lint
npm run build
```

Confira a página em PT/EN e mobile. Baixe os dois arquivos e confira o nome, a foto, a formação, as experiências, os acentos e os links. Os testes verificam a configuração, a geração de PDFs, fontes incorporadas e paginação. Preserve os avisos de licença das fontes DejaVu em `scripts/assets/fonts/LICENSE`.

## Convite do terminal

O convite aparece na Home 1,2 s após a entrada, permanece por 6,5 s e se recolhe em 0,4 s. Mostra “Use o terminal para descobrir coisas ou explore pelos cards”, em PT/EN, com o comando de ajuda e um botão que usa o Command Bus.

Aparece uma vez por sessão da aba (`sessionStorage`). Hover ou foco no próprio aviso pausam a saída; ao sair, o tempo reinicia. Abrir o terminal ou sair da Home remove o aviso. A preferência por movimento reduzido mostra o conteúdo sem animação. Não há abertura automática do modal nem mudança de foco na chegada. Os textos estão em `src/i18n/messages.ts`; apresentação e tempos ficam em `TerminalInvitation.tsx/.css`.
