# Code War — Humanidade × Máquinas

Browser game local de estratégia por código. Você escreve um programa JSON para
os dez humanos e escolhe uma estratégia congelada para enfrentar.

## Jogar no navegador

Com Node 22.6 ou superior, execute na pasta do projeto:

```sh
npm run dev
```

Abra `http://127.0.0.1:4173`:

1. Escolha Claude, Astra, Gemini ou Evil Darwin.
2. Na IDE, edite/importe JSON ou use **Blocos visuais**. O rascunho é salvo neste navegador.
3. Valide a sintaxe e use **Testar código** para executar um ensaio de 30 segundos.
4. Escolha a duração, de 1 a 720 segundos, e clique em **Iniciar confronto**.
5. Acompanhe os soldados com sprites, recursos, construções e diário de batalha.
   Use pausa e velocidades de **1×, 2×, 3× ou 4×**. O mapa permite zoom, arraste e
   inspeção de unidades; a lista de tropas também permite selecionar soldados.

Em 1×, um segundo de batalha dura um segundo real. Nove minutos de batalha
duram nove minutos em 1×, quatro minutos e meio em 2× e dois minutos e quinze
em 4×. A velocidade usa tempo decorrido, independentemente da quantidade de quadros.
Uma vitória por eliminação pode encerrar a partida antes do limite.

O código dos humanos fica congelado ao iniciar. Os adversários são snapshots
validados no servidor, com hashes de programa; o browser escolhe o ID do vilão,
e o servidor usa o snapshot correspondente. Evil Darwin é a build fixa
**Sentinel 01**, uma estratégia local de coleta, armamento e avanço.

O servidor prepara os confrontos em workers e o navegador apresenta a linha do
tempo do motor em tempo real. Cada aba mantém seu próprio confronto e editor.
As partidas e o rascunho são locais; esta versão ainda não oferece contas ou
salas com múltiplos jogadores.

Arte e sprites estão em [`game/assets/`](game/assets/). Os prompts usados para
gerar os três arquivos estão em [`game/assets/PROMPTS.md`](game/assets/PROMPTS.md).

## IDE e comandos

A central de estratégias ocupa toda a largura da página, com fonte ajustável
de 14 a 20 px, destaque de sintaxe, numeração de linhas, indentação e modo ampliado.
Use `Ctrl+Enter` para validar, `Ctrl+Shift+F` para formatar e `Ctrl+S` para salvar
o rascunho no browser. Importação, exportação, testes e início de batalha usam
o mesmo programa em ambos os modos de edição.

Em **Blocos visuais**, adicione ações pelos menus ou pelos cartões da biblioteca.
Escolha condições, armas, quantidades e comparações pelos controles. Loops e
blocos Se/Senão aceitam grupos internos. Mova blocos pelas setas ou arraste
entre grupos; também há duplicação, remoção, desfazer e refazer. O JSON é
sincronizado a cada mudança. Um JSON inválido precisa ser corrigido antes da
conversão para blocos, para preservar o código do jogador.

A biblioteca mostra os 74 comandos com nomes e explicações em português,
pré-requisitos, exemplos copiáveis, busca e filtro por categoria.

## API para treinamento de IAs

Com o servidor iniciado, envie dois códigos para **`POST /api/v1/battles`**:

```sh
curl http://127.0.0.1:4173/api/v1/battles \
  -H 'Content-Type: application/json' \
  --data-binary @api/example-request.json
```

O corpo recebe `programA`, `programB` e `maxSeconds` opcional (de 1 a 720).
A resposta contém `winner` (`A`, `B` ou `DRAW`), duração, métricas e contagens
finais em `teams.A` e `teams.B`: `alive`, `active`, `incapacitated`, `dead`,
`armed` e `unarmed`. Vivos incluem incapacitados; equipamento considera apenas
os vivos. Os resultados não incluem quadros de replay e executam em velocidade
de processamento, independentemente do acelerador visual.

Documentação no browser: `http://127.0.0.1:4173/api-docs`.
Veja [`api/README.md`](api/README.md) para exemplos em Python, requisições com
arquivos reais e os limites do serviço, ou use o contrato [`api/openapi.json`](api/openapi.json).

## Motor determinístico

TypeScript engine for deterministic, event-driven battles. The core has no DOM,
network, database, frontend, or Darwin dependency. Node 22.6+ can run the source
directly; the exported types and JSON schemas can be consumed by a React or
Vercel application.

## Commands

`BLOCK_CATALOG` contains the 74 published IDs. Each block keeps its `symbol`
and adds a stable English `alias` and readable `nameEn`. Use
`resolveBlockId(name)` to map IDs, symbols, aliases, or English labels to a
published ID. `parseProgram` accepts those names in `op`, validates the JSON,
and normalizes it to numeric IDs. `serializeProgram` always emits canonical
numeric operations.

