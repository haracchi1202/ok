"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type NavItem = { href: string; label: string };

export function MobileMenu({ main, sub, settings }: { main: NavItem[]; sub: NavItem[]; settings: { phone: string; line_url: string; line_label: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ivory/90 hover:bg-white/10"
        aria-label="メニューを開く"
        aria-expanded={open}
      >
        <Icon name="menu" className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-night text-ivory" role="dialog" aria-modal="true" aria-label="サイトメニュー">
          <div className="container-page flex h-14 items-center justify-between">
            <span className="font-display tracking-[0.35em] text-gold-soft">MENU</span>
            <button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="メニューを閉じる">
              <Icon name="close" className="h-6 w-6" />
            </button>
          </div>
          <div className="container-page flex-1 overflow-y-auto pb-28">
            <ul className="grid grid-cols-2 gap-2">
              {main.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="flex h-14 items-center justify-between rounded-xl bg-white/5 px-4 text-[15px] hover:bg-white/10">
                    {n.label}
                    <Icon name="chevronRight" className="h-4 w-4 text-gold-soft" />
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ivory/75">
              {sub.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block py-2 hover:text-gold-soft">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-3">
              <Link href="/reserve" className="flex h-14 items-center justify-center gap-2 rounded-full bg-gold text-white">
                <Icon name="calendar" /> 予約フォームへ
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <a href={settings.line_url} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#2e9d5b] text-sm">
                  <Icon name="chat" className="h-4 w-4" /> {settings.line_label}
                </a>
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 text-sm">
                  <Icon name="phone" className="h-4 w-4" /> 電話する
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
