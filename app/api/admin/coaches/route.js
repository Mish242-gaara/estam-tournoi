import { getDb } from "../../../../lib/db";
import { requireAdmin, mapUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }
  const sql = getDb();
  const rows = await sql`
    SELECT u.*, t.name AS team_name
    FROM users u
    LEFT JOIN teams t ON t.id = u.team_id
    WHERE u.role = 'coach'
    ORDER BY u.status ASC, u.created_at DESC`;
  const coaches = rows.map(r => ({ ...mapUser(r), teamName: r.team_name }));
  return Response.json(coaches);
}
