import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { getSettings, settingNumber } from "./settings";
import { ceilToMinutes, formatShift, todayBusinessDate, toJstTime, toBusinessDate, toJstDateString } from "./time";
import { kanaRow, toHiragana } from "./kana";
import { RANKING_TYPES, type RankingType, type SortKey, SORT_OPTIONS } from "./constants";

// 一覧・カードで利用するシリアライズ可能なセラピストデータ
export type CardTag = { name: string; slug: string; group: string };
export type TherapistCardData = {
  id: string;
  slug: string;
  name: string;
  nameKana: string;
  age: number;
  height: number;
  catchCopy: string;
  thumb: string | null;
  imageAlt: string;
  tags: CardTag[];
  isNewcomer: boolean;
  joinedAt: string;
  canOvernight: boolean;
  areaName: string | null;
  recommendOrder: number;
  popularityScore: number;
  repeatScore: number;
  shift: { date: string; label: string; startAt: string; endAt: string; note: string } | null;
  workingNow: boolean;
  nextAvailable: string | null; // ISO
  nextAvailableLabel: string | null; // "14:30" / "翌1:30"
  nextAvailableTime24: string | null; // 予約フォーム用 "25:30"
  canBookNow: boolean;
  availableSlotCount: number;
  ranks: Partial<Record<RankingType, number>>;
  bestRank: { type: RankingType; label: string; rank: number } | null;
};

type Loaded = Awaited<ReturnType<typeof loadTherapists>>[number];

