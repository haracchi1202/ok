import type { Metadata } from "next";
import { TherapistListing } from "@/components/therapist/TherapistListing";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReserveBand } from "@/components/site/ReserveBand";

export const metadata: Metadata = {
  title: "新人セラピスト",
  description: "入店したばかりの新人セラピスト一覧。フレッシュな魅力をご覧ください。",
  alternates: { canonical: "/newcomers" },
};

export default async function NewcomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  return (
    <>
      <Breadcrumbs items={[{ name: "新人セラピスト" }]} />
      <PageHero en="NEW FACE" title="新人セラピスト" lead="新しく仲間入りしたセラピストたち。研修を終えた安心のメンバーです。" />
      <div className="container-page mt-4">
        <TherapistListing raw={raw} basePath="/newcomers" preset={{ newcomer: true, sort: "newcomer" }} hideKeys={["newcomer"]} />
      </div>
      <ReserveBand />
    </>
  );
}
