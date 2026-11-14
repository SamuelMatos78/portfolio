Adicione aqui `easy.json`, `medium.json` e `hard.json` como programas AST completos
(`schemaVersion: 1`, `body: [...]`). Não são executados como JavaScript.

Depois altere `programFile` em `../challenges.json` para o nome correspondente e
reinicie o backend. Arquivos não configurados não ficam disponíveis publicamente.
A inicialização valida os programas com o validador original do jogo.

Não copie um checkpoint de treinamento completo: use somente a AST do programa.
