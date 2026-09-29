import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CTAButton } from "@/components/ui/CTAButton";
import { MobileMenu } from "./MobileMenu";
import type { Settings } from "@/lib/settings";

export const MAIN_NAV = [
  { href: "/therapists", label: "セラピスト" },
  { href: "/now", label: "今すぐ会える" },
  { href: "/schedule", label: "スケジュール" },
  { href: "/ranking", label: "ランキング" },
  { href: "/price", label: "料金" },
  { href: "/reviews", label: "口コミ" },
  { href: "/diary", label: "日記" },
  { href: "/guide", label: "初めての方へ" },
];

export const SUB_NAV = [
  { href: "/today", label: "本日出勤" },
  { href: "/newcomers", label: "新人" },
  { href: "/price/simulator", label: "料金シミュレーター" },
  { href: "/events", label: "イベント" },
  { href: "/news", label: "ニュース" },
  { href: "/features", label: "動画・特集" },
  { href: "/access", label: "待ち合わせ・利用場所" },
  { href: "/about", label: "サービスについて" },
  { href: "/faq", label: "よくある質問" },
  { href: "/favorites", label: "お気に入り" },
  { href: "/contact", label: "お問い合わせ" },
];

export function Header({ settings }: { settings: Settings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night/95 text-ivory backdrop-blur supports-[backdrop-filter]:bg-night/85">
      <div className="container-page flex h-14 items-center justify-between gap-4 lg:h-16">
        <Link href="/" className="flex shrink-0 items-baseline gap-2" aria-label={`${settings.site_name} ホーム`}>
          <span className="font-display text-[22px] tracking-[0.35em] text-gold-soft lg:text-2xl">{settings.site_name}</span>
          <span className="hidden text-[10px] tracking-widest whitespace-nowrap text-ivory/50 2xl:inline">{settings.site_tagline}</span>
        </Link>
        <nav aria-label="メインメニュー" className="hidden lg:block">
          <ul className="flex items-center gap-4 text-[13px] tracking-wider whitespace-nowrap xl:gap-5">
            {MAIN_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-ivory/80 transition hover:text-gold-soft">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
            className="hidden items-center gap-1.5 text-sm whitespace-nowrap text-ivory/80 hover:text-gold-soft xl:flex"
          >
            <Icon name="phone" className="h-4 w-4" />
            {settings.phone}
          </a>
          <CTAButton href="/reserve" variant="gold" size="sm" icon="calendar" className="hidden sm:inline-flex">
            予約する
          </CTAButton>
          <MobileMenu main={MAIN_NAV} sub={SUB_NAV} settings={{ phone: settings.phone, line_url: settings.line_url, line_label: settings.line_label }} />
        </div>
      </div>
    </header>
  );
}
