export const CATEGORIES = { economy: "Economia", equipment: "Equipamento", combat: "Combate", transport: "Resgate", conditions: "Condições", control: "Controle", movement: "Movimento", selection: "Alvos e percepção" };

const INFO = {
  10: ["Coletar madeira", "Entrega 3 unidades de madeira à equipe ao concluir 4 segundos de coleta.", "Vá até a floresta antes de coletar."],
  11: ["Coletar minério", "Entrega 2 unidades de minério à equipe ao concluir 5 segundos de coleta.", "Vá até a mina antes de coletar."],
  12: ["Construir armaria", "Constrói a armaria da equipe em 12 segundos. Custo: 12 madeira e 8 minério.", "Vá ao local da armaria e tenha recursos disponíveis."],
  13: ["Construir enfermaria", "Constrói a enfermaria em 10 segundos. Custo: 10 madeira e 5 minério.", "Vá ao local da enfermaria antes de construir."],
  20: ["Equipar espada", "Fabrica e equipa uma espada em 4 segundos. Custo: 2 madeira e 4 minério.", "Precisa estar perto da armaria construída."],
  21: ["Equipar lança", "Fabrica e equipa uma lança em 5 segundos. Custo: 4 madeira e 2 minério.", "Precisa estar perto da armaria construída."],
  22: ["Equipar machado", "Fabrica e equipa um machado em 6 segundos. Custo: 3 madeira e 5 minério.", "Precisa estar perto da armaria construída."],
  23: ["Trocar equipamento", "Escolhe a nova arma a fabricar e equipar, pagando o custo correspondente.", "Selecione a arma e vá à armaria."],
  30: ["Atacar alvo", "Inicia um ataque de 5 segundos contra o inimigo selecionado.", "Exige arma, alvo inimigo e adjacência cardinal."],
  31: ["Buscar e atacar um tipo de arma", "Localiza um inimigo visível com a arma escolhida, aproxima-se e tenta atacar.", "A ordem composta mantém o destino escolhido ao começar."],
  32: ["Manter posição", "Permanece em guarda no local atual.", "Um soldado armado pode se defender quando atacado."],
  33: ["Proteger aliado", "Aproxima-se do aliado selecionado e permanece em guarda.", "Proximidade não coloca o soldado automaticamente em um ataque."],
  34: ["Proteger construção", "Aproxima-se de uma construção aliada e permanece em guarda."],
  35: ["Recuar", "Tenta afastar o soldado dos inimigos visíveis."],
  36: ["Atacar construção", "Ataca a construção inimiga selecionada por 3 segundos, removendo 1 de integridade.", "Exige arma e adjacência. Não desgasta a arma."],
  37: ["Buscar e destruir construção", "Escolhe uma construção inimiga visível, aproxima-se e tenta atacá-la."],
  40: ["Pegar incapacitado", "Tenta pegar um incapacitado adjacente em 2 segundos.", "A contagem de morte pausa ao concluir a ação de pegar."],
  41: ["Soltar incapacitado", "Solta o personagem transportado em 1 segundo.", "Ao soltar, a contagem de morte retoma com o tempo restante."],
  42: ["Tratar aliado", "Trata um aliado incapacitado em 8 segundos, seguidos de 2 de recuperação.", "Exige proximidade da enfermaria e do aliado. Solte quem estiver carregando."],
  43: ["Buscar e resgatar aliado", "Aproxima-se de um aliado incapacitado observável e tenta pegá-lo."],
  44: ["Buscar e capturar inimigo", "Aproxima-se de um inimigo incapacitado observável e tenta pegá-lo."],
  45: ["Buscar incapacitado mais próximo", "Aproxima-se de um incapacitado observável e tenta pegá-lo, de qualquer equipe."],
  50: ["Existe inimigo visível?", "Verdadeiro quando há um inimigo apto dentro da visão."],
  51: ["Existe aliado incapacitado?", "Verdadeiro quando há um aliado incapacitado visível."],
  52: ["Estou desarmado?", "Verdadeiro quando o próprio soldado está sem arma."],
  53: ["Minha arma é espada?", "Verifica se o soldado usa uma espada."],
  54: ["Minha arma é lança?", "Verifica se o soldado usa uma lança."],
  55: ["Minha arma é machado?", "Verifica se o soldado usa um machado."],
  56: ["A armaria existe?", "Verifica se a equipe possui uma armaria ativa."],
  57: ["A enfermaria existe?", "Verifica se a equipe possui uma enfermaria ativa."],
  58: ["Há recursos suficientes?", "Compara o saldo compartilhado com o custo de uma arma ou construção.", "A condição não reserva os recursos; outros soldados podem consumi-los."],
  59: ["Número de aliados", "Expressão numérica com a quantidade de aliados mutuamente visíveis.", "Use como valor de uma comparação, não como condição booleana."],
  60: ["Número de inimigos", "Expressão numérica com a quantidade de inimigos mutuamente visíveis.", "Use como valor de uma comparação."],
  61: ["O alvo está desarmado?", "Consulta o equipamento conhecido do alvo selecionado."],
  62: ["A arma tem um uso restante?", "Verifica se a durabilidade da arma está em um uso."],
  63: ["Estou perto da armaria?", "Verifica se o soldado está perto de sua armaria ativa."],
  64: ["Estou carregando alguém?", "Verdadeiro quando o soldado transporta um incapacitado."],
  65: ["O alvo usa espada?", "Consulta se o alvo selecionado usa espada."],
  66: ["O alvo usa lança?", "Consulta se o alvo selecionado usa lança."],
  67: ["O alvo usa machado?", "Consulta se o alvo selecionado usa machado."],
  68: ["Aliado visível usa a arma?", "Verifica se algum aliado visível usa a arma escolhida.", "Sem filtro, verifica a presença de qualquer arma."],
  69: ["Estou perto do alvo?", "Verifica se o alvo selecionado está adjacente."],
  70: ["Se / senão", "Executa o primeiro grupo quando a condição for verdadeira e o segundo quando for falsa."],
  71: ["Grupo de instruções (ELSE)", "Agrupa instruções no campo body do bloco legado ELSE.", "Para uma alternativa condicional, prefira a área Senão de um bloco Se."],
  72: ["Repetir para sempre", "Repete os blocos internos durante a partida."],
  73: ["Repetir até", "Repete os blocos até a condição escolhida ficar verdadeira."],
  74: ["Enquanto", "Executa os blocos enquanto a condição permanecer verdadeira."],
  75: ["Sair do loop", "Encerra o loop mais interno."],
  76: ["Próxima repetição", "Pula para a próxima repetição do loop mais interno."],
  77: ["Esperar", "Espera a duração escolhida antes de continuar.", "Aceita de 0 a 180 segundos, em múltiplos de 1/14 segundo."],
  80: ["Mover para cima", "Move a quantidade escolhida de células para cima."],
  81: ["Mover para baixo", "Move a quantidade escolhida de células para baixo."],
  82: ["Mover para a esquerda", "Move a quantidade escolhida de células para a esquerda."],
  83: ["Mover para a direita", "Move a quantidade escolhida de células para a direita."],
  84: ["Mover em direção ao alvo", "Percorre até a quantidade escolhida de células em direção ao alvo conhecido."],
  85: ["Ir à armaria", "Vai à armaria da equipe ou ao local reservado para construí-la.", "Construir e equipar são comandos separados."],
  86: ["Ir à enfermaria", "Vai à enfermaria da equipe ou ao local reservado para construí-la."],
  87: ["Ir à floresta", "Vai até a área de coleta da floresta da equipe.", "Adicione Coletar madeira depois deste comando."],
  88: ["Ir à mina", "Vai até a área de coleta da mina da equipe.", "Adicione Coletar minério depois deste comando."],
  89: ["Ir ao aliado", "Aproxima-se do aliado visível mais próximo e o seleciona."],
  90: ["Ir ao inimigo", "Aproxima-se de um inimigo visível ou anteriormente observado.", "Não revela inimigos desconhecidos fora da visão."],
  91: ["Ir ao incapacitado", "Aproxima-se de um incapacitado observável."],
  92: ["Ir à construção inimiga", "Aproxima-se de uma construção inimiga visível e a seleciona."],
  93: ["Parar movimento", "Interrompe o deslocamento atual."],
  100: ["Selecionar inimigo mais próximo", "Escolhe como alvo o inimigo visível apto mais próximo."],
  101: ["Selecionar aliado mais próximo", "Escolhe como alvo o aliado visível apto mais próximo."],
  102: ["Selecionar incapacitado mais próximo", "Escolhe como alvo o incapacitado visível mais próximo."],
  103: ["O alvo é aliado?", "Verifica a equipe do alvo selecionado."],
  104: ["O alvo é inimigo?", "Verifica se o alvo selecionado pertence ao adversário."],
  105: ["O alvo está incapacitado?", "Consulta o estado conhecido do alvo selecionado."],
  106: ["Comparar número de aliados", "Compara aliados mutuamente visíveis com um número ou outra contagem."],
  107: ["Comparar número de inimigos", "Compara inimigos mutuamente visíveis com um número ou outra contagem."],
  108: ["O alvo é construção?", "Verifica se o alvo selecionado é uma construção."],
  109: ["Existe inimigo incapacitado?", "Verifica se existe um inimigo incapacitado visível."],
};

