import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { BLOCK_CATALOG, ENGINE_VERSION, RULESET_VERSION, parseProgram, hashProgram } from './vendor/src/index.ts';
import { loadVillains, freezeVillain } from './vendor/game/villains.ts';
import { readableStarter } from './vendor/game/strategies.ts';
import { runMatch, ArenaBusyError, MatchTimeoutError } from './vendor/game/matches.ts';
import { EventStore } from './store.ts';
import type { ScorePolicy } from './policy.ts';
import { adaptArena } from './arena-adapter.ts';
const root = dirname(fileURLToPath(import.meta.url));
const spectatorIds = new Set(['claude', 'astra', 'gemini']);
export async function createArena(database = process.env.EVENT_DB ?? resolve(root, 'data/event.sqlite')) {
  await mkdir(dirname(database), { recursive: true });
  const policy = JSON.parse(await readFile(resolve(root,'config/scoring.json'),'utf8')) as ScorePolicy;
  const store = new EventStore(database, policy); store.recover();
  const agents = new Map(await loadVillains());
  // Training fixtures and Sentinel are not official event submissions.
  agents.delete('evil-darwin');
  for (const [id, name] of [['claude', 'Claude Sonnet'], ['astra', 'GPT / Astra']] as const) {
    const agent = agents.get(id)!;
    agents.set(id, freezeVillain({ ...agent, name }, agent.program));
  }
  type Challenge = {id:string;name:string;objective:string;programFile:string|null;opponentId?:string|null;image:string|null};
  const challenges = JSON.parse(await readFile(resolve(root,'config/challenges.json'),'utf8')) as Challenge[];
  for (const c of challenges) if (c.programFile) {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(c.programFile)) throw new Error('Use apenas um nome JSON dentro de config/submissions/.');
    agents.set(c.id, freezeVillain({id:c.id,name:c.name,title:'Submissão oficial',description:c.objective,color:'#df9b78'},parseProgram(JSON.parse(await readFile(resolve(root,'config/submissions',c.programFile),'utf8')))));
  }
  const challengeOpponent = (c: Challenge) => agents.get(c.programFile ? c.id : c.opponentId ?? c.id);
  for (const c of challenges) if (c.opponentId && !challengeOpponent(c)) throw new Error(`Adversário da campanha indisponível: ${c.id}.`);
  const publicAgent = ({id,name,title,description,color,hash}: (typeof agents extends Map<string,infer T> ? T : never)) => ({id,name,title,description,color,hash,optionalBoss:spectatorIds.has(id)});
  const staticFiles = new Map<string,{file:string;type:string}>();
  for (const name of ['index.html','game.js','game.css','ide.css','playback.js','ide.js','strategy-language.js','commands.js','block-model.js','block-editor.js']) staticFiles.set('/arena/'+(name === 'index.html' ? '' : name), {file:'game/'+name,type:name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript'});
  for (const name of ['battlefield','troops','locations']) staticFiles.set('/arena/assets/'+name+'.png',{file:'game/assets/'+name+'.png',type:'image/png'});
  staticFiles.set('/arena/schema.json',{file:'schema.json',type:'application/json'});
  const cooldown = new Map<string,number>();
  const server = createServer(async(req,res) => {
    const url = new URL(req.url ?? '/', 'http://localhost'), path = url.pathname;
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    const json = (status:number,value:unknown) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
    try {
      if (req.method === 'GET' && staticFiles.has(path)) {
        const entry = staticFiles.get(path)!;
        const data = await readFile(resolve(root,'vendor',entry.file));
        res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'");
        res.writeHead(200,{'Content-Type':entry.type+'; charset=utf-8'}).end(entry.type === 'image/png' ? data : adaptArena(data.toString(),entry.file.split('/').pop()!)); return;
      }
      if(req.method === 'GET' && path === '/api/event/session') {const identity=store.identity(req.headers.cookie);if(identity.cookie)res.setHeader('Set-Cookie',identity.cookie);json(200,{anonymous:true});return;}
      if(req.method === 'GET' && path === '/api/event/health') {json(200,{status:'ok',engineVersion:ENGINE_VERSION});return;}
      if(req.method === 'GET' && path === '/api/event/scoreboard') {json(200,store.scoreboard());return;}
      if(req.method === 'GET' && path === '/api/event/progress') {const identity=store.identity(req.headers.cookie);if(identity.cookie)res.setHeader('Set-Cookie',identity.cookie);const clearedChallengeIds=challenges.filter(c=>{const opponent=challengeOpponent(c);return !!opponent&&store.hasWonAgainst(identity.id,opponent.id);}).map(c=>c.id);const unlockedChallengeIds=challenges.filter((c,index)=>index===0||clearedChallengeIds.includes(challenges[index-1].id)).map(c=>c.id);json(200,{clearedChallengeIds,unlockedChallengeIds});return;}
      if(req.method === 'GET' && path === '/api/event/config') {json(200,{agents:[...agents.values()].map(publicAgent),challenges:challenges.map(c=>({...c,programFile:undefined,opponentId:challengeOpponent(c)?.id ?? null,opponentName:challengeOpponent(c)?.name ?? null,available:!!challengeOpponent(c)})),engineVersion:ENGINE_VERSION,rulesetVersion:RULESET_VERSION,seedSupported:false,scoring:policy});return;}
      if(req.method === 'GET' && path === '/api/game/config') {
        const spectator = url.searchParams.get('mode') === 'spectator';
        const selected = url.searchParams.get('opponent') ?? 'claude';
        if (!agents.has(selected)) throw new TypeError('Adversário indisponível.');
        const a = agents.get(url.searchParams.get('agentA') ?? 'claude');
        if (spectator && !a) throw new TypeError('General indisponível.');
        if (spectator && (!spectatorIds.has(a!.id) || !spectatorIds.has(selected))) throw new TypeError('O modo espectador está disponível apenas para as submissões de LLMs publicadas.');
        const visibleAgent = {...agents.get(selected)!} as Record<string,unknown>;
        if(!spectator) delete visibleAgent.program;
        json(200,{villains:[visibleAgent],selectedVillain:selected,starter:spectator?a!.program:readableStarter(),hasInitialPrograms:spectator,agentAName:a?.name,catalog:BLOCK_CATALOG,maxSeconds:720,tickRate:14,engineVersion:ENGINE_VERSION,rulesetVersion:RULESET_VERSION,scoringPending:policy.status==='pending'});return;
      }
      if(req.method !== 'POST' || !['/api/game/validate','/api/game/test','/api/game/battle'].includes(path)) {json(404,{error:'Rota não disponível.'});return;}
      const expectedOrigin = process.env.PUBLIC_ORIGIN ?? `http://${req.headers.host}`;
      if ((req.headers.origin && req.headers.origin !== expectedOrigin) || req.headers['sec-fetch-site'] === 'cross-site') {json(403,{error:'Origem não permitida.'});return;}
      if(!req.headers['content-type']?.startsWith('application/json')) {json(415,{error:'Envie application/json.'});return;}
      const input = JSON.parse(await body(req)) as Record<string,unknown>;
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Envie um objeto JSON.');
      const allowed = path.endsWith('/validate') ? ['program'] : path.endsWith('/test') ? ['program','villainId'] : ['program','villainId','durationSeconds','mode','agentA','requestKey'];
      if(Object.keys(input).some(k=>!allowed.includes(k))) throw new TypeError('Campo não permitido. O resultado é calculado pelo motor.');
      const spectator = input.mode === 'spectator';
      if(input.mode !== undefined && !['event','spectator'].includes(String(input.mode))) throw new TypeError('Modo inválido.');
      const first = spectator ? agents.get(String(input.agentA))?.program : parseProgram(input.program);
      if(!first) throw new TypeError('General indisponível.');
      if(path.endsWith('/validate')) {json(200,{valid:true,hash:hashProgram(first),program:first});return;}
      const opponent = agents.get(String(input.villainId));
      if(!opponent) throw new TypeError('Adversário indisponível.');
      if(spectator && (!spectatorIds.has(String(input.agentA)) || !spectatorIds.has(opponent.id))) throw new TypeError('O modo espectador está disponível apenas para as submissões de LLMs publicadas.');
      const testing = path.endsWith('/test');
      const official = !spectator && !testing;
      let participantId:string|undefined;
      const challengeIndex=challenges.findIndex(c=>challengeOpponent(c)?.id===opponent.id);
      if(!spectator&&challengeIndex>0){const identity=store.identity(req.headers.cookie);if(identity.cookie)res.setHeader('Set-Cookie',identity.cookie);participantId=identity.id;const previous=challengeOpponent(challenges[challengeIndex-1]);if(!previous||!store.hasWonAgainst(identity.id,previous.id))throw new TypeError('Vença '+challenges[challengeIndex-1].name+' antes de avançar para esta missão.');}
      if(official && !['claude','astra','gemini',...challenges.filter(c=>agents.has(c.id)).map(c=>c.id)].includes(opponent.id)) throw new TypeError('Este general está disponível apenas no modo espectador. Aguarde sua submissão oficial.');
      const duration = testing ? 30 : official ? 720 : Number(input.durationSeconds ?? 720);
      if(!Number.isInteger(duration)||duration<1||duration>720) throw new TypeError('Duração entre 1 e 720 segundos.');
      let reservation: {id:string;cached:unknown}|null=null;
      if(official) {
        const identity = participantId ? {id:participantId,cookie:null} : store.identity(req.headers.cookie); if(identity.cookie) res.setHeader('Set-Cookie',identity.cookie);
        const fingerprint = createHash('sha256').update(hashProgram(first)+opponent.hash+'720'+ENGINE_VERSION+RULESET_VERSION).digest('hex');
        reservation = store.begin(identity.id,String(input.requestKey),fingerprint,opponent.id);
        if(reservation.cached) {json(200,reservation.cached);return;}
        const last = cooldown.get(identity.id) ?? 0;
        if(Date.now()-last<2000){store.fail(reservation.id);json(429,{error:'Aguarde dois segundos antes de iniciar outra partida.'});return;}
        cooldown.set(identity.id,Date.now());
        if(cooldown.size>10000) for(const [id,time] of cooldown) if(Date.now()-time>60000) cooldown.delete(id);
      }
      try {
        const result = await runMatch(first,opponent.program,duration,!testing);
        const response = {...result,humanHash:hashProgram(first),villainHash:opponent.hash,villainId:opponent.id,durationLimit:duration,engineVersion:ENGINE_VERSION,rulesetVersion:RULESET_VERSION};
        json(200,reservation ? store.complete(reservation.id,response) : response);
      } catch(e) {if(reservation)store.fail(reservation.id);throw e;}
    } catch(e) {
      const status = e instanceof ArenaBusyError ? 429 : e instanceof MatchTimeoutError ? 503 : e instanceof RangeError ? 413 : e instanceof SyntaxError ? 400 : e instanceof TypeError ? 422 : 500;
      if(status===429)res.setHeader('Retry-After','2');
      json(status,{error:status===500?'Falha interna ao preparar o confronto.':e instanceof Error?e.message:'Falha na arena.'});
    }
  });
  server.requestTimeout = 750000; server.headersTimeout = 10000;
  server.on('close',()=>store.db.close());
  return {server,store};
}
async function body(req:IncomingMessage) {
  if(Number(req.headers['content-length'])>1000000) {req.resume();throw new RangeError('JSON excede 1 MB.');}
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>1000000)throw new RangeError('JSON excede 1 MB.');chunks.push(b);}
  return Buffer.concat(chunks).toString('utf8');
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {server}=await createArena();
  const port=Number(process.env.PORT ?? process.env.ARENA_PORT ?? 4173);
  const host=process.env.ARENA_HOST ?? (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
  server.listen(port,host,()=>console.log(`Code Arena backend: http://${host}:${port}`));
  for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>server.close(()=>process.exit()));
}
