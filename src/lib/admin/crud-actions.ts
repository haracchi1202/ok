"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertUser, STAFF_ROLES, type SessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "./form";
import { getResource, type ResourceDef } from "./resources";
import { delegate, deleteFiles, imagePaths, parseResourceForm, processImages, relationInclude, type Row } from "./crud";

async function load(key: string) {
  const r = getResource(key);
  if (!r) throw new Error("NOT_FOUND");
  const user = await assertUser(r.roles ?? STAFF_ROLES);
  return { r, user };
}

/** THERAPIST は自分の行のみ操作可能 */
function ownerOk(r: ResourceDef, user: SessionUser, row: Row | null) {
  if (!r.ownerField || user.role !== "THERAPIST" || !row) return true;
  return !!user.therapistId && row[r.ownerField] === user.therapistId;
}

export async function saveResource(key: string, id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const { r, user } = await load(key);
  const d = delegate(r);
  const current = id ? await d.findUnique({ where: { id } }) : null;
  if (id && !current) return { error: "対象のデータが見つかりません" };
  if (!ownerOk(r, user, current)) return { error: "このデータを編集する権限がありません" };

  // THERAPIST は所有者を自分に固定 (フォームの値は信用しない)
  if (r.ownerField && user.role === "THERAPIST") {
    if (!user.therapistId) return { error: "セラピストが紐づいていません" };
    fd.set(r.ownerField, user.therapistId);
  }

  const parsed = await parseResourceForm(r, fd, id);
  if (!parsed.ok) return { errors: parsed.errors };
  const data = parsed.data;
  const img = await processImages(r, fd, current, data);
  if (Object.keys(img.errors).length) {
    await deleteFiles(img.created);
    return { errors: img.errors };
  }
  for (const [rel, ids] of Object.entries(parsed.relations)) {
    const create = ids.map((therapistId) => ({ therapistId }));
    data[rel] = id ? { deleteMany: {}, create } : { create };
  }

  let saved: Row;
  try {
    saved = id ? await d.update({ where: { id }, data }) : await d.create({ data });
  } catch (e) {
    console.error(e);
    await deleteFiles(img.created);
    return { error: "保存に失敗しました。入力内容を確認してください" };
  }
  await deleteFiles(img.obsolete);
  await audit(user.id, id ? "update" : "create", r.entity, saved.id, { title: saved[r.titleField] });
  revalidatePath("/", "layout");
  redirect(`/admin/${r.key}?${id ? "saved" : "created"}=1`);
}

export async function deleteResource(key: string, id: string): Promise<void> {
  const { r, user } = await load(key);
  const d = delegate(r);
  const row = await d.findUnique({ where: { id }, include: relationInclude(r) });
  if (!row) redirect(`/admin/${r.key}`);
  if (!ownerOk(r, user, row)) throw new Error("FORBIDDEN");
  await d.delete({ where: { id } });
  await deleteFiles(imagePaths(r, row));
  await audit(user.id, "delete", r.entity, id, { title: row[r.titleField] });
  revalidatePath("/", "layout");
  redirect(`/admin/${r.key}?deleted=1`);
}