export const CONDITION_IDS = [...Array.from({ length: 9 }, (_, n) => n + 50), ...Array.from({ length: 9 }, (_, n) => n + 61), 103, 104, 105, 106, 107, 108, 109];
export function commandInfo(id) { const [title, description, tip] = INFO[id] ?? [`Comando ${id}`, "", ""]; return { title, description, tip: tip ?? "" }; }
export function isCondition(id) { return CONDITION_IDS.includes(id); }
export function isInstruction(id) { return !isCondition(id) && id !== 59 && id !== 60; }
export const WEAPONS = [["sword", "Espada"], ["spear", "Lança"], ["axe", "Machado"]];
export const COMPARATORS = [["eq", "Igual a"], ["neq", "Diferente de"], ["gt", "Maior que"], ["gte", "Maior ou igual a"], ["lt", "Menor que"], ["lte", "Menor ou igual a"]];

export function defaultNode(id) {
  if (!Object.hasOwn(INFO, id)) throw new Error("Comando desconhecido.");
  const node = { op: id };
  if (id === 70) Object.assign(node, { condition: { op: 50 }, then: [], else: [] });
  else if ([71, 72].includes(id)) node.body = [];
  else if ([73, 74].includes(id)) Object.assign(node, { condition: { op: 50 }, body: [] });
  else if (id === 77) node.seconds = 1;
  else if ([23, 31, 68].includes(id)) node.weapon = "sword";
  else if (id === 58) node.item = "armory";
  else if ([106, 107].includes(id)) Object.assign(node, { comparator: "gte", value: 2 });
  else if (id >= 80 && id <= 84) node.steps = 1;
  return node;
}

export function commandTemplate(block, catalog) {
  const names = new Map(catalog.map((entry) => [entry.id, entry.alias]));
  const convert = (value) => Array.isArray(value) ? value.map(convert) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === "op" ? names.get(child) ?? child : convert(child)])) : value;
  return convert(defaultNode(block.id));
}
