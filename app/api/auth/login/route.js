import { getDb } from "../../../../lib/db";
import { verifyPassword, createSessionToken, sessionCookieHeader, mapUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const sql = getDb();
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Email ou mot de passe incorrect." }), { status: 401 });
  }
  const row = rows[0];
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Email ou mot de passe incorrect." }), { status: 401 });
  }
  if (row.role === "coach" && row.status === "pending") {
    return new Response(JSON.stringify({ error: "Votre compte coach est en attente de validation par un administrateur." }), { status: 403 });
  }
  if (row.status === "rejected") {
    return new Response(JSON.stringify({ error: "Ce compte a été refusé. Contactez un organisateur." }), { status: 403 });
  }

  const user = mapUser(row);
  const token = await createSessionToken(user);
  const res = Response.json({ user });
  res.headers.append("Set-Cookie", sessionCookieHeader(token, 60 * 60 * 24 * 30));
  return res;
}
