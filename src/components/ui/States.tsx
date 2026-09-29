import { Icon, type IconName } from "./Icon";
import { CTAButton } from "./CTAButton";

export function EmptyState({
  title = "該当するデータがありません",
  description,
  icon = "moon",
  actionHref,
  actionLabel,
}: {
  title?: string;
  description?: string;
  icon?: IconName;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <Icon name={icon} className="mb-3 h-8 w-8 text-gold" />
      <p className="font-serif text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {actionHref && actionLabel && (
        <CTAButton href={actionHref} variant="outline" size="sm" className="mt-5">
          {actionLabel}
        </CTAButton>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="font-serif text-danger">読み込み中にエラーが発生しました</p>
      <p className="mt-1 text-sm text-muted">{message ?? "時間をおいて再度お試しください。"}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-sm text-gold-deep underline">
          再読み込み
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className ?? ""}`} />;
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" aria-busy="true" aria-label="読み込み中">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
