import type { Metadata } from "next";
import { getPricePageData } from "@/lib/content";
import { yen } from "@/lib/format";
import { formatDateLong } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PriceTable, FeeList } from "@/components/content/PriceTable";
import { CTAButton } from "@/components/ui/CTAButton";
import { ReserveBand } from "@/components/site/ReserveBand";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "料金システム",
  description: "コース料金・指名料・延長料金・交通費・深夜料金・オプション・キャンペーンのご案内。",
  alternates: { canonical: "/price" },
};
export const dynamic = "force-dynamic";

export default async function PricePage() {
  const { courses, options, areas, campaigns, rules } = await getPricePageData();
  const r = Object.fromEntries(rules.map((x) => [x.key, x]));
  const fees = [
    r.nomination_first && { label: r.nomination_first.label, value: yen(r.nomination_first.amount), note: "初めて指名するとき" },
    r.nomination_repeat && { label: r.nomination_repeat.label, value: yen(r.nomination_repeat.amount), note: "2回目以降の指名" },
    r.extension_fee && { label: r.extension_fee.label, value: yen(r.extension_fee.amount), note: r.extension_unit_minutes ? `${r.extension_unit_minutes.amount}分ごと` : undefined },
    r.late_night_fee && { label: r.late_night_fee.label, value: yen(r.late_night_fee.amount), note: r.late_night_fee.note },
  ].filter(Boolean) as { label: string; value: string; note?: string }[];

  return (
    <>
      <Breadcrumbs items={[{ name: "料金" }]} />
      <PageHero en="PRICE" title="料金システム" lead="すべて税込表示です。コース料金に、指名料・交通費などを加えた金額がお支払い総額になります。">
        <div className="mt-5 flex flex-wrap gap-2">
          <CTAButton href="/price/simulator" variant="gold" icon="yen">料金シミュレーターで総額を計算</CTAButton>
          <CTAButton href="/reserve" variant="outline" icon="calendar">予約する</CTAButton>
        </div>
      </PageHero>

      <div className="container-page mt-10 space-y-14">
        <section>
          <SectionHeader en="COURSE" title="コース料金" />
          {courses.length ? <PriceTable courses={courses} /> : <EmptyState title="コース情報を準備中です" />}
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader en="FEE" title="指名料・延長・深夜料金" />
            <FeeList rows={fees} />
            <p className="mt-2 text-xs text-muted">※ 一部のセラピストは個別の指名料が設定されています（プロフィールに記載）。</p>
          </div>
          <div>
            <SectionHeader en="TRANSPORT" title="エリア別 交通費" />
            <FeeList rows={areas.map((a) => ({ label: a.name, value: a.transportFee ? yen(a.transportFee) : "無料", note: a.note || undefined }))} />
          </div>
        </section>

        {options.length > 0 && (
          <section>
            <SectionHeader en="OPTION" title="オプション" />
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((o) => (
                <div key={o.id} className="card flex items-start justify-between gap-4 p-5">
                  <div>
                    <h3 className="font-serif">{o.name}</h3>
                    {o.description && <p className="mt-1 text-sm text-muted">{o.description}</p>}
                  </div>
                  <p className="font-medium whitespace-nowrap">+{yen(o.price)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {campaigns.length > 0 && (
          <section>
            <SectionHeader en="CAMPAIGN" title="開催中のキャンペーン" />
            <div className="grid gap-3 sm:grid-cols-2">
              {campaigns.map((c) => (
                <div key={c.id} className="card border-l-4 border-rose p-5">
                  <p className="font-serif text-base">{c.name}</p>
                  <p className="mt-1 font-display text-2xl text-rose">{c.discountType === "PERCENT" ? `${c.value}% OFF` : `${yen(c.value)} OFF`}</p>
                  {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                  {c.endsAt && <p className="mt-2 text-xs text-muted">{formatDateLong(c.endsAt)}まで</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card p-6">
          <h2 className="text-lg">お支払い総額の例</h2>
          <p className="mt-2 text-sm text-muted">
            コース料金 ＋ 指名料 ＋ 交通費 ＋（深夜料金）＋（オプション）−（キャンペーン割引）＝ お支払い総額
          </p>
          <CTAButton href="/price/simulator" variant="primary" icon="yen" className="mt-4">
            条件を選んで計算する
          </CTAButton>
        </section>
      </div>
      <ReserveBand />
    </>
  );
}
