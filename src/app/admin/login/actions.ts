"use server";

import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import type { FormState } from "@/lib/admin/form";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードを入力してください").max(200),
});

// ユーザーが存在しない場合も比較処理を行い、応答時間で存在有無が推測されないようにする
const DUMMY_HASH = "$2b$10$OqSB7gFmXwmtFM9Dq0PGQOwEDgAVm1l.AykxxgOgqO2ejF6wUJCPe";

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const rl = rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000);
  if (!rl.ok) return { error: `ログイン試行回数が上限に達しました。${Math.ceil(rl.retryAfter / 60)}分後に再度お試しください。` };

  const user = await prisma.adminUser.findUnique({ where: { email } });
  const ok = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    await audit(user?.id ?? null, "login_failed", "AdminUser", user?.id ?? "", { email });
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit(user.id, "login", "AdminUser", user.id);
  redirect("/admin");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "logout", "AdminUser", user.id);
  await destroySession();
  redirect("/admin/login");
}
