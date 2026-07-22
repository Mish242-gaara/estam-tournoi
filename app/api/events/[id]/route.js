import { getDb, mapMatch } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();

  const eventRows = await sql`SELECT * FROM events WHERE id = ${params.id}`;
  if (eventRows.length === 0) {
    return new Response(JSON.stringify({ error: "Événement introuvable" }), { status: 404 });
  }
  const event = eventRows[0];

  await sql`DELETE FROM events WHERE id = ${params.id}`;

  let matchRows;
  if (event.type === "goal" && event.team === "A") {
    matchRows = await sql`UPDATE matches SET score_a = GREATEST(COALESCE(score_a, 0) - 1, 0) WHERE id = ${event.match_id} RETURNING *`;
  } else if (event.type === "goal" && event.team === "B") {
    matchRows = await sql`UPDATE matches SET score_b = GREATEST(COALESCE(score_b, 0) - 1, 0) WHERE id = ${event.match_id} RETURNING *`;
  } else {
    matchRows = await sql`SELECT * FROM matches WHERE id = ${event.match_id}`;
  }

  return Response.json({ match: matchRows.length ? mapMatch(matchRows[0]) : null });
}
