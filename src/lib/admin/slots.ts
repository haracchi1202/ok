import "server-only";
import { prisma } from "@/lib/db";
import { getSettings, settingNumber } from "@/lib/settings";
import { businessDateTime, formatShiftTime, isValidDateString } from "@/lib/time";

// 出勤 (Schedule) の保存と予約枠 (Availability) の再生成

export type ShiftInput = { start: string; end: string; status: string; note: string };

const TIME_RE = /^([01]?\d|2[0-9]):[0-5]\d$/;

/** 営業日 + HH:MM (終了が開始以前なら翌日扱い) → 実日時 */
export function shiftRange(date: string, start: string, end: string): { startAt: Date; endAt: Date } | { error: string } {
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return { error: "開始・終了時刻を入力してください" };
  const startAt = businessDateTime(date, start);
  let endAt = businessDateTime(date, end);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86400000);
  if (endAt.getTime() - startAt.getTime() > 24 * 3600000) return { error: "勤務時間は 24 時間以内にしてください" };
  if (endAt.getTime() === startAt.getTime()) return { error: "終了時刻は開始時刻と異なる時刻にしてください" };
  return { startAt, endAt };
}

export async function slotMinutes(): Promise<number> {
  const n = settingNumber(await getSettings(), "slot_minutes", 60);
  return n >= 10 && n <= 240 ? n : 60;
}

/**
 * 出勤を保存し予約枠を同期する。
 * - 同じ開始時刻の既存枠はステータス (BOOKED / INQUIRY / CLOSED) を維持
 * - 範囲外になった枠は削除 (BOOKED は残して警告)
 */
export async function upsertShift(therapistId: string, date: string, input: ShiftInput): Promise<{ error?: string; warnings: string[] }> {
  if (!isValidDateString(date)) return { error: "日付が不正です", warnings: [] };
  if (!["WORKING", "OFF", "TBD"].includes(input.status)) return { error: "ステータスが不正です", warnings: [] };
  const hasTimes = !!(input.start && input.end);
  if (input.status === "WORKING" && !hasTimes) return { error: "出勤の場合は開始・終了時刻を入力してください", warnings: [] };
  const range = shiftRange(date, hasTimes ? input.start : "12:00", hasTimes ? input.end : "24:00");
  if ("error" in range) return { error: range.error, warnings: [] };
  const note = input.note.slice(0, 200);
  const step = (await slotMinutes()) * 60000;

  return prisma.$transaction(async (tx) => {
    const warnings: string[] = [];
    const schedule = await tx.schedule.upsert({
      where: { therapistId_date: { therapistId, date } },
      create: { therapistId, date, ...range, status: input.status, note },
      update: { ...range, status: input.status, note },
    });

    const desired: number[] = [];
    if (input.status === "WORKING") {
      for (let t = range.startAt.getTime(); t + step <= range.endAt.getTime(); t += step) desired.push(t);
      if (desired.length === 0) warnings.push("勤務時間が予約枠の単位より短いため、予約枠は作成されませんでした。");
    }
    const existing = await tx.availability.findMany({ where: { scheduleId: schedule.id } });
    const byStart = new Map(existing.map((s) => [s.startAt.getTime(), s]));
    const desiredSet = new Set(desired);

    // 範囲外の枠を削除 (予約済みは残す)
    const keepBooked = existing.filter((s) => !desiredSet.has(s.startAt.getTime()) && s.status === "BOOKED");
    await tx.availability.deleteMany({ where: { scheduleId: schedule.id, id: { notIn: keepBooked.map((s) => s.id) }, startAt: { notIn: desired.map((t) => new Date(t)) } } });
    if (keepBooked.length)
      warnings.push(`予約済みの枠が勤務時間外になっています (${keepBooked.map((s) => formatShiftTime(s.startAt, date)).join("、")})。予約内容をご確認ください。`);

    // 他の営業日の枠と重なる開始時刻は作成しない (unique 制約)
    const conflicts = desired.length
      ? await tx.availability.findMany({ where: { therapistId, startAt: { in: desired.map((t) => new Date(t)) }, NOT: { scheduleId: schedule.id } }, select: { startAt: true } })
      : [];
    const conflictSet = new Set(conflicts.map((c) => c.startAt.getTime()));
    if (conflicts.length) warnings.push("前後の営業日の出勤と重なる時間帯の枠は作成されませんでした。");

    for (const t of desired) {
      const cur = byStart.get(t);
      if (cur) {
        if (cur.endAt.getTime() !== t + step) await tx.availability.update({ where: { id: cur.id }, data: { endAt: new Date(t + step) } });
      } else if (!conflictSet.has(t)) {
        await tx.availability.create({ data: { scheduleId: schedule.id, therapistId, startAt: new Date(t), endAt: new Date(t + step), status: "AVAILABLE" } });
      }
    }
    return { warnings };
  });
}

/** 出勤を削除 (予約済み枠がある場合は不可) */
export async function removeShift(therapistId: string, date: string): Promise<string | null> {
  const s = await prisma.schedule.findUnique({ where: { therapistId_date: { therapistId, date } }, include: { slots: { where: { status: "BOOKED" }, select: { id: true } } } });
  if (!s) return null;
  if (s.slots.length) return "予約済みの枠があるため削除できません。先に予約を調整してください。";
  await prisma.schedule.delete({ where: { id: s.id } });
  return null;
}
