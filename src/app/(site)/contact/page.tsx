import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { issueFormToken } from "@/lib/form-guard";
import { getSettings } from "@/lib/settings";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ContactForm } from "@/components/forms/ContactForm";
import { CTAButton } from "@/components/ui/CTAButton";

export const metadata: Metadata = { title: "お問い合わせ", description: "ご質問・ご相談はこちらから。", alternates: { canonical: "/contact" } };
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { therapist } = await searchParams;
  const [s, t] = await Promise.all([getSettings(), therapist ? prisma.therapist.findFirst({ where: { slug: therapist, status: "ACTIVE" } }) : null]);
  return (
    <>
      <Breadcrumbs items={[{ name: "お問い合わせ" }]} />
      <PageHero en="CONTACT" title="お問い合わせ" lead="お急ぎの方は公式メッセージまたはお電話が便利です。" />
      <div className="container-page mt-6 grid max-w-5xl gap-8 lg:grid-cols-[1fr_18rem]">
        <ContactForm formToken={issueFormToken()} defaultMessage={t ? `${t.name}について問い合わせ：\n` : ""} />
        <aside className="space-y-3">
          <CTAButton href={s.line_url} variant="line" icon="chat" full>{s.line_label}</CTAButton>
          <CTAButton href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} variant="outline" icon="phone" full>{s.phone}</CTAButton>
          <p className="text-center text-xs text-muted">電話受付 {s.phone_hours}</p>
          <CTAButton href="/faq" variant="ghost" full className="border border-line">よくある質問を見る</CTAButton>
        </aside>
      </div>
    </>
  );
}
