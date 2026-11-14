// Quatro dias após o anúncio de 12/11/2026, 10:47:53, no horário de Brasília.
// Uma data fixa impede que atualizar a página reinicie a contagem.
export const DARWIN_ARRIVAL_AT = '2026-11-16T10:47:53-03:00';

export function darwinCountdown(now: number, arrival = Date.parse(DARWIN_ARRIVAL_AT)) {
  const totalSeconds = Math.max(0, Math.ceil((arrival - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
    arrived: totalSeconds === 0,
  };
}
