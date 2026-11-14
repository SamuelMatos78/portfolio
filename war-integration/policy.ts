export type ScorePolicy = { id: string; status: string; capPerSide: number; humanThresholds: number[] | null; machineThresholds: number[] | null };
export function contribution(wins: number, losses: number, policy: ScorePolicy) {
  if (policy.status === 'pending') return { humanity: 0, machines: 0, pending: true };
  const count = (n: number, thresholds: number[] | null) => {
    if (!thresholds || thresholds.length !== 3 || thresholds.some((v, i) => !Number.isSafeInteger(v) || v < 1 || (i > 0 && v <= thresholds[i - 1]!))) throw new Error('Política deve definir três marcos crescentes por lado.');
    return Math.min(3, thresholds.filter(v => n >= v).length);
  };
  if (policy.capPerSide !== 3) throw new Error('O limite por lado é três.');
  const humanity = count(wins, policy.humanThresholds), machines = count(losses, policy.machineThresholds);
  if (count(1, policy.humanThresholds) !== 1 || count(4, policy.machineThresholds) !== 2) throw new Error('Política não satisfaz o exemplo obrigatório: 4 derrotas + 1 vitória = Máquinas 2 / Humanidade 1.');
  return { humanity, machines, pending: false };
}
