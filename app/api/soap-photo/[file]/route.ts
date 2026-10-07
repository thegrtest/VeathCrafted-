import { env } from "cloudflare:workers";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.(?:png|jpg|webp)$/.test(file) || !env.BUCKET) return new Response(null, { status: 404 });
  const object = await env.BUCKET.get(`soap-images/${file}`);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { headers: {
    "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  } });
}
