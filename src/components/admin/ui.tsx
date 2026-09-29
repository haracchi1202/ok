import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/States";

// 管理画面の共通 UI (サーバーコンポーネントからも利用可能なもの)

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none",
  primary: "h-10 px-4 text-sm bg-ink text-ivory hover:bg-ink-soft",
  secondary: "h-10 px-4 text-sm border border-line bg-white text-ink hover:border-gold",
  danger: "h-10 px-4 text-sm border border-danger/40 bg-white text-danger hover:bg-danger hover:text-white",
  sm: "h-8 px-3 text-xs border border-line bg-white text-ink hover:border-gold",
  smDanger: "h-8 px-3 text-xs border border-danger/40 bg-white text-danger hover:bg-danger hover:text-white",
};

export function b(kind: keyof typeof btn, className?: string) {
  return cn(btn.base, btn[kind], className);
}

export const tbl = {
  wrap: "overflow-x-auto rounded-xl border border-line bg-white",
  table: "w-full min-w-[640px] text-sm",
  th: "bg-ivory px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap",
  td: "border-t border-line px-3 py-2.5 align-middle",
};

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "warn" | "danger" | "info"; children: React.ReactNode }) {
  const cls = {
    ok: "border-ok/30 bg-ok-soft text-ok",
    warn: "border-warn/30 bg-warn-soft text-warn",
    danger: "border-danger/30 bg-danger/5 text-danger",
    info: "border-line bg-white text-ink-soft",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("mb-4 rounded-lg border px-4 py-2.5 text-sm", cls)}>
      {children}
    </div>
  );
}

/** ?saved=1 / ?deleted=1 などのフラッシュ表示 */
export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  if (params.saved) return <Notice>保存しました。</Notice>;
  if (params.created) return <Notice>作成しました。</Notice>;
  if (params.deleted) return <Notice>削除しました。</Notice>;
  if (params.denied) return <Notice tone="danger">この操作を行う権限がありません。</Notice>;
  return null;
}

export function Empty({ title = "データがありません", description, href, label }: { title?: string; description?: string; href?: string; label?: string }) {
  return <EmptyState title={title} description={description} actionHref={href} actionLabel={label} icon="info" />;
}

export function Pager(props: { page: number; total: number; pageSize: number; basePath: string; params: Record<string, string | undefined> }) {
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  return (
    <div className="[&_nav]:mt-6">
      <p className="mt-3 text-right text-xs text-muted">全 {props.total} 件</p>
      <Pagination page={props.page} totalPages={totalPages} basePath={props.basePath} params={props.params} />
    </div>
  );
}

const pillTones = {
  gray: "bg-ng-soft text-ng",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger/10 text-danger",
  gold: "bg-gold/15 text-gold-deep",
  rose: "bg-rose-soft text-rose",
  ink: "bg-ink text-ivory",
} as const;
export type PillTone = keyof typeof pillTones;

export function Pill({ tone = "gray", children }: { tone?: PillTone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", pillTones[tone])}>{children}</span>;
}

export const STATUS_TONES: Record<string, PillTone> = {
  PENDING: "warn",
  REVIEWING: "gold",
  CONFIRMED: "ok",
  COMPLETED: "gray",
  CANCELLED: "danger",
  PUBLISHED: "ok",
  HIDDEN: "gray",
  DRAFT: "gray",
  NEW: "warn",
  IN_PROGRESS: "gold",
  DONE: "gray",
  ACTIVE: "ok",
  RETIRED: "danger",
  WORKING: "ok",
  OFF: "gray",
  TBD: "warn",
  AVAILABLE: "ok",
  BOOKED: "rose",
  INQUIRY: "warn",
  CLOSED: "gray",
};

export function StatusPill({ status, labels }: { status: string; labels: Record<string, string> }) {
  return <Pill tone={STATUS_TONES[status] ?? "gray"}>{labels[status] ?? status}</Pill>;
}

/** GET 検索フォームのラッパー */
export function FilterBar({ children, action }: { children: React.ReactNode; action: string }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3">
      {children}
      <button className={b("secondary")} type="submit">
        <Icon name="search" className="h-4 w-4" />
        絞り込み
      </button>
      <Link href={action} className="self-center text-xs text-muted underline">
        クリア
      </Link>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export const inputSm = "h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-gold focus:outline-none";

export function MarkupHint() {
  return (
    <p className="mt-1 text-xs text-muted">
      書式: <code>## 見出し</code> / <code>- 箇条書き</code> / <code>**太字**</code> / <code>[リンク文字](https://...)</code>。空行で段落を区切ります。
    </p>
  );
}

export function StatCard({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: "warn" | "ok" }) {
  const inner = (
    <div className="rounded-xl border border-line bg-white p-4 transition hover:border-gold">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink")}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
