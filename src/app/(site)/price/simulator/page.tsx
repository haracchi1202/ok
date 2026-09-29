import type { Metadata } from "next";
import { getPriceMaster } from "@/lib/content";
import { parseSimParams } from "@/lib/sim-params";
import { timeOptions } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PriceSimulator } from "@/components/price/PriceSimulator";

export const metadata: Metadata = {
  title: "料金シミュレーター",
  description: "セラピスト・コース・エリア・オプションを選ぶだけで、お支払い総額を明細付きで確認できます。",
  alternates: { canonical: "/price/simulator" },
};

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [raw, master] = await Promise.all([searchParams, getPriceMaster()]);
  const initial = parseSimParams(raw, master);
  if (!initial.course && master.courses[1]) initial.course = master.courses[1].id;
  return (
    <>
      <Breadcrumbs items={[{ name: "料金", href: "/price" }, { name: "料金シミュレーター" }]} />
      <PageHero en="SIMULATOR" title="料金シミュレーター" lead="条件を選ぶとリアルタイムでお支払い総額を計算します。内容はそのまま予約フォームに引き継げます。" />
      <div className="container-page mt-6 pb-10">
        <PriceSimulator master={master} initial={initial} times={timeOptions(10, 28, 30)} />
      </div>
    </>
  );
}
