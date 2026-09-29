"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertUser, canEditTherapist, STAFF_ROLES, type SessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { THERAPIST_STATUS } from "@/lib/constants";
import { randomSlug } from "@/lib/format";
import { deleteImage, IMAGE_PRESETS, saveImage } from "@/lib/storage";
import { bool, isHttpUrl, SLUG_RE, str, zodErrors, type FormState } from "./form";

const url = z
  .string()
  .max(500)
  .refine(isHttpUrl, "http(s):// から始まる URL を入力してください")
  .transform((v) => v || null);

// セラピスト本人も編集できる項目
const selfSchema = z.object({
  catchCopy: z.string().max(100, "100文字以内で入力してください"),
  selfMessage: z.string().max(3000, "3000文字以内で入力してください"),
  snsX: url,
  snsInstagram: url,
  snsTiktok: url,
});

const int = (label: string, min: number, max: number) =>
  z
    .string()
    .min(1, `${label}を入力してください`)
    .regex(/^\d+$/, "半角数字で入力してください")
    .transform(Number)
    .refine((n) => n >= min && n <= max, `${min}〜${max} の範囲で入力してください`);

const fullSchema = selfSchema.extend({
  slug: z
    .string()
    .max(60)
    .refine((v) => v === "" || SLUG_RE.test(v), "半角英小文字・数字・ハイフンのみ使用できます"),
  name: z.string().min(1, "名前を入力してください").max(30),
  nameKana: z
    .string()
    .min(1, "ふりがなを入力してください")
    .max(60)
    .regex(/^[ぁ-んー\s]+$/, "ひらがなで入力してください"),
  age: int("年齢", 18, 99),
  height: int("身長", 100, 220),
  shopComment: z.string().max(3000, "3000文字以内で入力してください"),
  status: z.enum(Object.keys(THERAPIST_STATUS) as [string, ...string[]], { message: "ステータスを選択してください" }),
  isNewcomer: z.boolean(),
  canOvernight: z.boolean(),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
  nominationFee: z
    .string()
    .refine((v) => v === "" || /^\d+$/.test(v), "半角数字で入力してください")
    .transform((v) => (v === "" ? null : Number(v))),
  recommendOrder: int("おすすめ順", 0, 100000),
  popularityScore: int("人気スコア", 0, 10000000),
  repeatScore: int("リピートスコア", 0, 10000000),
  currentAreaId: z.string().transform((v) => v || null),
  videoUrl: url,
});

const SELF_KEYS = ["catchCopy", "selfMessage", "snsX", "snsInstagram", "snsTiktok"] as const;
const FULL_KEYS = [
  ...SELF_KEYS,
  "slug",
  "name",
  "nameKana",
  "age",
  "height",
  "shopComment",
  "status",
  "joinedAt",
  "nominationFee",
  "recommendOrder",
  "popularityScore",
  "repeatScore",
  "currentAreaId",
  "videoUrl",
] as const;

function rawFrom(fd: FormData, keys: readonly string[]) {
  const raw: Record<string, unknown> = {};
  for (const k of keys) raw[k] = str(fd, k);
  return raw;
}

/** プロフィール質問の回答を保存 (空欄は削除) */
async function saveAnswers(therapistId: string, fd: FormData) {
  const questions = await prisma.profileQuestion.findMany({ where: { isActive: true }, select: { id: true } });
  for (const q of questions) {
    const answer = str(fd, `answer_${q.id}`).slice(0, 500);
    if (answer) {
      await prisma.profileAnswer.upsert({
        where: { therapistId_questionId: { therapistId, questionId: q.id } },
        create: { therapistId, questionId: q.id, answer },
        update: { answer },
      });
    } else {
      await prisma.profileAnswer.deleteMany({ where: { therapistId, questionId: q.id } });
    }
  }
}

export async function saveTherapist(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(STAFF_ROLES);
  const raw = { ...rawFrom(fd, FULL_KEYS), isNewcomer: bool(fd, "isNewcomer"), canOvernight: bool(fd, "canOvernight") };
  const parsed = fullSchema.safeParse(raw);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { joinedAt, ...rest } = parsed.data;
  const data = { ...rest, slug: rest.slug || randomSlug("t"), joinedAt: new Date(`${joinedAt}T00:00:00+09:00`) };

  const errors: Record<string, string> = {};
  const dup = await prisma.therapist.findFirst({ where: { slug: data.slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (dup) errors.slug = "既に使用されています";
  if (data.currentAreaId && !(await prisma.area.findUnique({ where: { id: data.currentAreaId } }))) errors.currentAreaId = "エリアが見つかりません";
  if (Object.keys(errors).length) return { errors };

  const tagIds = fd.getAll("tagIds").map(String);
  const validTags = tagIds.length ? await prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true } }) : [];
  const tags = validTags.map((t) => ({ tagId: t.id }));

  const saved = id
    ? await prisma.therapist.update({ where: { id }, data: { ...data, tags: { deleteMany: {}, create: tags } } })
    : await prisma.therapist.create({ data: { ...data, tags: { create: tags } } });
  await saveAnswers(saved.id, fd);
  await audit(user.id, id ? "update" : "create", "Therapist", saved.id, { name: saved.name });
  revalidatePath("/", "layout");
  redirect(`/admin/therapists/${saved.id}?saved=1`);
}

