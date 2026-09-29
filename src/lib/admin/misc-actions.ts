"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertUser, STAFF_ROLES } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { INQUIRY_STATUS } from "@/lib/constants";
import { SETTING_DEFS, type SettingKey } from "@/lib/settings";
import { isHttpUrl, str, type FormState } from "./form";

export async function setInquiryStatus(id: string, fd: FormData): Promise<void> {
  const user = await assertUser(STAFF_ROLES);
  const status = str(fd, "status");
  if (!(status in INQUIRY_STATUS)) return;
  await prisma.inquiry.update({ where: { id }, data: { status } });
  await audit(user.id, "status", "Inquiry", id, { status });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
}

const NUMERIC: SettingKey[] = ["reservation_lead_minutes", "slot_minutes", "now_window_minutes"];

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(STAFF_ROLES);
  const keys = Object.keys(SETTING_DEFS) as SettingKey[];
  const errors: Record<string, string> = {};
  const values: Partial<Record<SettingKey, string>> = {};
  for (const k of keys) {
    const v = (fd.get(k) ?? "").toString().replace(/\r\n/g, "\n").trim();
    if (v.length > 2000) errors[k] = "2000文字以内で入力してください";
    else if ((k.endsWith("_url") || k.startsWith("sns_")) && !isHttpUrl(v)) errors[k] = "http(s):// から始まる URL を入力してください (空欄可)";
    else if (NUMERIC.includes(k) && !/^\d+$/.test(v)) errors[k] = "半角数字で入力してください";
    else if (k === "slot_minutes" && (Number(v) < 10 || Number(v) > 240)) errors[k] = "10〜240 の範囲で入力してください";
    else if (k.endsWith("_enabled") && !["0", "1"].includes(v)) errors[k] = "0 または 1 を入力してください";
    else if (k === "admin_notify_email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[k] = "メールアドレスの形式が正しくありません";
    values[k] = v;
  }
  if (Object.keys(errors).length) return { errors };
  const current = new Map((await prisma.siteSetting.findMany()).map((s) => [s.key, s.value]));
  const changed = keys.filter((k) => (current.get(k) ?? SETTING_DEFS[k].default) !== values[k]);
  await prisma.$transaction(changed.map((k) => prisma.siteSetting.upsert({ where: { key: k }, create: { key: k, value: values[k]! }, update: { value: values[k]! } })));
  await audit(user.id, "update", "SiteSetting", "", { keys: changed });
  revalidatePath("/", "layout");
  return { ok: true, message: changed.length ? `${changed.length} 件の設定を保存しました。` : "変更はありませんでした。" };
}
