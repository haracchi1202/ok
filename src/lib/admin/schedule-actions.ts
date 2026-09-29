"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertUser, canEditTherapist } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { SLOT_STATUS } from "@/lib/constants";
import { formatDateShort, isValidDateString } from "@/lib/time";
import { str, type FormState } from "./form";
import { removeShift, upsertShift } from "./slots";

async function guard(therapistId: string) {
  const user = await assertUser();
  if (!canEditTherapist(user, therapistId)) throw new Error("FORBIDDEN");
  return user;
}

function refresh() {
  revalidatePath("/admin/schedules", "layout");
  revalidatePath("/", "layout");
}

export async function saveShift(therapistId: string, date: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await guard(therapistId);
  if (str(fd, "intent") === "delete") {
    const err = await removeShift(therapistId, date);
    if (err) return { error: err };
    await audit(user.id, "delete", "Schedule", `${therapistId}:${date}`);
    refresh();
    return { ok: true, message: "出勤を削除しました。" };
  }
  const input = { start: str(fd, "start"), end: str(fd, "end"), status: str(fd, "status"), note: str(fd, "note") };
  const res = await upsertShift(therapistId, date, input);
  if (res.error) return { error: res.error };
  await audit(user.id, "update", "Schedule", `${therapistId}:${date}`, input);
  refresh();
  return { ok: true, message: "保存しました。", warnings: res.warnings };
}

/** 1 週間分をまとめて保存。status が空の日は出勤を削除 */
export async function saveWeek(therapistId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await guard(therapistId);
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  let saved = 0;
  for (let i = 0; i < 7; i++) {
    const date = str(fd, `date_${i}`);
    if (!isValidDateString(date)) continue;
    const status = str(fd, `status_${i}`);
    if (!status) {
      const err = await removeShift(therapistId, date);
      if (err) errors[`row_${i}`] = err;
      continue;
    }
    const res = await upsertShift(therapistId, date, { start: str(fd, `start_${i}`), end: str(fd, `end_${i}`), status, note: str(fd, `note_${i}`) });
    if (res.error) errors[`row_${i}`] = res.error;
    else saved++;
    for (const w of res.warnings) warnings.push(`${formatDateShort(date)}: ${w}`);
  }
  await audit(user.id, "update", "Schedule", therapistId, { week: str(fd, "date_0"), saved });
  refresh();
  if (Object.keys(errors).length) return { errors, warnings, error: "一部の日付を保存できませんでした。" };
  return { ok: true, message: "1 週間分の出勤を保存しました。", warnings };
}

export async function setSlotStatus(slotId: string, fd: FormData): Promise<void> {
  const status = str(fd, "status");
  if (!(status in SLOT_STATUS)) return;
  const slot = await prisma.availability.findUnique({ where: { id: slotId } });
  if (!slot) return;
  const user = await guard(slot.therapistId);
  await prisma.availability.update({ where: { id: slotId }, data: { status, ...(status === "AVAILABLE" ? { reservationId: null } : {}) } });
  await audit(user.id, "slot_status", "Availability", slotId, { from: slot.status, to: status });
  refresh();
}
