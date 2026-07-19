import { getDb, checkAdminPin, mapMatch, mapEvent } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const [matchRows, eventRows] = await Promise.all([
    sql`SELECT * FROM matches ORDER BY date ASC, time ASC`,
    sql`SELECT * FROM events ORDER BY minute ASC, id ASC`
  ]);
  const eventsByMatch = {};
  for (const row of eventRows) {
    const ev = mapEvent(row);
    (eventsByMatch[ev.matchId] = eventsByMatch[ev.matchId] || []).push(ev);
  }
  const matches = matchRows.map(row => ({ ...mapMatch(row), events: eventsByMatch[row.id] || [] }));
  return Response.json(matches);
}

export async function POST(req) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    INSERT INTO matches (date, time, team_a, team_b, score_a, score_b, group_name, status, minute)
    VALUES (${body.date}, ${body.time}, ${body.teamA}, ${body.teamB}, ${body.scoreA}, ${body.scoreB}, ${body.group}, ${body.status}, ${body.minute ?? null})
    RETURNING *`;
  return Response.json({ ...mapMatch(rows[0]), events: [] }, { status: 201 });
}
