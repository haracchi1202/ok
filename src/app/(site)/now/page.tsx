import type { Metadata } from "next";
import Link from "next/link";
import { getTherapistCards, sortTherapists } from "@/lib/therapists";
import { getSettings, settingNumber } from "@/lib/settings";
import { todayBusinessDate, toJstTime } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/States";
import { CTAButton } from "@/components/ui/CTAButton";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FavoriteButton } from "@/components/therapist/FavoriteButton";
import { ReserveBand } from "@/components/site/ReserveBand";
import { AutoRefresh } from "@/components/site/AutoRefresh";

export const metadata: Metadata = {
  title: "今すぐ会えるセラピスト",
  description: "現在時刻と出勤・予約状況を照合し、今すぐ受付可能なセラピストだけを表示しています。",
  alternates: { canonical: "/now" },
};
export const dynamic = "force-dynamic";

export default async function NowPage() {
  const [cards, settings] = await Promise.all([getTherapistCards(), getSettings()]);
  const list = sortTherapists(cards.filter((c) => c.canBookNow), "recommend").sort((a, b) => (a.nextAvailable ?? "").localeCompare(b.nextAvailable ?? ""));
  const later = sortTherapists(cards.filter((c) => c.shift && !c.canBookNow && c.nextAvailable), "shift");
  const lead = settingNumber(settings, "reservation_lead_minutes", 60);
  const today = todayBusinessDate();
  return (
    <>
      <AutoRefresh seconds={120} />
      <Breadcrumbs items={[{ name: "今すぐ会える" }]} />
      <PageHero en="AVAILABLE NOW" title="今すぐ会えるセラピスト" lead={`現在時刻（${toJstTime(new Date())}）と出勤・予約状況から、受付可能なセラピストだけを表示しています。最短受付時刻はご準備・移動のため現在から${lead}分後以降です。`} />
      <div className="container-page mt-6">
        {list.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <li key={t.id} className="card flex gap-4 overflow-hidden p-3">
                <Link href={`/therapists/${t.slug}`} className="relative w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                  {t.thumb && <img src={t.thumb} alt={t.imageAlt} width={420} height={560} loading="lazy" className="aspect-[3/4] h-full w-full object-cover" />}
                  {t.isNewcomer && <Badge tone="new" className="absolute top-1.5 left-1.5">NEW</Badge>}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/therapists/${t.slug}`}>
                      <p className="font-serif text-lg tracking-widest">{t.name}</p>
                      <p className="text-xs text-muted">{t.age}歳 / {t.height}cm</p>
                    </Link>
                    <FavoriteButton slug={t.slug} name={t.name} />
                  </div>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex gap-2">
                      <dt className="text-muted">最短受付</dt>
                      <dd className="font-display text-base leading-none text-ok">{t.nextAvailableLabel}〜</dd>
                    </div>
                    <div className="flex gap-2"><dt className="text-muted">対応時間</dt><dd>{t.shift?.label}</dd></div>
                    {t.areaName && (
                      <div className="flex items-center gap-2"><dt className="text-muted">現在地</dt><dd className="flex items-center gap-0.5"><Icon name="map" className="h-3 w-3" />{t.areaName}</dd></div>
                    )}
                  </dl>
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {t.tags.slice(0, 3).map((tag) => (
                      <li key={tag.slug} className="rounded-full bg-ivory px-2 py-0.5 text-[10.5px] text-muted ring-1 ring-line">#{tag.name}</li>
                    ))}
                  </ul>
                  <CTAButton href={`/reserve?therapist=${t.slug}&date=${today}&time=${t.nextAvailableTime24}`} variant="gold" size="sm" icon="calendar" className="mt-auto" full>
                    この人を予約
                  </CTAButton>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="clock" title="現在すぐにご案内できるセラピストはいません" description="この後の出勤予定や、明日以降のスケジュールからご予約いただけます。お急ぎの場合はお電話でご相談ください。" actionHref="/schedule" actionLabel="スケジュールを見る" />
        )}

        {later.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 text-lg">この後に空きがあるセラピスト</h2>
            <ul className="divide-y divide-line rounded-2xl bg-paper shadow-[var(--shadow-card)]">
              {later.map((t) => (
                <li key={t.id}>
                  <Link href={`/therapists/${t.slug}#schedule`} className="flex items-center gap-3 px-4 py-3 hover:bg-ivory/60">
                    {t.thumb && <img src={t.thumb} alt="" width={48} height={64} loading="lazy" className="h-16 w-12 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-serif tracking-widest">{t.name}</p>
                      <p className="text-xs text-muted">本日 {t.shift?.label}</p>
                    </div>
                    <Badge tone="ok">{t.nextAvailableLabel}〜 空きあり</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <ReserveBand />
    </>
  );
}
