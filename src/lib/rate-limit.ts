import "server-only";

// シンプルなスライディングウィンドウ型レートリミット (単一プロセス向け)。
// 複数インスタンスで運用する場合は Redis 等の共有ストアに置き換える。
type Bucket = { hits: number[] };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = store.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    store.set(key, b);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - b.hits[0])) / 1000) };
  }
  b.hits.push(now);
  store.set(key, b);
  if (store.size > 10000) {
    for (const [k, v] of store) if (v.hits.every((t) => now - t > windowMs)) store.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}
