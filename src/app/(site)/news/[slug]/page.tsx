import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/settings";
import { formatDateLong } from "@/lib/time";
import { stripMarkup, truncate } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RichText } from "@/components/ui/RichText";
import { JsonLd } from "@/components/ui/JsonLd";
import { CTAButton } from "@/components/ui/CTAButton";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
const load = (slug: string) => prisma.news.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: new Date() } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await load((await params).slug);
  if (!n) return { title: "記事が見つかりません" };
  return { title: n.title, description: truncate(stripMarkup(n.body), 110), alternates: { canonical: `/news/${n.slug}` }, openGraph: { type: "article" } };
}

export default async function NewsDetail({ params }: Props) {
  const n = await load((await params).slug);
  if (!n) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: "ニュース", href: "/news" }, { name: n.title }]} />
      <article className="container-page mt-6 max-w-3xl">
        <time className="text-xs text-muted" dateTime={n.publishedAt.toISOString()}>{formatDateLong(n.publishedAt)}</time>
        <h1 className="mt-2 text-2xl">{n.title}</h1>
        <div className="card mt-6 p-6 text-[15px]">
          <RichText text={n.body} />
        </div>
        <div className="mt-8">
          <CTAButton href="/news" variant="outline" size="sm">ニュース一覧へ</CTAButton>
        </div>
      </article>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: n.title, datePublished: n.publishedAt.toISOString(), dateModified: n.updatedAt.toISOString(), mainEntityOfPage: `${siteUrl}/news/${n.slug}` }} />
    </>
  );
}
