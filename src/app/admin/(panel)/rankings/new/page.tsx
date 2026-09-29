import type { Metadata } from "next";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { todayBusinessDate } from "@/lib/time";
import { saveRanking } from "@/lib/admin/ranking-actions";
import { therapistOptions } from "@/lib/admin/queries";
import { RankingForm } from "@/components/admin/RankingForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ランキング作成" };

export default async function RankingNewPage() {
  await requireUser(STAFF_ROLES);
  return (
    <>
      <PageHeader title="ランキング作成" description="保存後に「自動集計」で予約・口コミデータから順位を作成できます。" back={{ href: "/admin/rankings", label: "ランキング一覧" }} />
      <RankingForm
        values={{ type: "POPULAR", period: "WEEKLY", periodStart: todayBusinessDate(), title: "", isPublished: true }}
        entries={[]}
        therapists={await therapistOptions()}
        action={saveRanking.bind(null, null)}
      />
    </>
  );
}
