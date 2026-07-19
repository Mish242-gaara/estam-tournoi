import { getDb, checkAdminPin, mapTeam } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM teams ORDER BY group_name ASC, points DESC, id ASC`;
  return Response.json(rows.map(mapTeam));
}

export async function POST(req) {
  if (!checkAdminPin(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    INSERT INTO teams (name, group_name, played, goals_for, goals_against, points)
    VALUES (${body.name}, ${body.group}, ${body.j ?? 0}, ${body.bm ?? 0}, ${body.be ?? 0}, ${body.pts ?? 0})
    RETURNING *`;
  return Response.json(mapTeam(rows[0]), { status: 201 });
}
