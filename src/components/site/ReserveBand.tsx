import { CTAButton } from "@/components/ui/CTAButton";
import { getSettings } from "@/lib/settings";

/** ページ下部などに置く予約導線 (予約フォーム / 公式メッセージ / 電話) */
export async function ReserveBand({ title = "ご予約・ご相談はこちら", therapistSlug }: { title?: string; therapistSlug?: string }) {
  const s = await getSettings();
  const reserveHref = therapistSlug ? `/reserve?therapist=${therapistSlug}` : "/reserve";
  return (
    <section className="container-page mt-16">
      <div className="relative overflow-hidden rounded-3xl bg-night px-6 py-10 text-center text-ivory sm:px-12">
        <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-rose/20 blur-3xl" />
        <p className="font-display text-[11px] tracking-[0.4em] text-gold-soft">RESERVATION</p>
        <h2 className="mt-1 text-xl sm:text-2xl">{title}</h2>
        <p className="mt-2 text-sm text-ivory/70">{s.reservation_notice}</p>
        <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
          <CTAButton href={reserveHref} variant="gold" size="lg" icon="calendar" full>予約フォーム</CTAButton>
          <CTAButton href={s.line_url} variant="line" size="lg" icon="chat" full>{s.line_label}</CTAButton>
          <CTAButton href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} variant="outline" size="lg" icon="phone" full className="border-ivory/40 text-ivory hover:bg-ivory hover:text-ink">電話する</CTAButton>
        </div>
        <p className="mt-4 text-xs text-ivory/50">電話受付 {s.phone_hours}</p>
      </div>
    </section>
  );
}
