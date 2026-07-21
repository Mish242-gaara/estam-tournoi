import { getDb, mapMatch, mapEvent } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json(); // { matchId, minute, team, scorer }
  const sql = getDb();

  const eventRows = await sql`
    INSERT INTO events (match_id, minute, team, scorer)
    VALUES (${body.matchId}, ${body.minute}, ${body.team}, ${body.scorer || null})
    RETURNING *`;

  const matchRows = body.team === "A"
    ? await sql`UPDATE matches SET score_a = COALESCE(score_a, 0) + 1 WHERE id = ${body.matchId} RETURNING *`
    : await sql`UPDATE matches SET score_b = COALESCE(score_b, 0) + 1 WHERE id = ${body.matchId} RETURNING *`;

  if (matchRows.length === 0) {
    return new Response(JSON.stringify({ error: "Match introuvable" }), { status: 404 });
  }

  return Response.json({ event: mapEvent(eventRows[0]), match: mapMatch(matchRows[0]) }, { status: 201 });
}
