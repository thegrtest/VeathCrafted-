import { env } from "cloudflare:workers";

export async function GET() {
  try {
    if (!env.DB) throw new Error("D1 binding unavailable");
    await env.DB.prepare("SELECT COUNT(*) AS total FROM orders").first();
    return Response.json({ ok: true, database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
