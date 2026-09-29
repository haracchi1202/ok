import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { RANKING_PERIODS, RANKING_TYPES, label } from "@/lib/constants";
import { formatDateShort, addDays } from "@/lib/time";
import { autoAggregateRanking, deleteRanking, saveRanking } from "@/lib/admin/ranking-actions";
import { periodEnd } from "@/lib/admin/ranking";
import { therapistOptions } from "@/lib/admin/queries";
import { RankingForm } from "@/components/admin/RankingForm";
import { ConfirmForm } from "@/components/admin/client";
import { b, Flash, Notice, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ランキング編集" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RankingEditPage({ params, searchParams }: Props) {
  await requireUser(STAFF_ROLES);
  const { id } = await params;
  const q = await searchParams;
  const r = await prisma.ranking.findUnique({ where: { id }, include: { entries: { orderBy: { rank: "asc" } } } });
  if (!r) notFound();
  const end = addDays(periodEnd(r.periodStart, r.period), -1);
  return (
    <>
      <PageHeader
        title={`${label(RANKING_TYPES, r.type)} (${label(RANKING_PERIODS, r.period)})`}
        description={`集計期間: ${formatDateShort(r.periodStart)} 〜 ${formatDateShort(end)} / ${r.source === "AUTO" ? "自動集計" : "手動"}`}
        back={{ href: "/admin/rankings", label: "ランキング一覧" }}
        actions={
          <>
            <ConfirmForm action={autoAggregateRanking.bind(null, r.id)} confirmText="現在の順位を破棄し、期間内のデータから自動集計します。よろしいですか？">
              <button className={b("secondary")}>自動集計</button>
            </ConfirmForm>
            <ConfirmForm action={deleteRanking.bind(null, r.id)}>
              <button className={b("danger")}>削除</button>
            </ConfirmForm>
          </>
        }
      />
      {q.aggregated !== undefined && <Notice>自動集計しました ({String(q.aggregated)} 名)。</Notice>}
      <Flash params={q} />
      <RankingForm
        key={r.updatedAt.getTime()}
        values={{ type: r.type, period: r.period, periodStart: r.periodStart, title: r.title, isPublished: r.isPublished }}
        entries={r.entries}
        therapists={await therapistOptions()}
        action={saveRanking.bind(null, r.id)}
      />
    </>
  );
}
