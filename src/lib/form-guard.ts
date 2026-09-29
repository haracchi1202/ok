import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// BOT 対策: ハニーポット項目 + 表示時刻を署名したトークンで「速すぎる送信」「使い回し」を弾く
const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 1000 * 60 * 60 * 3;

function key() {
  return process.env.FORM_SECRET || process.env.AUTH_SECRET || "dev-form-secret";
}

export function issueFormToken(): string {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", key()).update(ts).digest("hex").slice(0, 32);
  return `${ts}.${sig}`;
}

export function checkFormGuard(formToken: unknown, honeypot: unknown): string | null {
  if (typeof honeypot === "string" && honeypot.trim() !== "") return "送信を受け付けできませんでした";
  if (typeof formToken !== "string" || !formToken.includes(".")) return "フォームの有効期限が切れました。再読み込みしてください";
  const [ts, sig] = formToken.split(".");
  const expected = createHmac("sha256", key()).update(ts).digest("hex").slice(0, 32);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return "フォームの有効期限が切れました。再読み込みしてください";
  const age = Date.now() - Number(ts);
  if (age < MIN_FILL_MS) return "送信が早すぎます。内容をご確認のうえ再度送信してください";
  if (age > MAX_AGE_MS) return "フォームの有効期限が切れました。再読み込みしてください";
  return null;
}
