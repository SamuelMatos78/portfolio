# Darwin × Humanidade — integração local

Implementação local de 11/11/2026, com campanha atualizada em 12/11/2026. Não houve commit, push, PR, deploy ou publicação.

## Rodar

Requer **Node 24+** (execução nativa de TypeScript e `node:sqlite`) e as dependências
do portfólio. Na pasta `portfolio`:

```sh
npm install  # somente se node_modules não estiver presente
npm run dev
```

Abra `http://localhost:5173/#tp=code-event`.
Outros destinos: `#tp=darwin`, `#tp=war-game`, `#tp=champions`.
Também funcionam no Power Terminal: `tp darwin`, `tp code-event`, `tp war-game`.

`npm run dev` inicia o backend da arena e o Vite juntos. `npm run dev:local`
continua disponível como alternativa equivalente, sem a etapa predev dos PDFs.
Separadamente: `npm run arena` inicia o backend em 127.0.0.1:4173;
`npm run dev:frontend` inicia somente o Vite. O proxy mantém os dois sob a mesma origem.
`npm run preview` também possui proxy para o backend local.
O processo combinado escolhe uma porta livre para o backend e passa essa porta
ao proxy do Vite, evitando conflito com o War Game original na porta 4173.
`ARENA_PORT` permite fixar uma porta se necessário. Ctrl+C encerra a arena e o Vite.

```sh
npm run build
npm test
npm run test:engine
npm run test:arena
npm run check:arena
```

O script build preexistente tenta **ler** estatísticas públicas do GitHub e usa o
snapshot se offline; não envia conteúdo. Também regenera os PDFs locais do currículo.
Para compilar somente o frontend sem essa leitura: `npx tsc -b && npx vite build`.

## Arquitetura e origem

O portfólio correto foi identificado em `pages/Samuel-Matos-dev/portfolio`, pelo
React/Vite, SceneManager, catálogo e ChampionCard existentes. Há três registros
no catálogo e uma experiência React especializada roteada pelo mesmo sistema.

- `src/war/WarExperience.tsx`: apresentação Darwin, dificuldades, bosses, placar e seleção AI vs AI.
- `src/war/DarwinCountdown.tsx` + `campaign.ts`: contador de chegada com data fixa e horário de Brasília.
- `src/war/ArenaEmbed.tsx`: a mesma Code Arena em iframe da própria origem; valida remetente/origem de mensagens. Mensagens só atualizam a leitura do placar, nunca pontuam.
- `war-integration/server.ts`: rotas de configuração, validação e execução; somente snapshots registrados no servidor podem ser adversários.
- `arena-adapter.ts`: adapta caminhos, modo espectador e integração de resultados sem modificar a cópia original da arena.
- `vendor/src`: motor original, sem alterações (engine 1.3.1, ruleset 1.3.0).
- `vendor/game`: IDE de comandos/blocos, biblioteca de 74 comandos, canvas, transporte e workers; o navegador converte o código escrito para AST JSON antes do envio.
- `vendor/llms`: arquivos congelados originais, copiados sem alteração; nenhuma geração ou chamada a LLM.
- `vendor/Darwin/launch/best.json`: fixture interna de treinamento preservada; não é submissão oficial e não é registrada nem exposta pela API pública.
- `vendor-checksums.json`: SHA-256 de todos os arquivos da cópia. O teste verifica integridade. A origem continua sendo `~/Área de trabalho/bots/war_game/`; uma atualização deve ser explícita e reverificada.
- `store.ts`: histórico e identidades em SQLite; `policy.ts`: política de contribuição independente do treinamento evolutivo.

O diretório original do War Game foi somente lido. Submissões e checkpoints
originais não foram alterados. Não foi necessário instalar dependências.

## Programas disponíveis

| ID | Fonte congelada |
| --- | --- |
| claude | llms/claude-sonnet5.5-extra.fixed.json |
| astra | llms/gpt6-astra-v1.1.min.fixed.json |
| gemini | llms/gemini3.1-pro-max.fixed.json |

Os três arquivos `.fixed.json` são os mesmos que a arena original seleciona.
As versões não fixed também foram preservadas; não são promovidas silenciosamente.
Claude, Astra e Gemini são bosses opcionais do evento e disponíveis no espectador.
Darwin e Evil Darwin aguardam suas submissões oficiais e não estão disponíveis
para partidas. O backend rejeita seus IDs e não fornece suas ASTs pela API.
O modo espectador admite somente Claude, GPT / Astra e Gemini nos dois lados,
inclusive ao receber requisições diretas. Cada programa controla os dez soldados
de sua equipe. O perfil de Darwin apresenta arquitetura e status de preparação.

