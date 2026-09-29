"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import type { NavSection } from "@/lib/admin/nav";
import { logoutAction } from "@/app/admin/login/actions";

type Props = { nav: NavSection[]; userName: string; roleLabel: string; children: React.ReactNode };

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ nav, pathname }: { nav: NavSection[]; pathname: string }) {
  return (
    <nav aria-label="管理メニュー" className="space-y-5">
      {nav.map((s) => (
        <div key={s.title}>
          <p className="mb-1 px-3 text-[11px] font-medium tracking-widest text-muted">{s.title}</p>
          <ul className="space-y-0.5">
            {s.items.map((i) => {
              const active = isActive(pathname, i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active ? "bg-ink text-ivory" : "text-ink-soft hover:bg-ink/5",
                    )}
                  >
                    <Icon name={i.icon} className="h-4 w-4 shrink-0" />
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBox({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ivory px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="text-[11px] text-muted">{roleLabel}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-white hover:text-ink" title="ログアウト">
          <Icon name="logout" className="h-4 w-4" />
          <span>ログアウト</span>
        </button>
      </form>
    </div>
  );
}

export function AdminShell({ nav, userName, roleLabel, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="lg:flex">
      {/* デスクトップ: サイドバー */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <Link href="/admin" className="block px-5 pt-5 pb-4">
          <span className="font-display text-xl tracking-[0.2em]">LUEUR</span>
          <span className="ml-2 text-[11px] text-muted">管理画面</span>
        </Link>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavList nav={nav} pathname={pathname} />
        </div>
        <div className="border-t border-line p-3">
          <UserBox userName={userName} roleLabel={roleLabel} />
        </div>
      </aside>

      {/* モバイル: 上部バー + 折りたたみメニュー */}
      <header className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" className="font-display text-lg tracking-[0.2em]">
            LUEUR <span className="text-[11px] tracking-normal text-muted">管理</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/5"
          >
            <Icon name={open ? "close" : "menu"} />
            <span className="sr-only">メニュー</span>
          </button>
        </div>
        {open && (
          <div id="admin-mobile-menu" className="max-h-[calc(100dvh-3.5rem)] space-y-4 overflow-y-auto border-t border-line px-3 py-4">
            <UserBox userName={userName} roleLabel={roleLabel} />
            <NavList nav={nav} pathname={pathname} />
          </div>
        )}
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
