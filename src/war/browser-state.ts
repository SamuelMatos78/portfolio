import challenges from '../../war-integration/config/challenges.json' with { type: 'json' };
const KEY='code-arena.local-results.v1';
export interface LocalResults {wins:number;losses:number;draws:number;cleared:string[];recorded:string[]}
let memory:LocalResults={wins:0,losses:0,draws:0,cleared:[],recorded:[]};
export function readResults():LocalResults {
  try {
    const value=JSON.parse(localStorage.getItem(KEY)??'null');
    if(value&&['wins','losses','draws'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0)&&Array.isArray(value.cleared)&&Array.isArray(value.recorded))
      memory={wins:value.wins,losses:value.losses,draws:value.draws,cleared:value.cleared.filter((id:unknown)=>typeof id==='string'),recorded:value.recorded.filter((id:unknown)=>typeof id==='string')};
  } catch { /* Storage may be blocked or contain an invalid record. */ }
  return structuredClone(memory);
}
export function recordResult(id:string,opponent:string,winner:unknown) {
  if(!['A','B','DRAW'].includes(String(winner))) throw new Error('Resultado inválido.');
  const state=readResults();
  if(state.recorded.includes(id))return;
  if(winner==='A'){state.wins++;if(!state.cleared.includes(opponent))state.cleared.push(opponent);}
  else if(winner==='B')state.losses++;else state.draws++;
  state.recorded=[...state.recorded.slice(-99),id];memory=state;
  try { localStorage.setItem(KEY,JSON.stringify(state)); } catch { /* Keep this session playable without persistent storage. */ }
}
export function localProgress() {
  const state=readResults();
  const clearedChallengeIds=challenges.filter(c=>c.opponentId&&state.cleared.includes(c.opponentId)).map(c=>c.id);
  return {clearedChallengeIds,unlockedChallengeIds:challenges.filter((_,i)=>i===0||clearedChallengeIds.includes(challenges[i-1].id)).map(c=>c.id)};
}
export function assertUnlocked(opponent:unknown) {
  const mission=challenges.find(c=>c.opponentId===opponent);
  if(mission&&!localProgress().unlockedChallengeIds.includes(mission.id))throw new Error('Vença a missão anterior para liberar este confronto.');
}
