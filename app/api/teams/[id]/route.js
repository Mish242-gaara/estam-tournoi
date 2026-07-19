import { getDb, checkAdminPin, mapTeam } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    UPDATE teams SET
      name = ${body.name},
      group_name = ${body.group},
      played = ${body.j},
      goals_for = ${body.bm},
      goals_against = ${body.be},
      points = ${body.pts}
    WHERE id = ${params.id}
    RETURNING *`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Filière introuvable" }), { status: 404 });
  }
  return Response.json(mapTeam(rows[0]));
}

export async function DELETE(req, { params }) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();
  await sql`DELETE FROM teams WHERE id = ${params.id}`;
  return new Response(null, { status: 204 });
}
