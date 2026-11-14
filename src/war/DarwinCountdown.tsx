import { useEffect, useState } from 'react';
import { DARWIN_ARRIVAL_AT, darwinCountdown } from './campaign';

const arrivalLabel = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
}).format(new Date(DARWIN_ARRIVAL_AT));

export default function DarwinCountdown() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);
  const remaining = darwinCountdown(now);
  const values = [[remaining.days, 'DIAS'], [remaining.hours, 'HORAS'], [remaining.minutes, 'MIN'], [remaining.seconds, 'SEG']] as const;
  return <section className="war-countdown" aria-labelledby="darwin-arrival-title">
    <div>
      <p className="eyebrow">TRANSMISSÃO DO COMANDO / DARWIN</p>
      <h2 id="darwin-arrival-title">{remaining.arrived ? 'A contagem terminou.' : 'Darwin aparece em'}</h2>
      <p>{remaining.arrived ? 'Aguarde a ordem do Dono do Domínio para o próximo movimento.' : 'Os captores já estão em campo. O general está a caminho.'}</p>
      <time dateTime={DARWIN_ARRIVAL_AT}>Chegada anunciada: {arrivalLabel} · Brasília</time>
    </div>
    <div className="war-countdown__clock" role="timer" aria-label="Tempo restante para a chegada de Darwin" aria-live="off">
      {values.map(([value, label]) => <div key={label}><b>{String(value).padStart(2, '0')}</b><span>{label}</span></div>)}
    </div>
  </section>;
}
