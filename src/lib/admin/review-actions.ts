"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertUser, STAFF_ROLES } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { REVIEW_STATUS } from "@/lib/constants";
import { str, zodErrors, type FormState } from "./form";

function refresh() {
  revalidatePath("/admin/reviews", "layout");
  revalidatePath("/", "layout");
}

export async function setReviewStatus(id: string, fd: FormData): Promise<void> {
  const user = await assertUser(STAFF_ROLES);
  const status = str(fd, "status");
  if (!(status in REVIEW_STATUS)) return;
  await prisma.review.update({ where: { id }, data: { status } });
  await audit(user.id, "status", "Review", id, { status });
  refresh();
}

const schema = z.object({
  nickname: z.string().min(1, "ニックネームを入力してください").max(30, "30文字以内で入力してください"),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
  rating: z.coerce.number().int().min(1, "1〜5 で入力してください").max(5, "1〜5 で入力してください"),
  title: z.string().min(1, "タイトルを入力してください").max(60, "60文字以内で入力してください"),
  body: z.string().min(1, "本文を入力してください").max(3000, "3000文字以内で入力してください"),
  tags: z.string().max(200),
  shopReply: z.string().max(2000, "2000文字以内で入力してください"),
  status: z.enum(Object.keys(REVIEW_STATUS) as [string, ...string[]]),
});

export async function saveReview(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(STAFF_ROLES);
  const raw = Object.fromEntries(Object.keys(schema.shape).map((k) => [k, str(fd, k)]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const tags = parsed.data.tags
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(",");
  await prisma.review.update({ where: { id }, data: { ...parsed.data, tags } });
  await audit(user.id, "update", "Review", id);
  refresh();
  redirect("/admin/reviews?saved=1");
}

export async function deleteReview(id: string): Promise<void> {
  const user = await assertUser(STAFF_ROLES);
  await prisma.review.delete({ where: { id } }).catch(() => null);
  await audit(user.id, "delete", "Review", id);
  refresh();
  redirect("/admin/reviews?deleted=1");
}