```ts
import { parseProgram, simulate } from "./src/index.ts";

const program = parseProgram({
  schemaVersion: 1,
  body: [{ op: "repeat_forever", body: [{ op: "wait", seconds: 1 }] }],
});
const result = simulate(program, program, { telemetry: "summary" });
```

See [`examples/basic.json`](examples/basic.json) for a canonical program and
[`examples/english-alias-input.json`](examples/english-alias-input.json) for
an importable English-name program.

`PROGRAM_JSON_SCHEMA` describes the canonical numeric format.
`PROGRAM_IMPORT_JSON_SCHEMA` also lists the published symbols, aliases, and
English labels for imported operations. The validator and normalizer reject
unknown operations; neither runs JavaScript. The generated [`schema.json`](schema.json)
documents all command forms and accepts numeric IDs, Portuguese symbols, and
English aliases/names. Regenerate it after catalog changes with `npm run schema:export`.

## Simulation rules and defaults

- 100×100 cells, ten soldiers per team, zero starting resources, and no
  default obstacles. Team B starts as the horizontal mirror of team A.
- A forest and mine, plus reserved armory and hospital build sites, are placed
  symmetrically in each team's territory. `GO_FOREST` and `GO_MINE` navigate to
  the resource area (Manhattan radius 3); collecting is a separate command.
- Movement is cardinal at 3.5 cells/s, or 2 cells/s while carrying. One normal
  tile costs 4 ticks; carrying a downed soldier costs 7 ticks. One second is 14 ticks and each engagement resolves
  after 70 ticks.
- Incapacitated soldiers have 30 seconds of uncarried time before death. The
  countdown pauses when pickup completes, stays paused throughout transport,
  and resumes with the remaining time when the soldier is dropped. If the
  carrier is incapacitated, the passenger is dropped and its countdown resumes.
- Resources are reserved per team and simultaneous requests are atomic. If
  the batch exceeds the shared balance, that batch is denied symmetrically.
  Interrupted construction and equipment actions return their reservations;
  interrupted collection produces nothing.
- A compound movement command fixes its target when it starts. It uses the
  same path, collision, and movement timing as manual movement.
- Melee groups merge when attacks connect through a shared participant.
  Combat uses the v1.1 type-coverage rule and resolves all participants at once.
- `telemetry: "replay"` is the only mode that returns detailed events.
  `none`, `summary`, and `training` do not retain replay logs.
- Pass `debug: true` to `simulate()` to also return compact position snapshots
  in `debugFrames`; this is disabled by default.

The battle clock stops at 180 seconds by default. Set `maxSeconds` to any
non-negative duration aligned to the simulation tick (1/14 second) to choose a
different length, including durations longer than the competition default. Pass `obstacles` as cell
coordinates to create opaque, impassable terrain. The built-in scenario IDs
are `default` and `open` (both use the same symmetric starting layout).
`reference-combat-protection` and `reference-combat-duel` are controlled test
fixtures for the published reinforcement example. Those fixtures pre-equip
only their test participants; ordinary scenarios start every soldier unarmed.

## Public API

See [src/index.ts](src/index.ts) for exports. The main entry points are:

- `simulate(programA, programB, options?)`
- `validateProgram(program)` and `parseProgram(input)`
- `BLOCK_CATALOG`, `resolveBlockId()`, and the two exported JSON Schemas
- `serializeProgram()`, `hashProgram()`, and `hashReplay()`
- `RULESET`, `ENGINE_VERSION`, and `resolveCombatOutcome()`

`SimulationResult.eventCount` reports logical events in every telemetry mode;
only replay mode includes the detailed `events` array.

## Local debug view

Run `npm run debug` and open `http://127.0.0.1:4173/debug`. The page accepts a JSON
program for each team, runs the simulation locally, and shows soldiers as blue
and red dots. Use the slider or play/pause controls to inspect positions and
unit states over time. Forests and mines have labeled map markers; built
armories and hospitals appear with their current health. The default inputs are
the two examples in `examples/`.
To load and run two JSON files from `llms/`, pass their paths after `--`:

```sh
npm run debug -- llms/gpt6-astra-v1.1.min.fixed.json llms/claude-sonnet5.5-extra.fixed.json
```

At `/debug`, these programs load and simulate automatically. In the main game
at `/`, the first program initializes the human editor and the second becomes
the selected frozen opponent; the player starts the confrontation explicitly.
The game has a nine-minute limit. The technical viewer keeps arbitrary durations.

## Development

```sh
npm install
npm test
npm run typecheck
npm run bench -- 30
```

Tests use Node's built-in test runner and do not require a third-party runtime
package. The benchmark reports match throughput, mean, P95, replay event count,
and heap delta for summary and replay telemetry.
