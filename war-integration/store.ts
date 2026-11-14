import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { contribution } from './policy.ts';
import type { ScorePolicy } from './policy.ts';
export class EventStore {
  db: DatabaseSync;
  policy: ScorePolicy;
  constructor(file: string, policy: ScorePolicy) {
    this.policy = policy;
    contribution(1, 4, policy);
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS participants(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY, participant TEXT NOT NULL REFERENCES participants(id), request_key TEXT NOT NULL, fingerprint TEXT NOT NULL, opponent TEXT NOT NULL, status TEXT NOT NULL, winner TEXT, result TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP, completed TEXT, UNIQUE(participant,request_key));
      CREATE INDEX IF NOT EXISTS results_participant ON matches(participant,status);`);
  }
  identity(cookie: string | undefined) {
    const token = cookie?.match(/(?:^|;\s*)code_event=([a-f0-9]{64})(?:;|$)/)?.[1];
    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    if (token) { const row = this.db.prepare('SELECT id FROM participants WHERE token_hash=?').get(hash(token)); if (row) return { id: String(row.id), cookie: null }; }
    const secret = randomBytes(32).toString('hex'), id = randomUUID();
    this.db.prepare('INSERT INTO participants(id,token_hash) VALUES(?,?)').run(id, hash(secret));
    return { id, cookie: `code_event=${secret}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}` };
  }
  begin(participant: string, key: string, fingerprint: string, opponent: string) {
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new TypeError('Chave de requisição UUID obrigatória.');
    const existing = this.db.prepare('SELECT * FROM matches WHERE participant=? AND request_key=?').get(participant, key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new TypeError('Chave já utilizada com outro programa ou adversário.');
      if (existing.status === 'complete') return { id: String(existing.id), cached: JSON.parse(String(existing.result)) };
      throw new TypeError('Esta partida já está em preparação ou falhou. Use uma nova chave para uma nova partida.');
    }
    if (this.db.prepare("SELECT id FROM matches WHERE participant=? AND status='pending'").get(participant)) throw new TypeError('Você já tem uma partida sendo preparada.');
    const id = randomUUID();
    this.db.prepare("INSERT INTO matches(id,participant,request_key,fingerprint,opponent,status) VALUES(?,?,?,?,?,'pending')").run(id, participant, key, fingerprint, opponent);
    return { id, cached: null };
  }
  totals(participant: string) {
    const row = this.db.prepare("SELECT SUM(winner='A') wins, SUM(winner='B') losses, SUM(winner='DRAW') draws FROM matches WHERE participant=? AND status='complete'").get(participant)!;
    return { wins: Number(row.wins ?? 0), losses: Number(row.losses ?? 0), draws: Number(row.draws ?? 0) };
  }
  hasWonAgainst(participant: string, opponent: string) {
    return Boolean(this.db.prepare("SELECT 1 AS won FROM matches WHERE participant=? AND opponent=? AND status='complete' AND winner='A' LIMIT 1").get(participant, opponent));
  }
  complete(id: string, result: { winner: string; [key: string]: unknown }) {
    if (!['A','B','DRAW'].includes(result.winner)) throw new Error('Resultado desconhecido.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT * FROM matches WHERE id=?').get(id);
      if (!row) throw new Error('Partida ausente.');
      if (row.status === 'complete') { this.db.exec('COMMIT'); return JSON.parse(String(row.result)); }
      if (row.status !== 'pending') throw new Error('Partida não está pendente.');
      const participant = String(row.participant), counts = this.totals(participant);
      const before = contribution(counts.wins, counts.losses, this.policy);
      const after = contribution(counts.wins + Number(result.winner === 'A'), counts.losses + Number(result.winner === 'B'), this.policy);
      const eventScore = { humanity: after.humanity - before.humanity, machines: after.machines - before.machines, pending: after.pending, policy: this.policy.id, total: after };
      const value = { ...result, matchId: id, eventScore };
      this.db.prepare("UPDATE matches SET status='complete',winner=?,result=?,completed=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(result.winner, JSON.stringify(value), id);
      this.db.exec('COMMIT'); return value;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  fail(id: string) { this.db.prepare("UPDATE matches SET status='failed' WHERE id=? AND status='pending'").run(id); }
  recover() { this.db.exec("UPDATE matches SET status='failed' WHERE status='pending'"); }
  scoreboard() {
    const groups = this.db.prepare("SELECT participant,SUM(winner='A') wins,SUM(winner='B') losses,SUM(winner='DRAW') draws FROM matches WHERE status='complete' GROUP BY participant").all();
    const score = { humanity: 0, machines: 0, participants: groups.length, winners: 0, losers: 0, wins: 0, losses: 0, draws: 0, pending: this.policy.status === 'pending', policy: this.policy.id };
    for (const group of groups) {
      const wins = Number(group.wins), losses = Number(group.losses), points = contribution(wins, losses, this.policy);
      score.humanity += points.humanity; score.machines += points.machines; score.winners += Number(wins > 0); score.losers += Number(losses > 0); score.wins += wins; score.losses += losses; score.draws += Number(group.draws);
    }
    return score;
  }
}
