import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [therapists, diaries, news, events, features, pages] = await Promise.all([
    prisma.therapist.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.diary.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: now }, therapist: { status: "ACTIVE" } }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" }, take: 2000 }),
    prisma.news.findMany({ where: { isPublished: true, publishedAt: { lte: now } }, select: { slug: true, updatedAt: true } }),
    prisma.event.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    prisma.feature.findMany({ where: { isPublished: true, publishedAt: { lte: now } }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/therapists", "/newcomers", "/today", "/now", "/schedule", "/ranking", "/price", "/price/simulator", "/reviews", "/diary", "/news", "/events", "/features", "/faq", "/contact", "/reserve"];
  const pagePath = (slug: string) => (["guide", "about", "access", "terms", "privacy"].includes(slug) ? `/${slug}` : `/p/${slug}`);
  return [
    ...staticPaths.map((p) => ({ url: `${siteUrl}${p}`, lastModified: now, changeFrequency: "hourly" as const, priority: p === "" ? 1 : 0.8 })),
    ...therapists.map((t) => ({ url: `${siteUrl}/therapists/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "daily" as const, priority: 0.9 })),
    ...diaries.map((d) => ({ url: `${siteUrl}/diary/${d.slug}`, lastModified: d.updatedAt, priority: 0.5 })),
    ...news.map((n) => ({ url: `${siteUrl}/news/${n.slug}`, lastModified: n.updatedAt, priority: 0.5 })),
    ...events.map((e) => ({ url: `${siteUrl}/events/${e.slug}`, lastModified: e.updatedAt, priority: 0.6 })),
    ...features.map((f) => ({ url: `${siteUrl}/features/${f.slug}`, lastModified: f.updatedAt, priority: 0.6 })),
    ...pages.map((p) => ({ url: `${siteUrl}${pagePath(p.slug)}`, lastModified: p.updatedAt, priority: 0.4 })),
  ];
}
