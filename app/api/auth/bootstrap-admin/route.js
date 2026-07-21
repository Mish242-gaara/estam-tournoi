import { getDb } from "../../../../lib/db";
import { hashPassword, mapUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || !process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return new Response(JSON.stringify({ error: "Code organisateur incorrect." }), { status: 401 });
  }

  const body = await req.json();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!name || !email || password.length < 6) {
    return new Response(JSON.stringify({ error: "Nom, email et mot de passe (6 caractères min.) requis." }), { status: 400 });
  }

  const sql = getDb();
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return new Response(JSON.stringify({ error: "Un compte existe déjà avec cet email." }), { status: 409 });
  }

  const hash = await hashPassword(password);
  const rows = await sql`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (${name}, ${email}, ${hash}, 'admin', 'approved')
    RETURNING id, name, email, role, status, team_id`;

  return Response.json({ user: mapUser(rows[0]) }, { status: 201 });
}
