import { getDb, mapScorer } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    UPDATE scorers SET
      player = ${body.player},
      filiere = ${body.fil},
      goals = ${body.buts}
    WHERE id = ${params.id}
    RETURNING *`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Buteur introuvable" }), { status: 404 });
  }
  return Response.json(mapScorer(rows[0]));
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();
  await sql`DELETE FROM scorers WHERE id = ${params.id}`;
  return new Response(null, { status: 204 });
}
