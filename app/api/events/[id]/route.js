import { getDb, checkAdminPin, mapMatch } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();

  const eventRows = await sql`SELECT * FROM events WHERE id = ${params.id}`;
  if (eventRows.length === 0) {
    return new Response(JSON.stringify({ error: "Événement introuvable" }), { status: 404 });
  }
  const event = eventRows[0];

  await sql`DELETE FROM events WHERE id = ${params.id}`;

  const matchRows = event.team === "A"
    ? await sql`UPDATE matches SET score_a = GREATEST(COALESCE(score_a, 0) - 1, 0) WHERE id = ${event.match_id} RETURNING *`
    : await sql`UPDATE matches SET score_b = GREATEST(COALESCE(score_b, 0) - 1, 0) WHERE id = ${event.match_id} RETURNING *`;

  return Response.json({ match: matchRows.length ? mapMatch(matchRows[0]) : null });
}
