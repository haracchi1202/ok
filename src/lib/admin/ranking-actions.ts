"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertUser, STAFF_ROLES } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { RANKING_PERIODS, RANKING_TYPES } from "@/lib/constants";
import { isValidDateString } from "@/lib/time";
import { bool, str, type FormState } from "./form";
import { aggregate, previousRanks } from "./ranking";

function refresh() {
  revalidatePath("/admin/rankings", "layout");
  revalidatePath("/", "layout");
}

export async function saveRanking(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(STAFF_ROLES);
  const type = str(fd, "type");
  const period = str(fd, "period");
  const periodStart = str(fd, "periodStart");
  const title = str(fd, "title").slice(0, 100);
  const errors: Record<string, string> = {};
  if (!(type in RANKING_TYPES)) errors.type = "種別を選択してください";
  if (!(period in RANKING_PERIODS)) errors.period = "期間を選択してください";
  if (!isValidDateString(periodStart)) errors.periodStart = "開始日を入力してください";

  // エントリー行
  const tIds = fd.getAll("entry_therapistId").map(String);
  const ranks = fd.getAll("entry_rank").map(String);
  const scores = fd.getAll("entry_score").map(String);
  const entries: { therapistId: string; rank: number; score: number }[] = [];
  const seen = new Set<string>();
  tIds.forEach((therapistId, i) => {
    if (!therapistId) return;
    const rank = Number(ranks[i]);
    const score = Number(scores[i] || 0);
    if (!Number.isInteger(rank) || rank < 1 || rank > 999) errors[`entry_${i}`] = "順位は 1 以上の整数で入力してください";
    else if (!Number.isInteger(score) || score < 0) errors[`entry_${i}`] = "スコアは 0 以上の整数で入力してください";
    else if (seen.has(therapistId)) errors[`entry_${i}`] = "同じセラピストが重複しています";
    seen.add(therapistId);
    entries.push({ therapistId, rank, score });
  });
  if (Object.keys(errors).length) return { errors };

  const dup = await prisma.ranking.findFirst({ where: { type, period, periodStart, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (dup) return { errors: { periodStart: "同じ種別・期間・開始日のランキングが既にあります" } };
  const valid = new Set((await prisma.therapist.findMany({ where: { id: { in: entries.map((e) => e.therapistId) } }, select: { id: true } })).map((t) => t.id));
  const prev = await previousRanks(type, period, periodStart);
  const create = entries.filter((e) => valid.has(e.therapistId)).map((e) => ({ ...e, previousRank: prev.get(e.therapistId) ?? null }));
  const data = { type, period, periodStart, title, isPublished: bool(fd, "isPublished"), source: "MANUAL" };

  const saved = id
    ? await prisma.ranking.update({ where: { id }, data: { ...data, entries: { deleteMany: {}, create } } })
    : await prisma.ranking.create({ data: { ...data, entries: { create } } });
  await audit(user.id, id ? "update" : "create", "Ranking", saved.id, { type, period, periodStart, entries: create.length });
  refresh();
  redirect(`/admin/rankings/${saved.id}?saved=1`);
}

export async function autoAggregateRanking(id: string): Promise<void> {
  const user = await assertUser(STAFF_ROLES);
  const r = await prisma.ranking.findUnique({ where: { id } });
  if (!r) redirect("/admin/rankings");
  const [scores, prev] = await Promise.all([aggregate(r.type, r.period, r.periodStart), previousRanks(r.type, r.period, r.periodStart)]);
  const create = scores.map((s, i) => ({ ...s, rank: i + 1, previousRank: prev.get(s.therapistId) ?? null }));
  await prisma.ranking.update({ where: { id }, data: { source: "AUTO", entries: { deleteMany: {}, create } } });
  await audit(user.id, "aggregate", "Ranking", id, { entries: create.length });
  refresh();
  redirect(`/admin/rankings/${id}?aggregated=${create.length}`);
}

export async function deleteRanking(id: string): Promise<void> {
  const user = await assertUser(STAFF_ROLES);
  await prisma.ranking.delete({ where: { id } }).catch(() => null);
  await audit(user.id, "delete", "Ranking", id);
  refresh();
  redirect("/admin/rankings?deleted=1");
}
