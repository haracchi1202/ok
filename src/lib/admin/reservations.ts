import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RESERVATION_STATUS } from "@/lib/constants";
import { isValidDateString, formatShiftTime, toBusinessDate } from "@/lib/time";

export type ReservationFilter = { status: string; from: string; to: string; therapistId: string; q: string };

export function reservationFilter(q: Record<string, string | string[] | undefined>): ReservationFilter {
  const g = (k: string) => {
    const v = q[k];
    return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
  };
  return { status: g("status"), from: g("from"), to: g("to"), therapistId: g("therapistId"), q: g("q") };
}

export function reservationWhere(f: ReservationFilter): Prisma.ReservationWhereInput {
  const where: Prisma.ReservationWhereInput = {};
  if (f.status && f.status in RESERVATION_STATUS) where.status = f.status;
  const date: Prisma.StringFilter = {};
  if (isValidDateString(f.from)) date.gte = f.from;
  if (isValidDateString(f.to)) date.lte = f.to;
  if (date.gte || date.lte) where.desiredDate = date;
  if (f.therapistId) where.OR = [{ therapistId: f.therapistId }, { secondTherapistId: f.therapistId }];
  if (f.q) {
    const kw = { OR: [{ reservationNo: { contains: f.q } }, { customerName: { contains: f.q } }, { phone: { contains: f.q } }, { email: { contains: f.q } }] };
    where.AND = [kw];
  }
  return where;
}

/** 延長 1 回あたりの分数 (料金ルール extension_unit_minutes) */
async function extensionUnit(): Promise<number> {
  const r = await prisma.priceRule.findUnique({ where: { key: "extension_unit_minutes" } });
  return r?.amount && r.amount > 0 ? r.amount : 30;
}

/** 予約の占有時間 [startAt, end) */
export async function reservationRange(r: { startAt: Date; extensionCount: number; course: { minutes: number } | null }) {
  const minutes = (r.course?.minutes ?? 60) + r.extensionCount * (await extensionUnit());
  return { start: r.startAt, end: new Date(r.startAt.getTime() + minutes * 60000), minutes };
}

/** 確定時: 第一希望セラピストの重なる枠を BOOKED にする */
export async function bookSlots(reservationId: string): Promise<string[]> {
  const r = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { course: { select: { minutes: true } } } });
  if (!r) return [];
  if (!r.therapistId) return ["指名なし (フリー) の予約のため、予約枠は更新していません。"];
  const { start, end } = await reservationRange(r);
  const slots = await prisma.availability.findMany({ where: { therapistId: r.therapistId, startAt: { lt: end }, endAt: { gt: start } }, orderBy: { startAt: "asc" } });
  const warnings: string[] = [];
  if (slots.length === 0) warnings.push("該当時間帯の予約枠がありません。出勤登録をご確認ください。");
  const businessDate = toBusinessDate(start);
  const taken = slots.filter((s) => s.status === "BOOKED" && s.reservationId !== r.id);
  if (taken.length) warnings.push(`既に予約済みの枠があります (${taken.map((s) => formatShiftTime(s.startAt, businessDate)).join("、")})。重複をご確認ください。`);
  const ids = slots.filter((s) => !taken.includes(s)).map((s) => s.id);
  if (ids.length) await prisma.availability.updateMany({ where: { id: { in: ids } }, data: { status: "BOOKED", reservationId: r.id } });
  return warnings;
}

/** キャンセル時など: この予約で押さえた枠を空きに戻す */
export async function releaseSlots(reservationId: string): Promise<number> {
  const res = await prisma.availability.updateMany({ where: { reservationId }, data: { status: "AVAILABLE", reservationId: null } });
  return res.count;
}

export type PriceBreakdown = { lines: { label: string; amount: number; detail?: string }[]; total?: number; subtotal?: number; discount?: number; warnings?: string[] };

export function parseBreakdown(s: string): PriceBreakdown | null {
  try {
    const v = JSON.parse(s || "{}");
    if (!v || typeof v !== "object") return null;
    return {
      ...v,
      lines: (Array.isArray(v.lines) ? v.lines : []).map((l: Record<string, unknown>) => ({ label: String(l.label ?? ""), amount: Number(l.amount ?? 0), detail: l.detail ? String(l.detail) : undefined })),
    };
  } catch {
    return null;
  }
}
