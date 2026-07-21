import { getDb } from "../../../../lib/db";
import { hashPassword, mapUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const role = body.role === "coach" ? "coach" : "fan";
  const teamId = role === "coach" ? body.teamId || null : null;

  if (!name || !email || password.length < 6) {
    return new Response(JSON.stringify({ error: "Nom, email et mot de passe (6 caractères min.) requis." }), { status: 400 });
  }
  if (role === "coach" && !teamId) {
    return new Response(JSON.stringify({ error: "Sélectionnez la filière que vous encadrez." }), { status: 400 });
  }

  const sql = getDb();
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return new Response(JSON.stringify({ error: "Un compte existe déjà avec cet email." }), { status: 409 });
  }

  const hash = await hashPassword(password);
  const status = role === "coach" ? "pending" : "approved";
  const rows = await sql`
    INSERT INTO users (name, email, password_hash, role, status, team_id)
    VALUES (${name}, ${email}, ${hash}, ${role}, ${status}, ${teamId})
    RETURNING id, name, email, role, status, team_id`;

  return Response.json({ user: mapUser(rows[0]) }, { status: 201 });
}
