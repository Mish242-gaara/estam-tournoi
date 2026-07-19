import { getDb, checkAdminPin, mapScorer } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM scorers ORDER BY goals DESC, id ASC`;
  return Response.json(rows.map(mapScorer));
}

export async function POST(req) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    INSERT INTO scorers (player, filiere, goals)
    VALUES (${body.player}, ${body.fil}, ${body.buts ?? 0})
    RETURNING *`;
  return Response.json(mapScorer(rows[0]), { status: 201 });
}