Não existe seed de batalha no motor atual. Os mapas normais são simétricos e
os resultados determinísticos. A seed 7 mencionada no relatório é da evolução.
A configuração mostrada de Darwin foi confirmada em Darwin/Darwin.py:
200 indivíduos, 600 blocos, operadores 20/30/20/20/10%. Não é painel de treino ao vivo.
O relatório de treinamento local permanece preservado para auditoria; seus
programas não são tratados como submissões oficiais da campanha.

## Dificuldades e imagens

A campanha usa os adversários congelados já existentes, sem duplicar programas:

| Missão | Captor / ID | Submissão |
| --- | --- | --- |
| EASY — Save AraMoney | Claude Sonnet / claude | claude-sonnet5.5-extra.fixed.json |
| MEDIUM — Save Gabs | GPT / Astra / astra | gpt6-astra-v1.1.min.fixed.json |
| HARD — Beat Evil Darwin | aguardando programa oficial | template preservado |

Gemini também segue disponível como inimigo opcional com seu arquivo fixed.
As três cópias foram comparadas com `bots/war_game/llms` em 12/11: bytes idênticos.
Os arquivos originais e os hashes da cópia não foram modificados.

Canon: AraMoney foi comprar um carro para sua amada. Enquanto ele se distraía,
seu modelo enlouqueceu e Claude Sonnet o sequestrou. GPT capturou Gabs, futura
designer de Darwin, por ordem do general, que quer escolher o próprio visual.
Essa lore aparece nos cards e na preparação do resgate.

`config/challenges.json` liga EASY a `opponentId: claude` e MEDIUM a
`opponentId: astra`. A seleção abre o mesmo editor/arena contra esse snapshot.
`programFile` continua disponível para uma submissão específica futura: coloque
uma AST completa em `config/submissions`, indique seu nome JSON simples e
reinicie o backend. Essa submissão tem precedência sobre `opponentId`.
HARD permanece aguardando `config/submissions/hard.json`; não foi ativado com
um programa substituto. Programas inválidos impedem a inicialização.

A imagem de AraMoney fornecida pelo proprietário já está em
`public/projects/war-game/AraMoney.png` e foi configurada no card EASY.
A foto de Gabs fornecida pelo proprietário está em
`public/projects/war-game/gabs.jpeg` e foi aplicada ao card MEDIUM.
O card de AraMoney oferece apenas um convite para visitar `https://aramuni.dev/`,
sem anunciar dicas ou funcionalidades futuras de dicas.

O contador de Darwin está em `src/war/campaign.ts`, com a data fixa
**14/11/2026 às 10:47:53, Brasília** (48 horas após a referência desta atualização).
Ele aparece nas três experiências e atualiza dias, horas, minutos e segundos;
recarregar a página não reinicia o prazo. Ao chegar a zero, exibe que a contagem
terminou; não libera HARD automaticamente nem declara que uma nova submissão
foi disponibilizada. Altere somente `DARWIN_ARRIVAL_AT` para reagendar o anúncio.
A arte de Darwin continua vindo da sprite sheet original.

## Pontuação: decisão pendente, sem fórmula inventada

A inspeção de `game/`, `src/`, API e treinamento não encontrou uma política de
placar público. Pontos/recompensa do Darwin são fitness de treinamento e não
foram reutilizados como pontos do evento.

O exemplo obrigatório (4 derrotas + 1 vitória → Máquinas 2 / Humanidade 1) é
insuficiente para determinar uma função única. Foi solicitada a regra ao dono.
`config/scoring.json` permanece com `status: pending`; a interface mostra **—**
nos pontos e a pendência, enquanto os contadores de resultados são reais.
A resposta de cada partida informa `eventScore.pending: true` e deltas zero;
isso significa contribuição ainda não adjudicada, não ausência definitiva de pontos.

O módulo aceita três marcos crescentes para vitórias e três para derrotas, após
uma decisão explícita. Cada marco alcançado concede um ponto do respectivo lado,
com teto independente de três. A inicialização rejeita uma configuração que não
satisfaça o exemplo obrigatório. **Os marcos usados no teste são somente uma
fixture artificial para verificar esse mecanismo, não a política adotada.**
Se a regra desejada não puder ser expressa por marcos, edite somente `policy.ts`.

Ao definir a política, use um novo `id`, mantenha `capPerSide: 3`, configure os
marcos e um status explícito diferente de pending. Reinicie o servidor.
O agregado é recalculado dos resultados auditados usando a política ativa; as
respostas históricas preservam seu status/política na data da execução. Para
mudanças futuras de regra, decidir também se o evento deve reprocessar o histórico.
Os critérios de aceitação de **pontos efetivos** permanecem pendentes até essa
regra ser fornecida; não são declarados aprovados pela fixture.

## Persistência, identidade e integridade

