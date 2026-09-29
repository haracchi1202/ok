import Link from "next/link";
import { MAIN_NAV, SUB_NAV } from "./Header";
import { CTAButton } from "@/components/ui/CTAButton";
import type { Settings } from "@/lib/settings";

export function Footer({ settings }: { settings: Settings }) {
  const legal = [
    { href: "/terms", label: "利用規約" },
    { href: "/privacy", label: "プライバシーポリシー" },
    { href: "/p/cancel-policy", label: "キャンセルポリシー" },
    { href: "/p/prohibited", label: "禁止事項" },
    ...(settings.legal_notice_enabled === "1" ? [{ href: "/p/legal", label: "法令に基づく表記" }] : []),
  ];
  const sns = [
    { href: settings.sns_x, label: "X" },
    { href: settings.sns_instagram, label: "Instagram" },
    { href: settings.sns_tiktok, label: "TikTok" },
  ].filter((s) => s.href);
  return (
    <footer className="mt-20 bg-night pb-24 text-ivory/80 lg:pb-0">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="font-display text-2xl tracking-[0.35em] text-gold-soft">{settings.site_name}</p>
          <p className="mt-2 text-sm">{settings.site_tagline}</p>
          <dl className="mt-6 space-y-1 text-sm">
            <div className="flex gap-3"><dt className="text-ivory/50">営業時間</dt><dd>{settings.business_hours}</dd></div>
            <div className="flex gap-3"><dt className="text-ivory/50">対応エリア</dt><dd>{settings.service_area}</dd></div>
            <div className="flex gap-3"><dt className="text-ivory/50">電話受付</dt><dd>{settings.phone}（{settings.phone_hours}）</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <CTAButton href="/reserve" variant="gold" size="sm" icon="calendar">予約フォーム</CTAButton>
            <CTAButton href={settings.line_url} variant="line" size="sm" icon="chat">{settings.line_label}</CTAButton>
          </div>
          {sns.length > 0 && (
            <ul className="mt-6 flex gap-4 text-sm">
              {sns.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-gold-soft">{s.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="フッターメニュー" className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <ul className="space-y-2">
            {MAIN_NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-gold-soft">{n.label}</Link></li>
            ))}
          </ul>
          <ul className="space-y-2">
            {SUB_NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-gold-soft">{n.label}</Link></li>
            ))}
          </ul>
          <ul className="space-y-2">
            {legal.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-gold-soft">{n.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ivory/40">
        © {new Date().getFullYear()} {settings.site_name} / {settings.company_name}
      </div>
    </footer>
  );
}
