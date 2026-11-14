import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { adaptArena } from '../arena-adapter.ts';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID,createHash } from 'node:crypto';
import { createArena } from '../server.ts';
import { EventStore } from '../store.ts';
import { contribution } from '../policy.ts';
import { parseProgram, simulate } from '../vendor/src/index.ts';
import type { ScorePolicy } from '../policy.ts';
import type { Server } from 'node:http';
const pending:ScorePolicy={id:'pending',status:'pending',capPerSide:3,humanThresholds:null,machineThresholds:null};
const wait={schemaVersion:1,body:[{op:'wait',seconds:1}]};
// Exercise the real HTTP request handler in memory: this environment prohibits sockets.
function request(server:Server,path:string,payload?:unknown,cookie?:string,extra:Record<string,string>={}) {
 return new Promise<{status:number;headers:Record<string,string>;data:any}>((resolve,reject)=>{
  const req=Readable.from(payload===undefined?[]:[JSON.stringify(payload)]) as Readable & {url:string;method:string;headers:Record<string,string>};
  req.url=path;req.method=payload===undefined?'GET':'POST';req.headers={host:'localhost:5173','content-type':'application/json',...(cookie?{cookie}:{}),...extra};
  const headers:Record<string,string>={};let status=200;
  const res={setHeader(k:string,v:string){headers[k.toLowerCase()]=v;},writeHead(code:number,h:Record<string,string>={}){status=code;for(const[k,v]of Object.entries(h))headers[k.toLowerCase()]=v;return res;},end(body:string|Buffer){const text=String(body);try{resolve({status,headers,data:headers['content-type']?.includes('application/json')?JSON.parse(text):text});}catch(e){reject(e);}}};
  server.emit('request',req,res);
 });
}
test('persistent participants, audited results, idempotency, draws and pending policy',async()=>{
 const dir=await mkdtemp(resolve(tmpdir(),'code-event-test-')); const file=resolve(dir,'event.sqlite');
 let store=new EventStore(file,pending);
 const identity=store.identity(undefined); const cookie=identity.cookie!;
 assert.equal(store.identity(cookie).id,identity.id);
 const save=(winner:string)=>{const match=store.begin(identity.id,randomUUID(),randomUUID(),'claude');return store.complete(match.id,{winner});};
 const first=save('B');for(let i=0;i<3;i++)save('B');save('A');save('DRAW');
 assert.deepEqual(store.totals(identity.id),{wins:1,losses:4,draws:1});
 assert.equal(store.scoreboard().participants,1);assert.equal(store.scoreboard().winners,1);assert.equal(store.scoreboard().losers,1);
 assert.equal(store.scoreboard().pending,true);
 assert.equal(store.scoreboard().humanity,0);assert.equal(store.scoreboard().machines,0);
 assert.deepEqual(store.complete(first.matchId,{winner:'A'}),first);
 assert.equal(store.scoreboard().losses,4);
 const stranger=store.identity('code_event='+'0'.repeat(64));assert.notEqual(stranger.id,identity.id);
 assert.equal(store.scoreboard().participants,1); // Cookie creation is not participation.
 const key=randomUUID(); const match=store.begin(identity.id,key,'same-input','astra');const done=store.complete(match.id,{winner:'DRAW'});
 assert.deepEqual(store.begin(identity.id,key,'same-input','astra').cached,done);
 assert.throws(()=>store.begin(identity.id,key,'changed-input','astra'));
 store.db.close();store=new EventStore(file,pending);
 assert.equal(store.identity(cookie).id,identity.id);assert.equal(store.scoreboard().draws,2);store.db.close();
});
test('policy refuses incompatible rules and enforces independent contribution caps',()=>{
 const configured:ScorePolicy={id:'test-only-not-event-policy',status:'approved-test-fixture',capPerSide:3,humanThresholds:[1,2,3],machineThresholds:[1,4,8]};
 assert.deepEqual(contribution(1,4,configured),{humanity:1,machines:2,pending:false});
 assert.deepEqual(contribution(1000,1000,configured),{humanity:3,machines:3,pending:false});
 assert.deepEqual(contribution(2,0,configured),{humanity:2,machines:0,pending:false});
 assert.throws(()=>contribution(1,4,{...configured,machineThresholds:[1,2,3]}));
 assert.deepEqual(contribution(1,4,pending),{humanity:0,machines:0,pending:true});
});
test('complete event and spectator battles reuse the actual engine, enforce official parameters and isolate scores',async()=>{
 const dir=await mkdtemp(resolve(tmpdir(),'code-event-api-'));const {server,store}=await createArena(resolve(dir,'event.sqlite'));
 try {
  const session=await request(server,'/api/event/session');const cookie=session.headers['set-cookie'];assert.ok(cookie?.includes('HttpOnly'));
  const config=await request(server,'/api/event/config');assert.equal(config.status,200);assert.equal(config.data.seedSupported,false);assert.equal(config.data.agents.filter((a:any)=>a.optionalBoss).length,3);assert.deepEqual(config.data.agents.map((a:any)=>a.id),['claude','astra','gemini']);const easy=config.data.challenges.find((c:any)=>c.id==='easy');
  const medium=config.data.challenges.find((c:any)=>c.id==='medium');
  const hard=config.data.challenges.find((c:any)=>c.id==='hard');
  assert.equal(easy.available,true);assert.equal(easy.opponentId,'claude');assert.equal(easy.opponentName,'Claude Sonnet');
  assert.equal(easy.image,'/projects/war-game/AraMoney.png');assert.equal(easy.programFile,undefined);
  assert.equal(medium.available,true);assert.equal(medium.opponentId,'astra');assert.equal(medium.opponentName,'GPT / Astra');assert.equal(medium.image,'/projects/war-game/gabs.jpeg');
  assert.equal(hard.available,false);
  for(const unavailable of ['darwin','evil-darwin']){
    assert.equal((await request(server,`/api/game/config?mode=spectator&agentA=${unavailable}&opponent=claude`)).status,422);
    assert.equal((await request(server,`/api/game/config?mode=spectator&agentA=claude&opponent=${unavailable}`)).status,422);
    assert.equal((await request(server,'/api/game/battle',{mode:'spectator',agentA:unavailable,villainId:'claude',durationSeconds:1},cookie)).status,422);
    assert.equal((await request(server,'/api/game/battle',{mode:'spectator',agentA:'claude',villainId:unavailable,durationSeconds:1},cookie)).status,422);
  }
  for(const [mission,file]of [[easy,'claude-sonnet5.5-extra.fixed.json'],[medium,'gpt6-astra-v1.1.min.fixed.json']]){
    const arena=await request(server,`/api/game/config?opponent=${mission.opponentId}`);
    const frozen=parseProgram(JSON.parse(await readFile(new URL('../vendor/llms/'+file,import.meta.url),'utf8')));
    assert.deepEqual(arena.data.villains[0].program,frozen);
  }
  const validate=await request(server,'/api/game/validate',{program:wait});assert.equal(validate.status,200);
  for(const program of [{schemaVersion:1,body:[{op:'shell'}]},{schemaVersion:1,body:Array.from({length:2001},()=>({op:77,seconds:1}))}]) assert.equal((await request(server,'/api/game/validate',{program})).status,422);
  const payload={program:wait,villainId:easy.opponentId,durationSeconds:1,mode:'event',requestKey:randomUUID()};
  const event=await request(server,'/api/game/battle',payload,cookie);
  assert.equal(event.status,200,JSON.stringify(event.data));assert.equal(event.data.durationLimit,720);assert.ok(event.data.debugFrames.length);assert.equal(event.data.eventScore.pending,true);assert.ok(['A','B','DRAW'].includes(event.data.winner));
  const duplicate=await request(server,'/api/game/battle',payload,cookie);assert.equal(duplicate.data.matchId,event.data.matchId);
  const before=store.scoreboard();assert.equal(before.participants,1);assert.equal(before.wins+before.losses+before.draws,1);
  const mediumSession=await request(server,'/api/event/session');
  const rescue=await request(server,'/api/game/battle',{program:wait,villainId:medium.opponentId,mode:'event',requestKey:randomUUID()},mediumSession.headers['set-cookie']);
  assert.equal(rescue.status,200,JSON.stringify(rescue.data));assert.equal(rescue.data.villainId,'astra');
  assert.equal(rescue.data.durationLimit,720);assert.equal(rescue.data.winner,'B');assert.ok(rescue.data.debugFrames.length);
  const afterCampaign=store.scoreboard();assert.equal(afterCampaign.participants,2);assert.equal(afterCampaign.losses,1);
  const watch=await request(server,'/api/game/battle',{mode:'spectator',agentA:'claude',villainId:'astra',durationSeconds:720},cookie);
  assert.equal(watch.status,200,JSON.stringify(watch.data));assert.ok(watch.data.debugFrames.length);assert.equal(watch.data.eventScore,undefined);
  const actualA=parseProgram(JSON.parse(await readFile(new URL('../vendor/llms/claude-sonnet5.5-extra.fixed.json',import.meta.url),'utf8'))),actualB=parseProgram(JSON.parse(await readFile(new URL('../vendor/llms/gpt6-astra-v1.1.min.fixed.json',import.meta.url),'utf8')));
  const repeat=simulate(actualA,actualB,{maxSeconds:720,telemetry:'summary'});assert.equal(watch.data.winner,repeat.winner);assert.deepEqual(watch.data.teams,repeat.teams);assert.deepEqual(watch.data.stats,repeat.stats);
  const trial=await request(server,'/api/game/test',{program:wait,villainId:'astra'},cookie);assert.equal(trial.status,200);assert.equal(trial.data.durationLimit,30);assert.deepEqual(store.scoreboard(),afterCampaign);
  const draw=await request(server,'/api/game/battle',{mode:'spectator',agentA:'claude',villainId:'claude',durationSeconds:1},cookie);assert.equal(draw.data.winner,'DRAW');
  assert.equal((await request(server,'/api/game/battle',{...payload,requestKey:randomUUID(),winner:'A'},cookie)).status,422);
  assert.equal((await request(server,'/api/game/validate',{program:wait},cookie,{origin:'https://untrusted.test'})).status,403);
  for(const path of ['/arena/','/arena/game.js','/arena/ide.js','/arena/block-editor.js','/arena/assets/battlefield.png','/arena/schema.json']) assert.equal((await request(server,path)).status,200,path);
  assert.equal((await request(server,'/arena/../../llms/input.txt')).status,404);
  assert.equal((await request(server,'/api/event/scoreboard',{winner:'A'})).status,404);
  const adapted=await request(server,'/arena/game.js');assert.ok(adapted.data.includes('/arena/playback.js'));assert.ok(adapted.data.includes('code-arena-result'));
  const info={event:{winner:event.data.winner,seconds:event.data.durationSeconds,teams:event.data.teams},spectator:{winner:watch.data.winner,seconds:watch.data.durationSeconds,teams:watch.data.teams},scoreboard:store.scoreboard()};
  console.log('REAL_ENGINE_VALIDATION',JSON.stringify(info));
 }finally{store.db.close();}
});
test('vendored engine, submissions and arena remain byte-identical to inspected sources',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../vendor-checksums.json',import.meta.url),'utf8')) as Record<string,string>;
 for(const [path,expected]of Object.entries(manifest)){const file=await readFile(new URL('../vendor/'+path,import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),expected,path);}
});