`war-integration/data/event.sqlite` (ignorado pelo Git) é compartilhado por todos
os visitantes daquele backend. Pode configurar `EVENT_DB` com um caminho durável.
SQLite usa WAL, índices e transações `BEGIN IMMEDIATE`; resultados possuem uma
chave única `(participante, request_key)`. Repetir a mesma requisição retorna a
mesma partida; alterar conteúdo com a mesma chave é rejeitado. Em andamento,
a repetição não agenda outro worker. Cada identidade tem no máximo uma partida
oficial em preparação e cooldown de dois segundos para novas solicitações.

Cookie opaco aleatório de 256 bits, emitido pelo servidor, `HttpOnly`,
`SameSite=Strict`, um ano. Só o hash do segredo fica no banco. Um cookie
inventado não escolhe uma identidade existente. `COOKIE_SECURE=1` acrescenta
Secure quando houver HTTPS futuro. **Sem autenticação não há proteção contra
múltiplas identidades por exclusão de cookies, dispositivos ou navegadores.**
Participantes distintos aqui são identidades anônimas com ao menos um resultado
válido, não pessoas verificadas. Vencedores e derrotados são conjuntos que podem
se sobrepor. Empates incrementam somente empates e participação.

Somente `/api/game/battle` em modo event registra resultados produzidos pelo
worker do motor. O frontend não envia vencedor, pontos ou contagens. Campos
extras são rejeitados. O programa/oponente/versões são vinculados à chave da
requisição por hash. Partidas oficiais fixam 720 segundos no servidor, mesmo
que o cliente solicite um segundo. Ensaios e espectadores não gravam no placar.
Não existe endpoint de incremento de pontuação. O histórico guarda IDs, data,
oponente, hashes/versões, resultado, estatísticas e resposta/replay para idempotência.
Reinício marca reservas interrompidas como falhas, sem contá-las.

Somente **uma instância de backend** deve usar o arquivo SQLite: a recuperação
de reservas ao iniciar e o orçamento de workers são locais à instância. Para
escala horizontal será necessário coordenar jobs/limites e migrar a persistência.
Nunca apague o banco para reiniciar testes; os testes usam arquivos novos em `/tmp`.

## Limites e futura hospedagem

Corpo de até 1 MB; validador original com 2.000 nós, 32 níveis e 256 operações
por decisão; máximo de três workers compartilhados, 512 MB por worker e timeout
de 720 s reais. O mapa e as regras competitivas não foram alterados. As ASTs
são interpretadas; não há eval, shell ou execução de código do visitante.
Origem de POST validada, JSON obrigatório, sem CORS aberto. No desenvolvimento,
o proxy mantém Host/Origin. `PUBLIC_ORIGIN` permite fixar a origem autorizada em
um proxy futuro. Assets são servidos por whitelist; checkpoint, logs, input.txt,
banco e caminhos internos não possuem rotas públicas.

Hospedagem puramente estática atende a apresentação, mas não executa partidas
nem mantém o placar. Uma futura publicação exige processo Node 24 persistente,
disco durável para SQLite, proxy de mesma origem/HTTPS, limites operacionais e
backup do banco. Nada disso foi publicado nesta tarefa.

## Validação e limites deste ambiente

- Build React/Vite e TypeScript do frontend aprovados.
- Typecheck do backend e do motor integrado aprovados.
- 32 testes do portfólio, 38 do motor e seis da integração aprovados.
- Testes de integração usam os handlers HTTP reais em memória, SQLite real e
  workers reais. Cobrem execução oficial de 720 s, espectador de 720 s, determinismo,
  ASTs congeladas, associação dos dois captores da campanha, rejeição de programas inválidos, campos falsos e origem externa,
  exclusão de ensaios/espectadores do placar, idempotência e persistência após reabrir banco.
- Vitórias/derrotas reais do motor alimentam também os contadores de uma identidade
  em banco temporário; os pontos efetivos seguem pendentes da decisão de política.
- Há verificação sintática dos módulos JavaScript adaptados, integridade SHA-256
  da cópia e acesso aos assets/IDE pelos handlers.
- A fixture existente de colisão no teste do portfólio foi corrigida para atualizar
  também a referência de comunicado ao renomear um projeto; antes ela falhava
  por referência ausente antes de chegar à colisão que pretendia testar.

A validação inicial teve portas bloqueadas pelo sandbox e nenhum navegador disponível.
Na correção do comando `npm run dev`, o teste HTTP local foi autorizado e executado
com banco novo em `/tmp`: frontend, configuração, sessão, HTML/JS/assets da arena
e uma partida oficial de 720 segundos retornaram HTTP 200. A partida retornou
4.867 quadros e foi registrada somente no banco temporário. O proxy preserva Host
com `changeOrigin: false`, mantendo a validação de origem sem causar HTTP 403.

O comando principal agora inicia os dois serviços; a arena escolhe uma porta livre
para coexistir com o War Game original em 4173. O Vite recebe a porta efetiva.
A revisão visual desktop/mobile em navegador permanece pendente; não se afirma
conclusão dos critérios de pontos ainda sem política definida.
