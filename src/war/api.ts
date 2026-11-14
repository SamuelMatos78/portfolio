import { localArenaGet } from "./browser-runtime";
export interface Agent { id:string; name:string; title:string; description:string; color:string; hash:string; optionalBoss:boolean }
export interface Challenge { id:string; name:string; objective:string; opponentId:string|null; opponentName:string|null; image:string|null; available:boolean }
export interface ArenaConfig { agents:Agent[]; challenges:Challenge[]; engineVersion:string; rulesetVersion:string; seedSupported:boolean; scoring:{status:string;reason:string} }
export interface Scoreboard { humanity:number; machines:number; participants:number; winners:number; losers:number; wins:number; losses:number; draws:number; pending:boolean }
export interface CampaignProgress { clearedChallengeIds:string[]; unlockedChallengeIds:string[] }
export async function arenaGet<T>(path:string):Promise<T> {
  return await localArenaGet(path) as T;
}
