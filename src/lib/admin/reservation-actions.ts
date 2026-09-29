"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertUser, STAFF_ROLES } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { RESERVATION_STATUS } from "@/lib/constants";
import { str, type FormState } from "./form";
import { bookSlots, releaseSlots } from "./reservations";

export async function changeReservationStatus(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(STAFF_ROLES);
  const status = str(fd, "status");
  if (!(status in RESERVATION_STATUS)) return { errors: { status: "ステータスを選択してください" } };
  const r = await prisma.reservation.findUnique({ where: { id }, select: { status: true } });
  if (!r) return { error: "予約が見つかりません" };
  if (r.status === status) return { ok: true, message: "ステータスに変更はありません。" };

  await prisma.reservation.update({ where: { id }, data: { status } });
  const warnings: string[] = [];
  let slotNote = "";
  if (status === "CONFIRMED") {
    warnings.push(...(await bookSlots(id)));
    slotNote = "予約枠を「予約済」にしました。";
  } else if (status === "CANCELLED" || status === "PENDING" || status === "REVIEWING") {
    const n = await releaseSlots(id);
    if (n) slotNote = `予約枠 ${n} 件を「予約可能」に戻しました。`;
  }
  await audit(user.id, "status", "Reservation", id, { from: r.status, to: status });
  revalidatePath("/admin/reservations", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: `ステータスを「${RESERVATION_STATUS[status as keyof typeof RESERVATION_STATUS]}」に変更しました。${slotNote}`, warnings };
}

export async function saveReservationMemo(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(STAFF_ROLES);
  const memo = str(fd, "adminMemo");
  if (memo.length > 5000) return { errors: { adminMemo: "5000文字以内で入力してください" } };
  const r = await prisma.reservation.update({ where: { id }, data: { adminMemo: memo } }).catch(() => null);
  if (!r) return { error: "予約が見つかりません" };
  await audit(user.id, "update", "Reservation", id, { adminMemo: true });
  revalidatePath(`/admin/reservations/${id}`);
  return { ok: true, message: "メモを保存しました。" };
}
