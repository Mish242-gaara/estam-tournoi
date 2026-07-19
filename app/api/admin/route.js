export const dynamic = "force-dynamic";

export async function POST(req) {
  const { pin } = await req.json();
  const ok = Boolean(pin) && Boolean(process.env.ADMIN_PIN) && pin === process.env.ADMIN_PIN;
  return Response.json({ ok });
}
