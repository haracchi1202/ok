import path from "path";
import { readFile, stat } from "fs/promises";
import { UPLOAD_ROOT } from "@/lib/storage";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif" };

// アップロード画像の配信 (パストラバーサル対策済み・長期キャッシュ)
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.some((p) => !/^[a-zA-Z0-9_-]+(\.[a-z0-9]+)?$/.test(p))) return new Response("Not found", { status: 404 });
  const full = path.resolve(UPLOAD_ROOT, ...parts);
  const type = TYPES[path.extname(full).toLowerCase()];
  if (!full.startsWith(UPLOAD_ROOT + path.sep) || !type) return new Response("Not found", { status: 404 });
  try {
    const s = await stat(full);
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(s.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
