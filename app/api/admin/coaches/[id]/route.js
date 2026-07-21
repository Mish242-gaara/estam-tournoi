import { getDb } from "../../../../../lib/db";
import { requireAdmin, mapUser } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json(); // { status: 'approved' | 'rejected' }
  if (!["approved", "rejected", "pending"].includes(body.status)) {
    return new Response(JSON.stringify({ error: "Statut invalide" }), { status: 400 });
  }
  const sql = getDb();
  const rows = await sql`
    UPDATE users SET status = ${body.status}
    WHERE id = ${params.id} AND role = 'coach'
    RETURNING *`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Compte introuvable" }), { status: 404 });
  }
  return Response.json(mapUser(rows[0]));
}

export async function DELETE(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();
  await sql`DELETE FROM users WHERE id = ${params.id} AND role = 'coach'`;
  return new Response(null, { status: 204 });
}
