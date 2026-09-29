import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** クエリパラメータを保持したままページを切り替えるページネーション */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const q = sp.toString();
    return q ? `${basePath}?${q}` : basePath;
  };
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  const btn = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm";
  return (
    <nav aria-label="ページ送り" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(btn, "border border-line bg-white")} aria-label="前のページ">
          <Icon name="chevronLeft" className="h-4 w-4" />
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(btn, p === page ? "bg-ink text-ivory" : "border border-line bg-white hover:border-gold")}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className={cn(btn, "border border-line bg-white")} aria-label="次のページ">
          <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
