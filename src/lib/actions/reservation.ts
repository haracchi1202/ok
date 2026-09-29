"use server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { reservationSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { checkFormGuard } from "@/lib/form-guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, hashIp } from "@/lib/request";
import { getPriceMaster } from "@/lib/content";
import { calculatePrice, isLateNightTime } from "@/lib/pricing";
import { getSettings, settingNumber, siteUrl } from "@/lib/settings";
import { addDays, businessDateTime, formatDateLong, todayBusinessDate, displayTimeOption } from "@/lib/time";
import { sendMail } from "@/lib/mail";
import { yen } from "@/lib/format";
import { RESERVATION_STATUS } from "@/lib/constants";

export type ReservationResult =
  | { ok: true; reservationNo: string; token: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function generateNo(date: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(5);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `R${date.replaceAll("-", "").slice(2)}-${suffix}`;
}

export async function submitReservation(raw: unknown, formToken: string, honeypot: string): Promise<ReservationResult> {
  const guard = checkFormGuard(formToken, honeypot);
  if (guard) return { ok: false, message: guard };

  const ip = await clientIp();
  const limit = rateLimit(`reserve:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: `送信回数の上限に達しました。${Math.ceil(limit.retryAfter / 60)}分ほど時間をおいてお試しください。` };

  const parsed = reservationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "入力内容に誤りがあります", fieldErrors: toFieldErrors(parsed.error) };
  const v = parsed.data;

  const settings = await getSettings();
  const today = todayBusinessDate();
  if (v.date < today || v.date > addDays(today, 60)) return { ok: false, message: "希望日は本日から60日以内で選択してください", fieldErrors: { date: "選択できない日付です" } };
  const [h, m] = v.time.split(":").map(Number);
  if (h > 29 || m > 59) return { ok: false, message: "入力内容に誤りがあります", fieldErrors: { time: "時間の形式が正しくありません" } };
  const startAt = businessDateTime(v.date, v.time);
  const lead = settingNumber(settings, "reservation_lead_minutes", 60);
  if (startAt.getTime() < Date.now() + lead * 60000)
    return { ok: false, message: `ご予約は現在時刻から${lead}分後以降の時間でお選びください`, fieldErrors: { time: "この時間は選択できません" } };

  const master = await getPriceMaster();
  const [first, second] = await Promise.all([
    v.therapist ? prisma.therapist.findFirst({ where: { slug: v.therapist, status: "ACTIVE" } }) : null,
    v.secondTherapist ? prisma.therapist.findFirst({ where: { slug: v.secondTherapist, status: "ACTIVE" } }) : null,
  ]);
  if (v.therapist && !first) return { ok: false, message: "選択されたセラピストは現在ご予約いただけません", fieldErrors: { therapist: "選択できないセラピストです" } };
  const course = master.courses.find((c) => c.id === v.courseId);
  if (!course) return { ok: false, message: "コースを選択してください", fieldErrors: { courseId: "コースを選択してください" } };
  if (course.isOvernight && first && !first.canOvernight)
    return { ok: false, message: `${first.name}はお泊まりコースに対応していません`, fieldErrors: { courseId: "このセラピストは選択できないコースです" } };
  const area = master.areas.find((a) => a.id === v.areaId);
  if (!area) return { ok: false, message: "ご利用エリアを選択してください", fieldErrors: { areaId: "エリアを選択してください" } };
  const optionIds = v.optionIds.filter((id) => master.options.some((o) => o.id === id));
  const campaignId = master.campaigns.some((c) => c.id === v.campaignId) ? v.campaignId : "";

  // 料金はクライアントの値を信用せずサーバーで再計算する
  const price = calculatePrice(
    {
      therapistId: first?.id ?? null,
      isRepeat: v.isRepeat === "1",
      courseId: course.id,
      extensionCount: v.extensionCount,
      areaId: area.id,
      lateNight: isLateNightTime(v.time, master.rules),
      optionIds,
      campaignId: campaignId || null,
    },
    master,
  );

  let reservationNo = generateNo(v.date);
  for (let i = 0; i < 3 && (await prisma.reservation.findUnique({ where: { reservationNo } })); i++) reservationNo = generateNo(v.date);
  const token = randomBytes(24).toString("hex");

  await prisma.reservation.create({
    data: {
      reservationNo,
      accessToken: token,
      status: "PENDING",
      desiredDate: v.date,
      desiredTime: v.time,
      startAt,
      therapistId: first?.id ?? null,
      secondTherapistId: second?.id ?? null,
      isRepeat: v.isRepeat === "1",
      customerName: v.customerName,
      phone: v.phone,
      email: v.email,
      areaId: area.id,
      nearestStation: v.nearestStation,
      meetingMethod: v.meetingMethod,
      place: v.place,
      courseId: course.id,
      extensionCount: v.extensionCount,
      optionIds: JSON.stringify(optionIds),
      campaignId: campaignId || null,
      paymentMethod: v.paymentMethod,
      note: v.note,
      estimatedTotal: price.total,
      priceBreakdown: JSON.stringify({ lines: price.lines, subtotal: price.subtotal, discount: price.discount, total: price.total, totalMinutes: price.totalMinutes }),
      ipHash: hashIp(ip),
    },
  });

  const summary = [
    `受付番号：${reservationNo}`,
    `ステータス：${RESERVATION_STATUS.PENDING}`,
    `希望日時：${formatDateLong(v.date)} ${displayTimeOption(v.time)}〜`,
    `セラピスト：${first?.name ?? "フリー（指名なし）"}${second ? `（第二希望：${second.name}）` : ""}`,
    `コース：${course.name}${v.extensionCount ? `＋延長${v.extensionCount}回` : ""}`,
    `エリア：${area.name}${v.nearestStation ? `（${v.nearestStation}）` : ""}`,
    `合流方法：${v.meetingMethod} ／ 利用場所：${v.place}`,
    `お支払い：${v.paymentMethod}`,
    `お見積り合計：${yen(price.total)}`,
  ].join("\n");

  await Promise.all([
    sendMail(
      settings.admin_notify_email,
      `【新規予約】${reservationNo} ${v.customerName}様`,
      `新しい予約リクエストが届きました。\n\n${summary}\n\nお名前：${v.customerName}\n電話：${v.phone}\nメール：${v.email}\n備考：${v.note || "なし"}\n\n管理画面：${siteUrl}/admin/reservations`,
    ),
    sendMail(
      v.email,
      `【${settings.site_name}】ご予約リクエストを受け付けました（${reservationNo}）`,
      `${v.customerName} 様\n\nご予約リクエストありがとうございます。以下の内容で仮受付いたしました。\n担当スタッフより確認のご連絡を差し上げた時点で予約確定となります。\n\n${summary}\n\n受付内容の確認：${siteUrl}/reserve/complete?no=${reservationNo}&t=${token}\n\n※ 本メールにお心当たりのない場合は破棄してください。\n${settings.site_name}（${settings.phone}）`,
    ),
  ]);

  return { ok: true, reservationNo, token };
}
