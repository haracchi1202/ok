import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTherapistCards } from "@/lib/therapists";
import { toEmbedUrl } from "@/lib/video";
import { formatDateLong } from "@/lib/time";
import { stripMarkup, truncate } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RichText } from "@/components/ui/RichText";
import { TherapistRow } from "@/components/therapist/TherapistGrid";
import { Icon } from "@/components/ui/Icon";
import { ReserveBand } from "@/components/site/ReserveBand";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
const load = (slug: string) => prisma.feature.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: new Date() } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = await load((await params).slug);
  if (!f) return { title: "特集が見つかりません" };
  return { title: f.title, description: truncate(f.summary || stripMarkup(f.body), 110), alternates: { canonical: `/features/${f.slug}` }, openGraph: { images: f.imagePath ? [f.imagePath] : undefined } };
}

export default async function FeatureDetail({ params }: Props) {
  const f = await load((await params).slug);
  if (!f) notFound();
  const slugs = f.therapistSlugs.split(",").map((s) => s.trim()).filter(Boolean);
  const related = slugs.length ? (await getTherapistCards()).filter((c) => slugs.includes(c.slug)) : [];
  const embed = toEmbedUrl(f.videoUrl);
  return (
    <>
      <Breadcrumbs items={[{ name: "動画・特集", href: "/features" }, { name: f.title }]} />
      <article className="container-page mt-6 max-w-3xl">
        <p className="text-xs tracking-widest text-gold-deep">{f.kind === "VIDEO" ? "MOVIE" : "FEATURE"} ・ {formatDateLong(f.publishedAt)}</p>
        <h1 className="mt-2 text-2xl">{f.title}</h1>
        {embed ? (
          <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe src={embed} title={f.title} className="h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : f.imagePath ? (
          <div className="relative mt-6">
            <img src={f.imagePath} alt="" className="w-full rounded-2xl" />
            {f.kind === "VIDEO" && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ivory">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-ink"><Icon name="play" filled /></span>
                <span className="text-sm">動画準備中</span>
              </span>
            )}
          </div>
        ) : null}
        {f.summary && <p className="mt-6 font-serif text-lg text-ink-soft">{f.summary}</p>}
        <div className="card mt-6 p-6 text-[15px]"><RichText text={f.body} /></div>
      </article>
      {related.length > 0 && (
        <section className="container-page mt-12">
          <h2 className="mb-4 text-lg">登場したセラピスト</h2>
          <TherapistRow items={related} />
        </section>
      )}
      <ReserveBand />
    </>
  );
}
