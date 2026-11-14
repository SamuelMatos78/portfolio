import { useEffect, useRef, useState } from 'react';
export default function ArenaEmbed({mode,opponent,agentA,onResult}:{mode:'event'|'spectator';opponent:string;agentA?:string;onResult:()=>void}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height,setHeight]=useState(mode==='event'?2200:1250);
  const [loaded,setLoaded]=useState(false);
  const query = new URLSearchParams({mode,opponent,...(agentA?{agentA}:{})});
  const src = `/arena/?${query}`;
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
      if(event.data?.type==='code-arena-height'&&Number.isFinite(event.data.height))setHeight(Math.max(900,Math.min(12000,event.data.height+24)));
      if(event.data?.type==='code-arena-result')onResult();
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[onResult]);
  return <section className="war-embed" aria-label="Code Arena existente">
    <div className="war-embed__bar"><span>● CODE ARENA / {mode==='event'?'PROGRAME SEU EXÉRCITO':'PROGRAMAS CONGELADOS'}</span><a href={src} target="_blank" rel="noopener">Abrir arena em outra aba ↗</a></div>
    {!loaded&&<p role="status">Carregando editor e campo de batalha…</p>}
    <iframe ref={frame} key={src} src={src} title={mode==='event'?'Code Event — editor e batalha':'AI vs AI — simulação dos generais'} style={{height}} onLoad={()=>setLoaded(true)} />
  </section>;
}
