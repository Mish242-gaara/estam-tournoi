import { getFreshSessionUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await getFreshSessionUser(req);
  return Response.json({ user });
}
