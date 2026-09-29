import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLatestDiaries, publishedDiaryWhere } from "@/lib/content";
import { siteUrl } from "@/lib/settings";
import { formatDateTime } from "@/lib/time";
import { truncate } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";
import { DiaryCard } from "@/components/content/DiaryCard";
import { CTAButton } from "@/components/ui/CTAButton";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

const load = (slug: string) =>
  prisma.diary.findFirst({ where: { slug, ...publishedDiaryWhere() }, include: { therapist: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return { title: "日記が見つかりません" };
  return {
    title: `${d.title}｜${d.therapist.name}の日記`,
    description: truncate(d.body, 110),
    alternates: { canonical: `/diary/${d.slug}` },
    openGraph: { type: "article", images: d.imagePath ? [d.imagePath] : undefined },
  };
}

export default async function DiaryPage({ params }: Props) {
  const d = await load((await params).slug);
  if (!d) notFound();
  const more = (await getLatestDiaries(5, d.therapistId)).filter((x) => x.id !== d.id).slice(0, 4);
  const avatar = d.therapist.images[0]?.thumbPath;
  return (
    <>
      <Breadcrumbs items={[{ name: "日記", href: "/diary" }, { name: d.therapist.name, href: `/diary?therapist=${d.therapist.slug}` }, { name: d.title }]} />
      <article className="container-page mt-6 max-w-3xl">
        <Link href={`/therapists/${d.therapist.slug}`} className="flex items-center gap-3">
          {avatar && <img src={avatar} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />}
          <div>
            <p className="font-serif tracking-widest">{d.therapist.name}</p>
            <p className="text-xs text-muted">{formatDateTime(d.publishedAt)}</p>
          </div>
        </Link>
        <h1 className="mt-6 text-2xl">{d.title}</h1>
        {d.imagePath && <img src={d.imagePath} alt="" className="mt-6 w-full rounded-2xl" />}
        <div className="mt-6 text-[15px] leading-loose whitespace-pre-line">{d.body}</div>
        <div className="card mt-10 flex flex-col items-center gap-3 p-5 sm:flex-row sm:justify-between">
          <p className="font-serif">{d.therapist.name}に会いに行く</p>
          <div className="flex gap-2">
            <CTAButton href={`/therapists/${d.therapist.slug}#schedule`} variant="outline" size="sm" icon="clock">空き状況</CTAButton>
            <CTAButton href={`/reserve?therapist=${d.therapist.slug}`} variant="gold" size="sm" icon="calendar">予約する</CTAButton>
          </div>
        </div>
      </article>
      {more.length > 0 && (
        <section className="container-page mt-12">
          <h2 className="mb-4 text-lg">{d.therapist.name}の他の日記</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{more.map((x) => <DiaryCard key={x.id} d={x} showTherapist={false} />)}</div>
        </section>
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: d.title,
          datePublished: d.publishedAt.toISOString(),
          dateModified: d.updatedAt.toISOString(),
          author: { "@type": "Person", name: d.therapist.name, url: `${siteUrl}/therapists/${d.therapist.slug}` },
          image: d.imagePath ? `${siteUrl}${d.imagePath}` : undefined,
          mainEntityOfPage: `${siteUrl}/diary/${d.slug}`,
        }}
      />
    </>
  );
}
