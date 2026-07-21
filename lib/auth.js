import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "estam-dev-secret-change-me");
export const SESSION_COOKIE = "estam_session";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user) {
  return new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

export function sessionCookieHeader(token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

// Récupère l'utilisateur courant à partir du cookie de session (léger, sans requête DB).
export async function getSessionUser(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return { id: Number(payload.sub), role: payload.role, name: payload.name };
}

// Récupère l'utilisateur courant à jour depuis la base (statut, rôle réels).
export async function getFreshSessionUser(req) {
  const basic = await getSessionUser(req);
  if (!basic) return null;
  const sql = getDb();
  const rows = await sql`SELECT id, name, email, role, status, team_id FROM users WHERE id = ${basic.id}`;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function requireAdmin(req) {
  const user = await getFreshSessionUser(req);
  return user && user.role === "admin" && user.status === "approved" ? user : null;
}

export function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    teamId: row.team_id
  };
}
