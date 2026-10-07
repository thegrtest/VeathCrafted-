import { env } from "cloudflare:workers";
import { getAdmin, isSameOriginWrite } from "@/lib/admin-auth";

const formats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

function matchesSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  if (!await getAdmin()) return Response.json({ error: "Access denied." }, { status: 403 });
  if (!isSameOriginWrite(request)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  if (!env.BUCKET) return Response.json({ error: "Photo storage unavailable." }, { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 5_000_000) return Response.json({ error: "Photo must be under 4 MB." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || !(file.type in formats) || file.size > 4_000_000 || file.size < 16) {
    return Response.json({ error: "Use a JPG, PNG, or WebP photo under 4 MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, file.type)) return Response.json({ error: "The file is not a valid image." }, { status: 400 });
  const extension = formats[file.type as keyof typeof formats];
  const filename = `${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(`soap-images/${filename}`, bytes, { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
  return Response.json({ url: `/api/soap-photo/${filename}` }, { status: 201 });
}
