import { browserEngine } from './engine.ts';
self.onmessage=(event:MessageEvent<Record<string,unknown>>)=>{
  try { self.postMessage({result:browserEngine(event.data)}); }
  catch(error) { self.postMessage({error:error instanceof Error?error.message:'Falha ao executar a estratégia.'}); }
};
