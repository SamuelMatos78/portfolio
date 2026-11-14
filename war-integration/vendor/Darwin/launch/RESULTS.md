# Resultado — Operação Darwin

11/11/2026. Motor **1.3.1**, regras **1.3.0**, partidas reais com teto de **720 s simulados** e três workers. Configuração mantida: 200 candidatos, distribuição **40/60/40/40/20**, máximo de 600 blocos. Nenhuma recompensa foi acrescentada nesta missão.

## Entrega

- [Ancestral militar de 13 blocos](military-seed.json), com economia enquanto desarmado, patrulha, aproximação e ataque explícito. [Referência menor de 11 blocos](military-ancestor.json), validada e submetida a remoção individual das instruções.
- [Campeão evoluído de 15 blocos](best.json), descoberto por **LOGICALS, candidato 21 da geração 1**. O operador criou um UNTIL envolvendo aproximação/ataque. A população e o RNG foram reproduzidos integralmente; [genealogia](evidence/generation1-lineage.json).
- [Checkpoint da geração 2](seeded-champions.json), com campeão, 200 genomas, fitness disponível, RNG e snapshots das três sementes. Reabertura confirmada em [recovery.json](evidence/recovery.json).
- [42 partidas de benchmark](evidence/benchmark.json), [populações geradas](evidence/seeded-populations.json) e [log de treinamento](seeded-training.log).

## Execução comprovada

Contra WAIT, o ancestral de 13 blocos coletou madeira/minério, concluiu armaria, fabricou/equipou sete soldados, atravessou o mapa, detectou os dez adversários e venceu nos dois lados. Causou **dez incapacitações ligadas a ataques explícitos e seis mortes** por partida, em 276 / 214 s. [Eventos e recursos](evidence/seed-validation.json).

O descendente repetiu essas etapas e venceu em **214,43 / 172,86 s**, com **dez incapacitações diretas e quatro mortes** por partida. A vitória encerrou o sangramento restante. A engine não tem HP numérico: o dano é comprovado pelo ataque ao soldado e sua incapacitação no prazo de resolução daquele combate. [Execução do descendente](evidence/generation1-military.json).

| Geração principal | Candidatos | Partidas API | Tempo local | Até fitness completo / poda / inconclusivos | Pais / sementes injetadas |
|---|---:|---:|---:|---:|---:|
| 1 | 200 | 822 | 282,53 s | 4 / 196 / 0 | 0 / 3 |
| 2 | 200 | 1087 | 493,76 s | 0 / 200 / 0 | 200 / 0 |

A primeira geração promoveu o descendente; a segunda preservou-o. A poda interrompe avaliações que já pioraram um adversário em relação ao melhor atual. Esses genomas continuam salvos, com `score: null` quando não há fitness completo, disponíveis como material genético. O painel passou de cinco para seis adversários; médias de recompensa entre essas gerações têm bases diferentes.

## Comparação independente

Cada programa enfrentou WAIT, ancestral, campeão anterior, Claude, Astra, Gemini e Evil Darwin, nos dois lados: **14 partidas por programa, zero inconclusivas**.

| Programa | Vitórias / empates / derrotas | Vitórias | Incapacitações médias, total / diretas | Mortes inimigas médias | Sobrevivência | Equipados por partida |
|---|---:|---:|---:|---:|---:|---:|
| Anterior, checkpoint 44 | 0 / 12 / 2 | 0% | 1,07 / 0 | 1,07 | 79,3% | 8,79 |
| Ancestral militar, 13 blocos | 3 / 9 / 2 | 21,4% | 5,79 / 4,36 | 5,00 | 37,1% | 8,64 |
| Descendente, 15 blocos | 4 / 9 / 1 | **28,6%** | 5,50 / 4,71 | 4,43 | 42,9% | 8,86 |

Equipados conta soldados que receberam equipamento durante a partida; sobrevivência inclui vivos incapacitados. Há progresso observado nesse painel determinístico, sem demonstração de superioridade universal. O descendente ainda perde para Evil Darwin como A e transformou a vitória do ancestral contra Gemini como A em empate. O campeão econômico anterior preserva mais sobreviventes. Semente 7 controla a genética; o motor usa seu mapa determinístico, sem sorteio de mapas.

## Alterações e validação

O treinamento aceita `--ancestor` e `--opponent`, persiste a população e escolhe pais por torneios de três. Metade de RANDOMS mantém genomas independentes. Os genes das sementes são mutáveis/removíveis; snapshots servem de benchmark e recuperação. A gravação de campeão/pool/RNG é atômica.

Foi corrigido um HTTP 500 real ao cancelar uma tarefa de movimento durante chegadas simultâneas com combate. Também foram eliminadas consultas desnecessárias de visibilidade e reutilizadas falhas de caminho somente enquanto seus bloqueios permanecem iguais. Replays comparados coincidiram; duração, orçamento de operações e regras competitivas foram preservados.

**54 testes Python passaram com HTTP real, sem omissões; os oito arquivos de testes do motor e `typecheck` passaram.** Logs em [evidence](evidence/). A suíte inclui execução militar, mutabilidade, múltiplas seeds, combinação de dependências, reparo, rejeição de inválidos, elitismo, falhas atômicas e retomada determinística.

O histórico original `Darwin/champions.json` foi preservado: 45 registros, numerados 0–44. Uma cópia está em [previous-champions.json](evidence/previous-champions.json).

## Continuar

Reinicie a API existente com `npm run dev` para carregar o motor 1.3.1. Depois:

```sh
npm run darwin -- --generations 1 --seed 7 --workers 3 \
  --champions Darwin/launch/seeded-champions.json
```

Os comandos para iniciar uma campanha nova, validar e repetir o benchmark estão no [README](README.md). O checkpoint de entrega está separado do histórico anterior.
