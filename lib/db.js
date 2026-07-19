import { neon } from "@neondatabase/serverless";

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL n'est pas configurée.");
  }
  return neon(process.env.DATABASE_URL);
}

export function checkAdminPin(req) {
  const pin = req.headers.get("x-admin-pin");
  return pin && process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN;
}

export function mapMatch(row) {
  return {
    id: row.id,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    time: row.time?.slice(0, 5) ?? row.time,
    teamA: row.team_a,
    teamB: row.team_b,
    scoreA: row.score_a,
    scoreB: row.score_b,
    group: row.group_name,
    status: row.status,
    minute: row.minute ?? null,
    phase: row.phase || "groupes",
    winner: row.winner || null
  };
}

export function mapEvent(row) {
  return {
    id: row.id,
    matchId: row.match_id,
    minute: row.minute,
    team: row.team,
    scorer: row.scorer
  };
}

export function mapTeam(row) {
  return {
    id: row.id,
    name: row.name,
    group: row.group_name,
    j: row.played,
    bm: row.goals_for,
    be: row.goals_against,
    pts: row.points
  };
}

export function mapScorer(row) {
  return {
    id: row.id,
    player: row.player,
    fil: row.filiere,
    buts: row.goals
  };
}
