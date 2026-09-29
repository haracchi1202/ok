import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { issueFormToken } from "@/lib/form-guard";
import { todayBusinessDate } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReviewForm } from "@/components/forms/ReviewForm";

export const metadata: Metadata = { title: "口コミを投稿する", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { therapist = "" } = await searchParams;
  const therapists = await prisma.therapist.findMany({ where: { status: "ACTIVE" }, orderBy: { recommendOrder: "asc" }, select: { slug: true, name: true } });
  return (
    <>
      <Breadcrumbs items={[{ name: "口コミ", href: "/reviews" }, { name: "投稿" }]} />
      <PageHero en="WRITE A REVIEW" title="口コミを投稿する" lead="ご利用いただいた感想をお聞かせください。スタッフ確認後に公開されます。" />
      <div className="container-page mt-6 max-w-2xl">
        <ReviewForm therapists={therapists} initialTherapist={therapists.some((t) => t.slug === therapist) ? therapist : ""} formToken={issueFormToken()} today={todayBusinessDate()} />
      </div>
    </>
  );
}
