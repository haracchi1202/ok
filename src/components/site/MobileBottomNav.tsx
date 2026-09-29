"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const ITEMS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "ホーム", icon: "home", match: (p) => p === "/" },
  { href: "/therapists", label: "探す", icon: "search", match: (p) => p.startsWith("/therapists") || p === "/newcomers" },
  { href: "/now", label: "今すぐ", icon: "clock", match: (p) => p === "/now" || p === "/today" },
  { href: "/schedule", label: "スケジュール", icon: "calendar", match: (p) => p.startsWith("/schedule") },
];

/** スマホ用の画面下固定ナビ。「予約」は常に強調表示する */
export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/reserve")) return null;
  return (
    <nav aria-label="クイックナビゲーション" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <li key={it.href}>
              <Link href={it.href} className={cn("flex flex-col items-center gap-0.5 text-[10.5px]", active ? "text-gold-deep" : "text-muted")} aria-current={active ? "page" : undefined}>
                <Icon name={it.icon} className="h-[22px] w-[22px]" />
                {it.label}
              </Link>
            </li>
          );
        })}
        <li className="flex justify-center">
          <Link href="/reserve" className="flex h-12 w-[58px] flex-col items-center justify-center rounded-2xl bg-gold text-[10.5px] text-white shadow-lg shadow-gold/30">
            <Icon name="calendar" className="h-5 w-5" />
            予約
          </Link>
        </li>
      </ul>
    </nav>
  );
}
