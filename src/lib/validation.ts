import { z } from "zod";
import { MEETING_METHODS, PAYMENT_METHODS, PLACES } from "./constants";

// 公開フォームの入力検証 (クライアント・サーバー共通)。サーバー側では必ず再検証する。

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[ー－‐]/g, "-"))
  .pipe(z.string().regex(/^\+?[0-9][0-9-]{8,14}$/, "電話番号の形式が正しくありません"));

const text = (max: number) => z.string().trim().max(max, `${max}文字以内で入力してください`);
const id = z.string().regex(/^[a-z0-9]{10,40}$/i).or(z.literal(""));
const slug = z.string().regex(/^[a-z0-9-]{1,60}$/).or(z.literal(""));

export const reservationSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "希望日を選択してください"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "希望開始時間を選択してください"),
    therapist: slug,
    secondTherapist: slug,
    isRepeat: z.enum(["0", "1"], { message: "初回かリピートかを選択してください" }),
    customerName: text(40).min(1, "お名前（ニックネーム可）を入力してください"),
    phone,
    email: z.string().trim().max(254).pipe(z.email("メールアドレスの形式が正しくありません")),
    areaId: id.refine((v) => v !== "", "ご利用エリアを選択してください"),
    nearestStation: text(60),
    meetingMethod: z.enum(MEETING_METHODS, { message: "合流方法を選択してください" }),
    place: z.enum(PLACES, { message: "ご利用場所を選択してください" }),
    courseId: id.refine((v) => v !== "", "コースを選択してください"),
    extensionCount: z.coerce.number().int().min(0).max(20),
    optionIds: z.array(z.string().regex(/^[a-z0-9]{10,40}$/i)).max(20),
    campaignId: id,
    lateNight: z.boolean(),
    paymentMethod: z.enum(PAYMENT_METHODS, { message: "お支払い方法を選択してください" }),
    note: text(1000),
    agree: z.literal(true, { message: "利用規約・キャンセルポリシーへの同意が必要です" }),
  })
  .refine((v) => !v.secondTherapist || v.secondTherapist !== v.therapist, { path: ["secondTherapist"], message: "第一希望と異なるセラピストを選択してください" });

export type ReservationInput = z.input<typeof reservationSchema>;

export const contactSchema = z.object({
  name: text(40).min(1, "お名前を入力してください"),
  email: z.string().trim().max(254).pipe(z.email("メールアドレスの形式が正しくありません")),
  phone: z.string().trim().max(20).regex(/^[0-9+\-\s]*$/, "電話番号の形式が正しくありません"),
  category: z.enum(["GENERAL", "RESERVATION", "THERAPIST", "RECRUIT", "OTHER"]),
  message: text(2000).min(5, "お問い合わせ内容を入力してください"),
});

export const reviewSchema = z.object({
  therapist: z.string().regex(/^[a-z0-9-]{1,60}$/, "セラピストを選択してください"),
  nickname: text(30).min(1, "ニックネームを入力してください"),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ご利用日を入力してください"),
  rating: z.coerce.number().int().min(1, "評価を選択してください").max(5),
  title: text(60).min(1, "タイトルを入力してください"),
  body: text(2000).min(20, "本文は20文字以上で入力してください"),
  tags: z.array(z.string().max(20)).max(6),
});

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
