import { getDb, checkAdminPin, mapMatch } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM matches ORDER BY date ASC, time ASC`;
  return Response.json(rows.map(mapMatch));
}

export async function POST(req) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    INSERT INTO matches (date, time, team_a, team_b, score_a, score_b, group_name, status)
    VALUES (${body.date}, ${body.time}, ${body.teamA}, ${body.teamB}, ${body.scoreA}, ${body.scoreB}, ${body.group}, ${body.status})
    RETURNING *`;
  return Response.json(mapMatch(rows[0]), { status: 201 });
}
