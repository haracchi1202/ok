import type { Metadata } from "next";
import { getFaqs } from "@/lib/content";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FaqList } from "@/components/content/FaqList";
import { EmptyState } from "@/components/ui/States";
import { JsonLd } from "@/components/ui/JsonLd";
import { ReserveBand } from "@/components/site/ReserveBand";
import { CTAButton } from "@/components/ui/CTAButton";

export const metadata: Metadata = { title: "よくある質問", description: "ご予約・料金・当日の流れなど、よくいただくご質問をまとめました。", alternates: { canonical: "/faq" } };
export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const faqs = await getFaqs();
  const cats = [...new Set(faqs.map((f) => f.category))];
  return (
    <>
      <Breadcrumbs items={[{ name: "よくある質問" }]} />
      <PageHero en="FAQ" title="よくある質問">
        {cats.length > 1 && (
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="カテゴリ">
            {cats.map((c) => <a key={c} href={`#${encodeURIComponent(c)}`} className="chip">{c}</a>)}
          </nav>
        )}
      </PageHero>
      <div className="container-page mt-6 max-w-3xl space-y-10">
        {faqs.length === 0 && <EmptyState title="よくある質問を準備中です" />}
        {cats.map((c) => (
          <section key={c} id={encodeURIComponent(c)} className="scroll-mt-24">
            <h2 className="mb-3 text-lg">{c}</h2>
            <FaqList items={faqs.filter((f) => f.category === c)} />
          </section>
        ))}
        <div className="card p-6 text-center">
          <p className="font-serif">解決しない場合はお気軽にお問い合わせください</p>
          <CTAButton href="/contact" variant="outline" size="sm" className="mt-3">お問い合わせ</CTAButton>
        </div>
      </div>
      <ReserveBand />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
    </>
  );
}
