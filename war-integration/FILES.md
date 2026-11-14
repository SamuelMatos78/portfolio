# Arquivos desta integração

## Criados

- `src/war/WarExperience.tsx` — páginas Darwin, evento e espectador.
- `src/war/WarExperience.css` — identidade visual e media queries.
- `src/war/ArenaEmbed.tsx` — arena compartilhada e comunicação de interface.
- `src/war/api.ts` — contrato e cliente da API.
- `scripts/dev-local.mjs` — inicia backend e Vite, gerenciando os processos filhos.
- `public/projects/darwin/project.json` — registro de apresentação.
- `public/projects/darwin/assets/darwin.png` — sprite sheet copiada do War Game.
- `public/projects/darwin/assets/portrait.svg` — viewport vetorial do primeiro sprite.
- `public/projects/code-event/project.json` — registro do evento.
- `public/projects/war-game/project.json` — registro do jogo.
- `public/projects/war-game/battlefield.png` — mapa já existente no War Game.
- `war-integration/server.ts` — backend de partidas e configuração.
- `war-integration/arena-adapter.ts` — adaptação da arena existente.
- `war-integration/store.ts` — SQLite, identidades, histórico e idempotência.
- `war-integration/policy.ts` — contribuição configurável, pendente da regra oficial.
- `war-integration/config/challenges.json` — templates das dificuldades e imagens.
- `war-integration/config/scoring.json` — configuração da política pendente.
- `war-integration/config/submissions/README.md` — instruções das submissões futuras.
- `war-integration/test/integration.test.ts` — seis testes de integração/integridade.
- `war-integration/tsconfig.json` — checagem do backend e motor integrado.
- `war-integration/vendor-checksums.json` — inventário dos arquivos da integração, com SHA-256.
- `war-integration/vendor/` — arquivos reutilizados, com ajustes locais de IDE e estilo.
- `war-integration/vendor/game/strategy-language.js` — converte os comandos escritos pelo jogador para a AST JSON da arena no navegador.
- `war-integration/README.md` — arquitetura, execução, segurança, testes e pendências.
- `war-integration/FILES.md` — este inventário.
- `war-integration/data/event.sqlite*` — banco local inicial criado na tentativa de
  iniciar o backend; ignorado pelo Git. Testes não o utilizam, usam bancos em `/tmp`.

## Modificados

- `.gitignore` — ignora persistência local do evento.
- `package.json` — scripts para execução e verificação locais.
- `vite.config.ts` — proxy de desenvolvimento/preview, mesma origem.
- `public/projects/index.json` — três novos cards, preservando os demais registros.
- `src/runtime/SceneManager.tsx` — conecta os três destinos à experiência interativa.
- `tests/runtime.test.mjs` — corrige referência da fixture de colisão e verifica
  os três destinos com histórico de navegação.
- `public/resume/samuel-oliveira-matos-pt.pdf` e
  `public/resume/samuel-oliveira-matos-en.pdf` — regenerados pelo build preexistente.

O estado local também contém alterações em `public/projects/derisor/project.json`
e um asset `public/projects/derisor/assets/Derisor.png`; estes não foram editados
pela integração. Nenhum arquivo do diretório original `bots/war_game` foi escrito.
Nenhum commit, push, PR remoto, deploy ou publicação foi realizado.

## Atualização da campanha — 12/11/2026

- Criados `src/war/DarwinCountdown.tsx`, `src/war/campaign.ts` e
  `tests/campaign.test.mjs` para o anúncio de dois dias com data fixa.
- Atualizados `config/challenges.json`, `server.ts`, `src/war/api.ts`,
  `src/war/WarExperience.tsx` e seu CSS: Sonnet captura AraMoney; GPT captura
  Gabs por ordem de Darwin. Os IDs da campanha referenciam os snapshots existentes.
- Aplicado o asset `public/projects/war-game/AraMoney.png` fornecido pelo usuário,
  sem alterar a imagem. Gabs continua com placeholder.
- Atualizado `test/integration.test.ts`: partidas reais contra os dois captores,
  associação aos arquivos fixed e preservação da integridade dos snapshots.
- Atualizada esta documentação; nenhum deploy, commit ou push.

## Correção da inicialização local

- `package.json`: `npm run dev` inicia Vite e arena; `dev:frontend` inicia só Vite.
- `scripts/dev-local.mjs`: inicia o backend em porta livre, aguarda prontidão e
  repassa a porta ao Vite; Ctrl+C encerra os serviços.
- `vite.config.ts`: proxy usa a porta efetiva e preserva Host para a checagem de origem.
- `src/war/api.ts`, `README.md` e este guia: instruções alinhadas ao comando principal.
- Verificados HTTP 200 e partida completa por localhost com banco temporário.

## Submissões oficiais e retratos

- Darwin e o Sentinel de Evil Darwin foram retirados do registro público;
  os arquivos internos permanecem preservados. O backend limita o modo espectador
  às três submissões congeladas de LLMs, com rejeição de IDs não publicados.
- O perfil de Darwin informa submissão pendente e direciona às partidas entre IAs.
- O card de AraMoney passa a convidar para `https://aramuni.dev/`, sem menção a dicas.
- `config/challenges.json` usa a foto fornecida `public/projects/war-game/gabs.jpeg`.
- Testes verificam a lista pública, o retrato e o bloqueio de partidas dos generais
  sem submissão, além de uma partida LLM vs LLM real de 720 segundos.
