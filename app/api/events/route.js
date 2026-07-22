import { getDb, mapMatch, mapEvent } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json(); // { matchId, minute, team, type, scorer, playerOut, detail }
  const sql = getDb();
  const type = body.type || "goal";

  const eventRows = await sql`
    INSERT INTO events (match_id, minute, team, type, scorer, player_out, detail)
    VALUES (${body.matchId}, ${body.minute}, ${body.team || null}, ${type}, ${body.scorer || null}, ${body.playerOut || null}, ${body.detail || null})
    RETURNING *`;

  let matchRows;
  if (type === "goal" && body.team === "A") {
    matchRows = await sql`UPDATE matches SET score_a = COALESCE(score_a, 0) + 1 WHERE id = ${body.matchId} RETURNING *`;
  } else if (type === "goal" && body.team === "B") {
    matchRows = await sql`UPDATE matches SET score_b = COALESCE(score_b, 0) + 1 WHERE id = ${body.matchId} RETURNING *`;
  } else {
    matchRows = await sql`SELECT * FROM matches WHERE id = ${body.matchId}`;
  }

  if (matchRows.length === 0) {
    return new Response(JSON.stringify({ error: "Match introuvable" }), { status: 404 });
  }

  return Response.json({ event: mapEvent(eventRows[0]), match: mapMatch(matchRows[0]) }, { status: 201 });
}
