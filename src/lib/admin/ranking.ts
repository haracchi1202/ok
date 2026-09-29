import "server-only";
import { prisma } from "@/lib/db";

// ランキングの集計期間と自動集計

export function periodEnd(start: string, period: string): string {
  const [y, m, d] = start.split("-").map(Number);
  const dt =
    period === "MONTHLY" ? new Date(Date.UTC(y, m, d)) : new Date(Date.UTC(y, m - 1, d + (period === "WEEKLY" ? 7 : 1)));
  return dt.toISOString().slice(0, 10);
}

/** 同じ種別・期間の直前のランキングにおける順位 */
export async function previousRanks(type: string, period: string, periodStart: string): Promise<Map<string, number>> {
  const prev = await prisma.ranking.findFirst({
    where: { type, period, periodStart: { lt: periodStart } },
    orderBy: { periodStart: "desc" },
    include: { entries: { select: { therapistId: true, rank: true } } },
  });
  return new Map(prev?.entries.map((e) => [e.therapistId, e.rank]) ?? []);
}

const TOP_N = 10;

/** 期間内のデータからスコアを算出 (スコア降順) */
export async function aggregate(type: string, period: string, periodStart: string): Promise<{ therapistId: string; score: number }[]> {
  const end = periodEnd(periodStart, period);
  const scores = new Map<string, number>();
  if (type === "SUPPORT") {
    const reviews = await prisma.review.findMany({
      where: { status: "PUBLISHED", createdAt: { gte: new Date(`${periodStart}T00:00:00+09:00`), lt: new Date(`${end}T00:00:00+09:00`) } },
      select: { therapistId: true, rating: true },
    });
    for (const r of reviews) scores.set(r.therapistId, (scores.get(r.therapistId) ?? 0) + r.rating);
  } else {
    const rows = await prisma.reservation.groupBy({
      by: ["therapistId"],
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        therapistId: { not: null },
        desiredDate: { gte: periodStart, lt: end },
        ...(type === "REPEAT" ? { isRepeat: true } : {}),
        ...(type === "NEWCOMER" ? { therapist: { isNewcomer: true } } : {}),
      },
      _count: { _all: true },
    });
    for (const r of rows) if (r.therapistId) scores.set(r.therapistId, r._count._all);
  }
  const active = await prisma.therapist.findMany({ where: { id: { in: [...scores.keys()] }, status: "ACTIVE" }, select: { id: true, name: true } });
  return active
    .map((t) => ({ therapistId: t.id, score: scores.get(t.id) ?? 0, name: t.name }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"))
    .slice(0, TOP_N)
    .map(({ therapistId, score }) => ({ therapistId, score }));
}
