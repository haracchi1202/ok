"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ADMIN_ONLY, assertUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { bool, str, zodErrors, type FormState } from "./form";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません").max(200),
  name: z.string().min(1, "名前を入力してください").max(50, "50文字以内で入力してください"),
  role: z.enum(Object.keys(ROLES) as [string, ...string[]], { message: "権限を選択してください" }),
  therapistId: z.string(),
  password: z.string().max(200),
  isActive: z.boolean(),
});

export async function saveUser(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await assertUser(ADMIN_ONLY);
  const parsed = schema.safeParse({
    email: str(fd, "email"),
    name: str(fd, "name"),
    role: str(fd, "role"),
    therapistId: str(fd, "therapistId"),
    password: (fd.get("password") ?? "").toString(),
    isActive: bool(fd, "isActive"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  const errors: Record<string, string> = {};
  if (!id && d.password.length < 10) errors.password = "パスワードは 10 文字以上で入力してください";
  if (id && d.password && d.password.length < 10) errors.password = "パスワードは 10 文字以上で入力してください";
  if (d.role === "THERAPIST") {
    if (!d.therapistId) errors.therapistId = "紐づけるセラピストを選択してください";
    else if (!(await prisma.therapist.findUnique({ where: { id: d.therapistId }, select: { id: true } }))) errors.therapistId = "セラピストが見つかりません";
  }
  // 自分自身の無効化・権限変更は不可 (管理者がいなくなるのを防ぐ)
  if (id === me.id) {
    if (!d.isActive) errors.isActive = "自分自身を無効化することはできません";
    if (d.role !== "ADMIN") errors.role = "自分自身の権限は変更できません";
  }
  const dup = await prisma.adminUser.findFirst({ where: { email: d.email, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (dup) errors.email = "このメールアドレスは既に登録されています";
  if (Object.keys(errors).length) return { errors };

  const data = {
    email: d.email,
    name: d.name,
    role: d.role,
    therapistId: d.role === "THERAPIST" ? d.therapistId : null,
    isActive: d.isActive,
    ...(d.password ? { passwordHash: await hash(d.password, 10) } : {}),
  };
  const saved = id
    ? await prisma.adminUser.update({ where: { id }, data })
    : await prisma.adminUser.create({ data: { ...data, passwordHash: data.passwordHash! } });
  await audit(me.id, id ? "update" : "create", "AdminUser", saved.id, { email: saved.email, role: saved.role, isActive: saved.isActive, passwordChanged: !!d.password });
  revalidatePath("/admin/users");
  redirect(`/admin/users?${id ? "saved" : "created"}=1`);
}
