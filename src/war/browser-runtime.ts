import { assertUnlocked, localProgress, readResults, recordResult } from './browser-state';
import type { ArenaConfig } from './api';
export function workerRequest<T>(input:Record<string,unknown>):Promise<T> {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('../../war-integration/browser/worker.ts',import.meta.url),{type:'module'});
    const finish=(error:Error|null,result?:T)=>{clearTimeout(timeout);worker.terminate();if(error)reject(error);else resolve(result as T);};
    const timeout=setTimeout(()=>finish(new Error('A preparação demorou demais. Simplifique sua estratégia e tente novamente.')),720000);
    worker.onmessage=event=>event.data.error?finish(new Error(event.data.error)):finish(null,event.data.result);
    worker.onerror=()=>finish(new Error('Não foi possível executar o motor da Arena. Recarregue a página e tente novamente.'));
    worker.postMessage(input);
    worker.onmessageerror=()=>finish(new Error('Não foi possível ler o resultado da partida.'));
  });
}
let catalog:Promise<ArenaConfig>|undefined;
export async function localArenaGet(path:string):Promise<unknown> {
  if(path==='session')return {local:true};
  if(path==='config') {
    catalog??=workerRequest<ArenaConfig>({action:'catalog'}).catch(error=>{catalog=undefined;throw error;});
    return catalog;
  }
  if(path==='progress')return localProgress();
  if(path==='scoreboard') {
    const s=readResults();
    return {humanity:s.wins,machines:s.losses,participants:Number(s.wins+s.losses+s.draws>0),winners:Number(s.wins>0),losers:Number(s.losses>0),wins:s.wins,losses:s.losses,draws:s.draws,pending:false};
  }
  throw new Error('Dados da Arena indisponíveis.');
}
export function browserConfig(query:URLSearchParams) {
  return workerRequest({action:'config',mode:query.get('mode'),opponent:query.get('opponent')??'claude',agentA:query.get('agentA')??'claude'});
}
let busy=false;
export async function browserApi(path:string,payload:Record<string,unknown>,query:URLSearchParams) {
  if(path.endsWith('/validate'))return workerRequest({action:'validate',program:payload.program});
  if(!path.endsWith('/test')&&!path.endsWith('/battle'))throw new Error('Operação desconhecida.');
  const spectator=query.get('mode')==='spectator', testing=path.endsWith('/test');
  if(!spectator)assertUnlocked(payload.villainId);
  if(busy)throw new Error('Aguarde a preparação da partida atual.');
  busy=true;
  try {
    const result=await workerRequest<Record<string,unknown>>({...payload,action:'match',mode:spectator?'spectator':'event',agentA:query.get('agentA')??'claude',testing});
    if(!spectator&&!testing) {
      const id=typeof payload.requestKey==='string'?payload.requestKey:crypto.randomUUID();
      recordResult(id,String(payload.villainId),result.winner);
      return {...result,matchId:id,eventScore:{pending:true,local:true}};
    }
    return result;
  } finally {busy=false;}
}
