import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { NewsList } from "@/components/content/NewsList";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "ニュース・トピックス", description: "お知らせ・トピックス一覧。", alternates: { canonical: "/news" } };
export const dynamic = "force-dynamic";
const PER = 20;

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const where = { isPublished: true, publishedAt: { lte: new Date() } };
  const [items, total] = await Promise.all([
    prisma.news.findMany({ where, orderBy: { publishedAt: "desc" }, take: PER, skip: (page - 1) * PER }),
    prisma.news.count({ where }),
  ]);
  return (
    <>
      <Breadcrumbs items={[{ name: "ニュース" }]} />
      <PageHero en="NEWS" title="ニュース・トピックス" />
      <div className="container-page mt-6 max-w-3xl">
        {items.length ? <NewsList items={items} /> : <EmptyState title="お知らせはまだありません" />}
        <Pagination page={page} totalPages={Math.ceil(total / PER)} basePath="/news" params={{}} />
      </div>
    </>
  );
}
