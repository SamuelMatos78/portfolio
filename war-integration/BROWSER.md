# Code Arena no navegador

O frontend e a Arena funcionam em hospedagem estática. Não é necessário configurar
Node, SQLite ou um proxy de API em produção.

- Desenvolvimento: `npm run dev`.
- Compilação: `npm run build`.
- Prévia: `npm run preview`.
- Na Vercel: diretório raiz `portfolio`, comando `npm run build`, saída `dist`.

O plugin `browser-plugin.ts` prepara o HTML e os assets da Arena a partir da cópia
original do jogo. Esses arquivos gerados são ignorados pelo Git. O Vite compila
duas entradas (o site e a Arena) e o worker com o mesmo motor determinístico.
Nenhuma chamada HTTP de API é necessária para validar ou executar estratégias.

As partidas da campanha têm 720 segundos simulados. Ensaios têm 30 segundos;
o modo espectador aceita até 720 segundos. O cálculo roda em um Web Worker
encerrado ao terminar, falhar ou exceder o tempo de preparação.

Vitórias, derrotas, empates e missões vencidas ficam no localStorage da mesma
origem, compartilhado entre a página e o iframe. Só as partidas da campanha
entram no histórico; ensaios, espectadores e replays não contam. Vencer uma
missão libera a seguinte. A submissão oficial de Evil Darwin ainda precisa
ser fornecida; o contador não cria essa estratégia automaticamente.

O placar é pessoal, local e editável pelas ferramentas do navegador. Não representa
participantes globais ou resultados auditados. Limpar os dados do site apaga o
histórico. Se o navegador bloquear o armazenamento, os resultados duram apenas
na memória da página que executou a partida.

No Code Event, o código adversário fica oculto na interface. Na Code Arena,
os programas dos dois generais são exibidos. Como o cálculo é local, as
estratégias estão nos arquivos do worker e podem ser inspecionadas; não há
sigilo real nem proteção contra alteração local da progressão.
