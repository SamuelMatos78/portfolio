import { BLOCK_CATALOG, ENGINE_VERSION, RULESET_VERSION, parseProgram, hashProgram, simulate } from '../vendor/src/index.ts';
import { readableStarter } from '../vendor/game/strategies.ts';
import claude from '../vendor/llms/claude-sonnet5.5-extra.fixed.json' with { type: 'json' };
import astra from '../vendor/llms/gpt6-astra-v1.1.min.fixed.json' with { type: 'json' };
import gemini from '../vendor/llms/gemini3.1-pro-max.fixed.json' with { type: 'json' };
import challenges from '../config/challenges.json' with { type: 'json' };

const agents = [
  { id:'claude', name:'Claude Sonnet', title:'O estrategista', color:'#d99668', description:'Economia, diversidade de armas e recuperação.', program:parseProgram(claude) },
  { id:'astra', name:'GPT / Astra', title:'A sentinela', color:'#a7a0ed', description:'Patrulhas e escolha de confrontos por equipamento.', program:parseProgram(astra) },
  { id:'gemini', name:'Gemini', title:'O forjador', color:'#67bfc6', description:'Uma abertura econômica com fabricação e avanço.', program:parseProgram(gemini) },
].map(agent=>({...agent,hash:hashProgram(agent.program),optionalBoss:true}));
function findAgent(id:unknown) {
  const agent=agents.find(a=>a.id===id);
  if(!agent) throw new Error('Adversário indisponível.');
  return agent;
}
function publicAgent(agent:typeof agents[number]) {
  const {program,...metadata}=agent;
  void program;
  return metadata;
}
export function browserEngine(input:Record<string,unknown>):unknown {
  if(input.action==='catalog') return {
    agents:agents.map(publicAgent),
    challenges:challenges.map(c=>{const agent=agents.find(a=>a.id===c.opponentId);return {...c,opponentId:agent?.id??null,opponentName:agent?.name??null,available:!!agent};}),
    engineVersion:ENGINE_VERSION,rulesetVersion:RULESET_VERSION,seedSupported:false,
    scoring:{status:'local',reason:'Resultados salvos neste navegador.'},
  };
  const spectator=input.mode==='spectator';
  if(input.action==='config') {
    const opponent=findAgent(input.opponent);
    const first=spectator?findAgent(input.agentA):null;
    return {villains:[spectator?opponent:publicAgent(opponent)],selectedVillain:opponent.id,
      starter:first?.program??readableStarter(),hasInitialPrograms:spectator,agentAName:first?.name,
      catalog:BLOCK_CATALOG,maxSeconds:720,tickRate:14,engineVersion:ENGINE_VERSION,rulesetVersion:RULESET_VERSION,scoringPending:false};
  }
  const first=spectator?findAgent(input.agentA).program:parseProgram(input.program);
  if(input.action==='validate') return {valid:true,hash:hashProgram(first),program:first};
  if(input.action!=='match') throw new Error('Operação desconhecida.');
  const opponent=findAgent(input.villainId);
  const testing=input.testing===true;
  const duration=testing?30:spectator?Number(input.durationSeconds??720):720;
  if(!Number.isInteger(duration)||duration<1||duration>720) throw new Error('Duração entre 1 e 720 segundos.');
  return {...simulate(first,opponent.program,{maxSeconds:duration,debug:!testing,telemetry:'summary'}),
    humanHash:hashProgram(first),villainHash:opponent.hash,villainId:opponent.id,durationLimit:duration,
    engineVersion:ENGINE_VERSION,rulesetVersion:RULESET_VERSION};
}
