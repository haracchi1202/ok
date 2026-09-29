import type { Metadata } from "next";
import { TherapistListing } from "@/components/therapist/TherapistListing";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReserveBand } from "@/components/site/ReserveBand";
import { formatDateShort, todayBusinessDate } from "@/lib/time";
import { CTAButton } from "@/components/ui/CTAButton";

export const metadata: Metadata = {
  title: "本日出勤のセラピスト",
  description: "本日出勤するセラピストと出勤時間・空き状況の一覧です。",
  alternates: { canonical: "/today" },
};
export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  return (
    <>
      <Breadcrumbs items={[{ name: "本日出勤" }]} />
      <PageHero en="TODAY" title={`本日出勤 ${formatDateShort(todayBusinessDate())}`} lead="出勤時間順に表示しています。時間帯ごとの空きはプロフィールで確認できます。">
        <div className="mt-4 flex gap-2">
          <CTAButton href="/now" variant="gold" size="sm" icon="clock">今すぐ会える人だけ見る</CTAButton>
          <CTAButton href="/schedule" variant="outline" size="sm" icon="calendar">週間スケジュール</CTAButton>
        </div>
      </PageHero>
      <div className="container-page mt-4">
        <TherapistListing raw={raw} basePath="/today" preset={{ today: true, sort: "shift" }} hideKeys={["today"]} />
      </div>
      <ReserveBand />
    </>
  );
}
