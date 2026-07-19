import { getDb, checkAdminPin, mapMatch } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    UPDATE matches SET
      date = ${body.date},
      time = ${body.time},
      team_a = ${body.teamA},
      team_b = ${body.teamB},
      score_a = ${body.scoreA},
      score_b = ${body.scoreB},
      group_name = ${body.group},
      status = ${body.status}
    WHERE id = ${params.id}
    RETURNING *`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Match introuvable" }), { status: 404 });
  }
  return Response.json(mapMatch(rows[0]));
}

export async function DELETE(req, { params }) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();
  await sql`DELETE FROM matches WHERE id = ${params.id}`;
  return new Response(null, { status: 204 });
}