test('adapted arena modules remain valid JavaScript and retain the shared editor',async()=>{
 for(const name of ['game.js','ide.js','commands.js','playback.js','block-model.js','block-editor.js']){
   const raw=await readFile(new URL('../vendor/game/'+name,import.meta.url),'utf8');
   const adapted=adaptArena(raw,name);
   const check=spawnSync(process.execPath,['--check','--input-type=module'],{input:adapted,encoding:'utf8'});
   assert.equal(check.status,0,check.stderr);
 }
 const html=adaptArena(await readFile(new URL('../vendor/game/index.html',import.meta.url),'utf8'),'index.html');
 assert.ok(html.includes('id="blocksMode"'));assert.ok(html.includes('id="humanCode"'));assert.ok(html.includes('src="/arena/game.js"'));
 assert.ok(!html.includes('href="/arena/api-docs"'));assert.ok(!html.includes('href="/arena/debug"'));
});

test('actual engine wins and losses feed distinct-participant counters without fictitious points',async()=>{
 const store=new EventStore(':memory:',pending);
 try{
  const darwin=parseProgram(JSON.parse(await readFile(new URL('../vendor/Darwin/launch/best.json',import.meta.url),'utf8')));
  const astra=parseProgram(JSON.parse(await readFile(new URL('../vendor/llms/gpt6-astra-v1.1.min.fixed.json',import.meta.url),'utf8')));
  const passive=parseProgram(wait);
  const victory=simulate(darwin,passive,{maxSeconds:720,telemetry:'summary'});
  const defeat=simulate(passive,astra,{maxSeconds:720,telemetry:'summary'});
  assert.equal(victory.winner,'A');assert.equal(defeat.winner,'B');
  const participant=store.identity(undefined).id;
  for(const result of [defeat,defeat,defeat,defeat,victory]){
    const job=store.begin(participant,randomUUID(),randomUUID(),'engine-fixture');
    store.complete(job.id,{...result});
  }
  const score=store.scoreboard();
  assert.equal(score.participants,1);assert.equal(score.winners,1);assert.equal(score.losers,1);assert.equal(score.wins,1);assert.equal(score.losses,4);
  assert.equal(score.pending,true);assert.equal(score.humanity,0);assert.equal(score.machines,0);
 }finally{store.db.close();}
});