async function loadTherapists(date: string) {
  return prisma.therapist.findMany({
    where: { status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      tags: { include: { tag: true } },
      currentArea: true,
      schedules: {
        where: { date, status: "WORKING" },
        include: { slots: { orderBy: { startAt: "asc" } } },
      },
    },
    orderBy: [{ recommendOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** 各ランキング種別の最新 (公開) ランキングから therapistId → 順位 を得る */
export const getLatestRanks = cache(async () => {
  const map = new Map<string, Partial<Record<RankingType, number>>>();
  for (const type of Object.keys(RANKING_TYPES) as RankingType[]) {
    const ranking = await prisma.ranking.findFirst({
      where: { type, isPublished: true, period: "MONTHLY" },
      orderBy: { periodStart: "desc" },
      include: { entries: true },
    });
    for (const e of ranking?.entries ?? []) {
      const m = map.get(e.therapistId) ?? {};
      m[type] = e.rank;
      map.set(e.therapistId, m);
    }
  }
  return map;
});

function toCard(
  t: Loaded,
  date: string,
  now: Date,
  ranks: Map<string, Partial<Record<RankingType, number>>>,
  opts: { leadMinutes: number; windowMinutes: number },
): TherapistCardData {
  const s = t.schedules[0];
  const earliest = new Date(now.getTime() + opts.leadMinutes * 60000);
  const isToday = date === todayBusinessDate(now);
  let nextAvailable: Date | null = null;
  let availableSlotCount = 0;
  if (s) {
    for (const slot of s.slots) {
      if (slot.status !== "AVAILABLE") continue;
      if (isToday && slot.endAt <= earliest) continue;
      availableSlotCount++;
      if (!nextAvailable) {
        const candidate = isToday && slot.startAt < earliest ? ceilToMinutes(earliest, 10) : slot.startAt;
        nextAvailable = candidate < slot.endAt ? candidate : slot.startAt;
      }
    }
  }
  const r = ranks.get(t.id) ?? {};
  let bestRank: TherapistCardData["bestRank"] = null;
  for (const [type, rank] of Object.entries(r) as [RankingType, number][]) {
    if (rank <= 10 && (!bestRank || rank < bestRank.rank)) bestRank = { type, label: RANKING_TYPES[type].replace("ランキング", ""), rank };
  }
  const workingNow = !!s && isToday && s.startAt <= now && now < s.endAt;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    nameKana: t.nameKana,
    age: t.age,
    height: t.height,
    catchCopy: t.catchCopy,
    thumb: t.images[0]?.thumbPath ?? null,
    imageAlt: t.images[0]?.alt || `${t.name}の写真`,
    tags: t.tags
      .filter((x) => x.tag.isActive)
      .sort((a, b) => a.tag.sortOrder - b.tag.sortOrder)
      .map((x) => ({ name: x.tag.name, slug: x.tag.slug, group: x.tag.group })),
    isNewcomer: t.isNewcomer,
    joinedAt: t.joinedAt.toISOString(),
    canOvernight: t.canOvernight,
    areaName: t.currentArea?.name ?? null,
    recommendOrder: t.recommendOrder,
    popularityScore: t.popularityScore,
    repeatScore: t.repeatScore,
    shift: s
      ? { date: s.date, label: formatShift(s.startAt, s.endAt, s.date), startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString(), note: s.note }
      : null,
    workingNow,
    nextAvailable: nextAvailable?.toISOString() ?? null,
    nextAvailableLabel: nextAvailable ? formatShift(nextAvailable, nextAvailable, date).split("〜")[0] : null,
    nextAvailableTime24: nextAvailable ? businessTimeLabel(nextAvailable, date) : null,
    canBookNow:
      isToday && !!nextAvailable && nextAvailable.getTime() - now.getTime() <= (opts.windowMinutes + opts.leadMinutes) * 60000,
    availableSlotCount,
    ranks: r,
    bestRank,
  };
}

/** 指定営業日の状態で全公開セラピストのカードデータを返す */
export const getTherapistCards = cache(async (date?: string): Promise<TherapistCardData[]> => {
  const now = new Date();
  const d = date ?? todayBusinessDate(now);
  const [list, ranks, settings] = await Promise.all([loadTherapists(d), getLatestRanks(), getSettings()]);
  const opts = {
    leadMinutes: settingNumber(settings, "reservation_lead_minutes", 60),
    windowMinutes: settingNumber(settings, "now_window_minutes", 120),
  };
  return list.map((t) => toCard(t, d, now, ranks, opts));
});

// ───────── 検索 ─────────

export type SearchParams = {
  q?: string;
  initial?: string;
  ageMin?: number;
  ageMax?: number;
  heightMin?: number;
  heightMax?: number;
  today?: boolean;
  now?: boolean;
  overnight?: boolean;
  newcomer?: boolean;
  tags?: string[];
  sort?: SortKey;
  page?: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function num(v: string | string[] | undefined, min: number, max: number): number | undefined {
  const n = Number(one(v));
  return one(v) && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : undefined;
}

export function parseSearchParams(raw: RawParams): SearchParams {
  const sort = one(raw.sort);
  const tags = (Array.isArray(raw.tags) ? raw.tags.join(",") : raw.tags ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .slice(0, 20);
  return {
    q: one(raw.q)?.trim().slice(0, 50) || undefined,
    initial: one(raw.initial)?.slice(0, 1) || undefined,
    ageMin: num(raw.ageMin, 18, 99),
    ageMax: num(raw.ageMax, 18, 99),
    heightMin: num(raw.heightMin, 140, 220),
    heightMax: num(raw.heightMax, 140, 220),
    today: one(raw.today) === "1",
    now: one(raw.now) === "1",
    overnight: one(raw.overnight) === "1",
    newcomer: one(raw.newcomer) === "1",
    tags,
    sort: sort && sort in SORT_OPTIONS ? (sort as SortKey) : "recommend",
    page: num(raw.page, 1, 999) ?? 1,
  };
}

export function filterTherapists(cards: TherapistCardData[], p: SearchParams): TherapistCardData[] {
  const q = p.q ? toHiragana(p.q.toLowerCase()) : null;
  return cards.filter((t) => {
    if (q) {
      const hay = toHiragana(`${t.name} ${t.nameKana} ${t.catchCopy} ${t.tags.map((x) => x.name).join(" ")}`.toLowerCase());
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (p.initial && kanaRow(t.nameKana) !== p.initial) return false;
    if (p.ageMin && t.age < p.ageMin) return false;
    if (p.ageMax && t.age > p.ageMax) return false;
    if (p.heightMin && t.height < p.heightMin) return false;
    if (p.heightMax && t.height > p.heightMax) return false;
    if (p.today && !t.shift) return false;
    if (p.now && !t.canBookNow) return false;
    if (p.overnight && !t.canOvernight) return false;
    if (p.newcomer && !t.isNewcomer) return false;
    if (p.tags?.length) {
      const own = new Set(t.tags.map((x) => x.slug));
      if (!p.tags.every((s) => own.has(s))) return false; // AND 検索
    }
    return true;
  });
}

const BIG = 9999;
export function sortTherapists(cards: TherapistCardData[], sort: SortKey = "recommend"): TherapistCardData[] {
  const list = [...cards];
  const by = (fn: (t: TherapistCardData) => number | string) => (a: TherapistCardData, b: TherapistCardData) => {
    const x = fn(a);
    const y = fn(b);
    return x < y ? -1 : x > y ? 1 : a.recommendOrder - b.recommendOrder;
  };
  switch (sort) {
    case "shift":
      return list.sort(by((t) => t.shift?.startAt ?? "9999"));
    case "popular":
      return list.sort(by((t) => (t.ranks.POPULAR ?? BIG) * 100000 - t.popularityScore));
    case "repeat":
      return list.sort(by((t) => (t.ranks.REPEAT ?? BIG) * 100000 - t.repeatScore));
    case "newcomer":
      return list.sort(by((t) => (t.isNewcomer ? 0 : 1) * 1e13 - new Date(t.joinedAt).getTime() / 1000));
    case "heightDesc":
      return list.sort(by((t) => -t.height));
    case "heightAsc":
      return list.sort(by((t) => t.height));
    case "ageAsc":
      return list.sort(by((t) => t.age));
    case "ageDesc":
      return list.sort(by((t) => -t.age));
    default:
      // おすすめ: 今すぐ予約可能 → 本日出勤 → おすすめ順
      return list.sort(by((t) => (t.canBookNow ? 0 : t.shift ? 1 : 2) * 10000 + t.recommendOrder));
  }
}

export const PAGE_SIZE = 24;

export async function searchTherapists(p: SearchParams) {
  const all = await getTherapistCards();
  const filtered = sortTherapists(filterTherapists(all, p), p.sort);
  const page = p.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  return {
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    totalPages,
  };
}

export const getActiveTags = cache(async () =>
  prisma.tag.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { sortOrder: "asc" }] }),
);

// ───────── 詳細 ─────────

export const getTherapistBySlug = cache(async (slug: string) => {
  return prisma.therapist.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
      currentArea: true,
      answers: { include: { question: true }, where: { question: { isActive: true } } },
      rankingEntries: {
        where: { ranking: { isPublished: true } },
        include: { ranking: true },
        orderBy: { ranking: { periodStart: "desc" } },
        take: 12,
      },
      events: { include: { event: true }, where: { event: { isPublished: true } } },
    },
  });
});

/** 営業日 from から days 日分の出勤と予約枠 */
export async function getScheduleRange(therapistId: string, from: string, dates: string[]) {
  const rows = await prisma.schedule.findMany({
    where: { therapistId, date: { in: dates } },
    include: { slots: { orderBy: { startAt: "asc" } } },
  });
  const now = new Date();
  return dates.map((date) => {
    const s = rows.find((r) => r.date === date);
    return {
      date,
      schedule: s
        ? {
            status: s.status,
            label: formatShift(s.startAt, s.endAt, s.date),
            note: s.note,
            slots: s.slots.map((x) => ({
              id: x.id,
              time24: businessTimeLabel(x.startAt, s.date),
              label: formatShift(x.startAt, x.endAt, s.date).split("〜")[0],
              status: x.endAt <= now ? "CLOSED" : x.status,
            })),
          }
        : null,
    };
  });
}

/** 営業日基準の "HH:MM" (翌日の時刻は 24 を加算: 翌1:00 → "25:00") */
export function businessTimeLabel(at: Date, businessDate: string): string {
  const t = toJstTime(at);
  if (toJstDateString(at) > businessDate) {
    const [h, m] = t.split(":");
    return `${Number(h) + 24}:${m}`;
  }
  return t;
}

export { toBusinessDate };
