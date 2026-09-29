import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getPublishedReviews } from "@/lib/content";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReviewCard } from "@/components/content/ReviewCard";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { CTAButton } from "@/components/ui/CTAButton";
import { ReserveBand } from "@/components/site/ReserveBand";
import { TherapistSelectNav } from "@/components/content/TherapistSelectNav";

export const dynamic = "force-dynamic";
const PER = 12;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { therapist } = await searchParams;
  const t = therapist ? await prisma.therapist.findFirst({ where: { slug: therapist, status: "ACTIVE" } }) : null;
  return { title: t ? `${t.name}の口コミ` : "口コミ一覧", description: "実際にご利用いただいた方の口コミ・体験談。", alternates: { canonical: t ? `/reviews?therapist=${t.slug}` : "/reviews" } };
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const therapists = await prisma.therapist.findMany({ where: { status: "ACTIVE" }, orderBy: { recommendOrder: "asc" }, select: { id: true, slug: true, name: true } });
  const t = therapists.find((x) => x.slug === sp.therapist);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { status: "PUBLISHED", therapist: { status: "ACTIVE" }, ...(t ? { therapistId: t.id } : {}) };
  const [items, total, agg] = await Promise.all([
    getPublishedReviews(PER, t?.id, (page - 1) * PER),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);
  return (
    <>
      <Breadcrumbs items={t ? [{ name: "口コミ", href: "/reviews" }, { name: t.name }] : [{ name: "口コミ" }]} />
      <PageHero en="REVIEWS" title={t ? `${t.name}の口コミ` : "口コミ一覧"} lead={`${total}件 ／ 平均評価 ${(agg._avg.rating ?? 0).toFixed(1)}`}>
        <div className="mt-4 flex flex-wrap gap-2">
          <TherapistSelectNav therapists={therapists} current={t?.slug ?? ""} basePath="/reviews" />
          <CTAButton href={`/reviews/new${t ? `?therapist=${t.slug}` : ""}`} variant="outline" size="sm" icon="pen">口コミを投稿</CTAButton>
          {t && <CTAButton href={`/therapists/${t.slug}`} variant="ghost" size="sm" className="border border-line">プロフィールへ</CTAButton>}
        </div>
      </PageHero>
      <div className="container-page mt-6">
        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <ReviewCard key={r.id} r={r} clamp={false} showTherapist={!t} />
            ))}
          </div>
        ) : (
          <EmptyState title="口コミはまだありません" />
        )}
        <Pagination page={page} totalPages={Math.ceil(total / PER)} basePath="/reviews" params={{ therapist: t?.slug }} />
      </div>
      <ReserveBand therapistSlug={t?.slug} />
    </>
  );
}
