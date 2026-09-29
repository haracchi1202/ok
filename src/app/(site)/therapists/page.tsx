import type { Metadata } from "next";
import { TherapistListing } from "@/components/therapist/TherapistListing";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReserveBand } from "@/components/site/ReserveBand";

export const metadata: Metadata = {
  title: "セラピスト一覧・検索",
  description: "名前・年齢・身長・特徴タグ・本日出勤・今すぐ予約可能などの条件でセラピストを検索できます。",
  alternates: { canonical: "/therapists" },
};

export default async function TherapistsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  return (
    <>
      <Breadcrumbs items={[{ name: "セラピスト一覧" }]} />
      <PageHero en="THERAPISTS" title="セラピストを探す" lead="気になる条件を組み合わせて、あなたに合うセラピストを見つけてください。" />
      <div className="container-page mt-4">
        <TherapistListing raw={raw} basePath="/therapists" />
      </div>
      <ReserveBand />
    </>
  );
}