export async function saveMyProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(["THERAPIST", "ADMIN", "STAFF"]);
  if (!user.therapistId) return { error: "セラピストが紐づいていません" };
  const parsed = selfSchema.safeParse(rawFrom(fd, SELF_KEYS));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  await prisma.therapist.update({ where: { id: user.therapistId }, data: parsed.data });
  await saveAnswers(user.therapistId, fd);
  await audit(user.id, "update", "Therapist", user.therapistId, { self: true });
  revalidatePath("/", "layout");
  return { ok: true, message: "プロフィールを保存しました。" };
}

export async function deleteTherapist(id: string): Promise<void> {
  const user = await assertUser(STAFF_ROLES);
  const t = await prisma.therapist.findUnique({ where: { id }, include: { images: true } });
  if (!t) redirect("/admin/therapists");
  await prisma.therapist.delete({ where: { id } });
  for (const img of t.images) {
    await deleteImage(img.path);
    await deleteImage(img.thumbPath);
  }
  await audit(user.id, "delete", "Therapist", id, { name: t.name });
  revalidatePath("/", "layout");
  redirect("/admin/therapists?deleted=1");
}

// ───────── 写真 ─────────

async function assertPhotoAccess(therapistId: string): Promise<SessionUser> {
  const user = await assertUser();
  if (!canEditTherapist(user, therapistId)) throw new Error("FORBIDDEN");
  return user;
}

/** sortOrder を 0.. に振り直す */
async function normalize(therapistId: string, orderedIds?: string[]) {
  const ids = orderedIds ?? (await prisma.therapistImage.findMany({ where: { therapistId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } })).map((i) => i.id);
  await prisma.$transaction(ids.map((id, i) => prisma.therapistImage.update({ where: { id }, data: { sortOrder: i } })));
}

function revalidatePhotos(therapistId: string) {
  revalidatePath(`/admin/therapists/${therapistId}`);
  revalidatePath("/admin/profile");
  revalidatePath("/", "layout");
}

export async function uploadPhotos(therapistId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await assertPhotoAccess(therapistId);
  const files = fd.getAll("photos").filter((f): f is File => typeof f === "object" && "size" in f && f.size > 0);
  if (files.length === 0) return { error: "画像を選択してください" };
  if (files.length > 10) return { error: "一度にアップロードできるのは 10 枚までです" };
  const count = await prisma.therapistImage.count({ where: { therapistId } });
  if (count + files.length > 30) return { error: "写真は 1 人 30 枚までです" };
  const t = await prisma.therapist.findUnique({ where: { id: therapistId }, select: { name: true } });
  if (!t) return { error: "セラピストが見つかりません" };
  const failed: string[] = [];
  let order = count;
  for (const f of files) {
    try {
      const saved = await saveImage(f, "therapists", IMAGE_PRESETS.therapist);
      await prisma.therapistImage.create({ data: { therapistId, ...saved, alt: t.name, sortOrder: order++ } });
    } catch (e) {
      failed.push(`${f.name}: ${e instanceof Error ? e.message : "保存できませんでした"}`);
    }
  }
  await audit(user.id, "upload", "TherapistImage", therapistId, { count: files.length - failed.length });
  revalidatePhotos(therapistId);
  return failed.length ? { error: failed.join(" / ") } : { ok: true, message: `${files.length} 枚アップロードしました。` };
}

export async function photoAction(therapistId: string, imageId: string, fd: FormData): Promise<void> {
  const user = await assertPhotoAccess(therapistId);
  const op = str(fd, "op");
  const img = await prisma.therapistImage.findFirst({ where: { id: imageId, therapistId } });
  if (!img) return;
  const list = (await prisma.therapistImage.findMany({ where: { therapistId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } })).map((i) => i.id);
  const idx = list.indexOf(imageId);
  if (op === "main" || op === "up" || op === "down") {
    list.splice(idx, 1);
    const to = op === "main" ? 0 : op === "up" ? Math.max(0, idx - 1) : Math.min(list.length, idx + 1);
    list.splice(to, 0, imageId);
    await normalize(therapistId, list);
  } else if (op === "alt") {
    await prisma.therapistImage.update({ where: { id: imageId }, data: { alt: str(fd, "alt").slice(0, 100) } });
  } else if (op === "delete") {
    await prisma.therapistImage.delete({ where: { id: imageId } });
    await deleteImage(img.path);
    await deleteImage(img.thumbPath);
    await normalize(therapistId);
  } else return;
  await audit(user.id, `photo_${op}`, "TherapistImage", imageId, { therapistId });
  revalidatePhotos(therapistId);
}
