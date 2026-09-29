import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import type { PriceMaster } from "./pricing";
import type { RankingPeriod, RankingType } from "./constants";

const now = () => new Date();

export const publishedDiaryWhere = () => ({ status: "PUBLISHED", publishedAt: { lte: now() }, therapist: { status: "ACTIVE" } });

export async function getLatestDiaries(take = 6, therapistId?: string) {
  return prisma.diary.findMany({
    where: { ...publishedDiaryWhere(), ...(therapistId ? { therapistId } : {}) },
    include: { therapist: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
    orderBy: { publishedAt: "desc" },
    take,
  });
}
export type DiaryWithTherapist = Awaited<ReturnType<typeof getLatestDiaries>>[number];

export async function getPublishedReviews(take = 6, therapistId?: string, skip = 0) {
  return prisma.review.findMany({
    where: { status: "PUBLISHED", therapist: { status: "ACTIVE" }, ...(therapistId ? { therapistId } : {}) },
    include: { therapist: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}
export type ReviewWithTherapist = Awaited<ReturnType<typeof getPublishedReviews>>[number];

export async function getReviewStats(therapistId: string) {
  const agg = await prisma.review.aggregate({
    where: { therapistId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  return { average: agg._avg.rating ?? 0, count: agg._count };
}

export async function getActiveBanners(position: string) {
  const n = now();
  return prisma.banner.findMany({
    where: {
      position,
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: n } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: n } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getNews(take = 5) {
  return prisma.news.findMany({ where: { isPublished: true, publishedAt: { lte: now() } }, orderBy: { publishedAt: "desc" }, take });
}

export async function getImportantNews() {
  return prisma.news.findMany({ where: { isPublished: true, isImportant: true, publishedAt: { lte: now() } }, orderBy: { publishedAt: "desc" }, take: 3 });
}

export async function getEvents(opts: { current?: boolean; take?: number } = {}) {
  const n = now();
  return prisma.event.findMany({
    where: { isPublished: true, ...(opts.current ? { OR: [{ endsAt: null }, { endsAt: { gte: n } }] } : {}) },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
    take: opts.take,
  });
}

export async function getFeatures(take?: number) {
  return prisma.feature.findMany({ where: { isPublished: true, publishedAt: { lte: now() } }, orderBy: { publishedAt: "desc" }, take });
}

export const getFaqs = cache(async () =>
  prisma.faq.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }] }),
);

export const getPage = cache(async (slug: string) => prisma.page.findFirst({ where: { slug, isPublished: true } }));

/** 指定種別・期間の最新公開ランキング */
export async function getRanking(type: RankingType, period: RankingPeriod = "MONTHLY") {
  return prisma.ranking.findFirst({
    where: { type, period, isPublished: true },
    orderBy: { periodStart: "desc" },
    include: {
      entries: {
        where: { therapist: { status: "ACTIVE" } },
        orderBy: { rank: "asc" },
        include: { therapist: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, tags: { include: { tag: true } } } } },
      },
    },
  });
}
export type RankingWithEntries = NonNullable<Awaited<ReturnType<typeof getRanking>>>;

export const getPriceMaster = cache(async (): Promise<PriceMaster> => {
  const n = now();
  const [courses, options, areas, campaigns, rules, therapists] = await Promise.all([
    prisma.course.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.option.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.area.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.campaign.findMany({
      where: {
        isActive: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: n } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: n } }] }],
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.priceRule.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.therapist.findMany({ where: { status: "ACTIVE" }, orderBy: { recommendOrder: "asc" }, select: { id: true, name: true, nominationFee: true, slug: true } }),
  ]);
  return {
    courses: courses.map((c) => ({ id: c.id, name: c.name, minutes: c.minutes, price: c.price, isOvernight: c.isOvernight })),
    options: options.map((o) => ({ id: o.id, name: o.name, price: o.price })),
    areas: areas.map((a) => ({ id: a.id, name: a.name, transportFee: a.transportFee })),
    campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, discountType: c.discountType, value: c.value, target: c.target, minCourseMinutes: c.minCourseMinutes })),
    therapists: therapists.map((t) => ({ id: t.id, name: t.name, nominationFee: t.nominationFee, slug: t.slug })),
    rules: Object.fromEntries(rules.map((r) => [r.key, r.amount])),
    ruleLabels: Object.fromEntries(rules.map((r) => [r.key, r.label])),
  };
});

/** 料金ページ表示用 (説明文を含む) */
export async function getPricePageData() {
  const [courses, options, areas, campaigns, rules] = await Promise.all([
    prisma.course.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.option.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.area.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getPriceMaster().then((m) => m.campaigns),
    prisma.priceRule.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const campaignDetails = await prisma.campaign.findMany({ where: { id: { in: campaigns.map((c) => c.id) } }, orderBy: { sortOrder: "asc" } });
  return { courses, options, areas, campaigns: campaignDetails, rules };
}
