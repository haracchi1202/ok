"use server";
import { prisma } from "@/lib/db";
import { contactSchema, reviewSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { checkFormGuard } from "@/lib/form-guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getSettings, siteUrl } from "@/lib/settings";
import { sendMail } from "@/lib/mail";
import { todayBusinessDate } from "@/lib/time";

export type FormResult = { ok: true } | { ok: false; message: string; fieldErrors?: FieldErrors };

const CATEGORY: Record<string, string> = { GENERAL: "一般", RESERVATION: "予約について", THERAPIST: "セラピストについて", RECRUIT: "求人", OTHER: "その他" };

export async function submitContact(raw: unknown, formToken: string, honeypot: string): Promise<FormResult> {
  const guard = checkFormGuard(formToken, honeypot);
  if (guard) return { ok: false, message: guard };
  const ip = await clientIp();
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000).ok) return { ok: false, message: "送信回数の上限に達しました。時間をおいてお試しください。" };
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "入力内容に誤りがあります", fieldErrors: toFieldErrors(parsed.error) };
  const v = parsed.data;
  await prisma.inquiry.create({ data: v });
  const s = await getSettings();
  await sendMail(s.admin_notify_email, `【お問い合わせ】${CATEGORY[v.category]} ${v.name}様`, `${v.message}\n\nお名前：${v.name}\nメール：${v.email}\n電話：${v.phone || "-"}\n\n管理画面：${siteUrl}/admin/inquiries`);
  await sendMail(v.email, `【${s.site_name}】お問い合わせを受け付けました`, `${v.name} 様\n\nお問い合わせありがとうございます。内容を確認のうえ、担当よりご連絡いたします。\n\n---\n${v.message}\n---\n\n${s.site_name}`);
  return { ok: true };
}

export async function submitReview(raw: unknown, formToken: string, honeypot: string): Promise<FormResult> {
  const guard = checkFormGuard(formToken, honeypot);
  if (guard) return { ok: false, message: guard };
  const ip = await clientIp();
  if (!rateLimit(`review:${ip}`, 3, 60 * 60 * 1000).ok) return { ok: false, message: "投稿回数の上限に達しました。時間をおいてお試しください。" };
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "入力内容に誤りがあります", fieldErrors: toFieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.visitDate > todayBusinessDate()) return { ok: false, message: "ご利用日が未来の日付です", fieldErrors: { visitDate: "ご利用済みの日付を入力してください" } };
  const t = await prisma.therapist.findFirst({ where: { slug: v.therapist, status: "ACTIVE" } });
  if (!t) return { ok: false, message: "セラピストが見つかりません", fieldErrors: { therapist: "選択できないセラピストです" } };
  // 公開前に必ず管理者承認 (PENDING で保存)
  await prisma.review.create({
    data: { therapistId: t.id, nickname: v.nickname, visitDate: v.visitDate, rating: v.rating, title: v.title, body: v.body, tags: v.tags.join(","), status: "PENDING" },
  });
  const s = await getSettings();
  await sendMail(s.admin_notify_email, `【口コミ承認待ち】${t.name}`, `${v.title}\n評価：${v.rating}\n\n${v.body}\n\n承認：${siteUrl}/admin/reviews`);
  return { ok: true };
}
