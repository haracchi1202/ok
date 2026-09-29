import type { Metadata } from "next";
import Link from "next/link";
import { getRanking } from "@/lib/content";
import { RANKING_PERIODS, RANKING_TYPES, type RankingPeriod, type RankingType } from "@/lib/constants";
import { formatDateLong } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RankingCard } from "@/components/content/RankingCard";
import { EmptyState } from "@/components/ui/States";
import { ReserveBand } from "@/components/site/ReserveBand";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "ランキング", description: "人気・リピート・新人・応援ランキング。デイリー / 週間 / 月間で確認できます。", alternates: { canonical: "/ranking" } };
export const dynamic = "force-dynamic";

export default async function RankingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const type = (sp.type && sp.type in RANKING_TYPES ? sp.type : "POPULAR") as RankingType;
  const period = (sp.period && sp.period in RANKING_PERIODS ? sp.period : "MONTHLY") as RankingPeriod;
  const ranking = await getRanking(type, period);
  const tab = "flex h-10 shrink-0 items-center rounded-full px-4 text-sm whitespace-nowrap";
  return (
    <>
      <Breadcrumbs items={[{ name: "ランキング" }]} />
      <PageHero en="RANKING" title="ランキング" lead="実際のご予約・リピート・口コミをもとにしたランキングです。" />
      <div className="container-page mt-6">
        <nav className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="ランキング種別">
          {(Object.keys(RANKING_TYPES) as RankingType[]).map((t) => (
            <Link key={t} href={`/ranking?type=${t}&period=${period}`} scroll={false} aria-current={t === type ? "page" : undefined} className={cn(tab, t === type ? "bg-ink text-ivory" : "bg-white ring-1 ring-line")}>
              {RANKING_TYPES[t]}
            </Link>
          ))}
        </nav>
        <nav className="mt-3 flex gap-2" aria-label="集計期間">
          {(Object.keys(RANKING_PERIODS) as RankingPeriod[]).map((p) => (
            <Link key={p} href={`/ranking?type=${type}&period=${p}`} scroll={false} aria-current={p === period ? "page" : undefined} className={cn("rounded-full px-3 py-1 text-xs", p === period ? "bg-gold text-white" : "text-muted ring-1 ring-line")}>
              {RANKING_PERIODS[p]}
            </Link>
          ))}
        </nav>
        {ranking && ranking.entries.length ? (
          <>
            <p className="mt-6 text-xs text-muted">
              {ranking.title || `${RANKING_TYPES[type]}（${RANKING_PERIODS[period]}）`} ／ 集計開始 {formatDateLong(ranking.periodStart)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {ranking.entries.slice(0, 3).map((e) => (
                <RankingCard key={e.id} item={e} large />
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ranking.entries.slice(3).map((e) => (
                <RankingCard key={e.id} item={e} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon="crown" title="このランキングはまだ公開されていません" description="別の期間・種別をお選びください。" />
        )}
      </div>
      <ReserveBand />
    </>
  );
}
