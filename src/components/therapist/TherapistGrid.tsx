import type { TherapistCardData } from "@/lib/therapists";
import { TherapistCard } from "./TherapistCard";
import { EmptyState } from "@/components/ui/States";

export function TherapistGrid({
  items,
  empty,
  ranked,
  dateLabel,
}: {
  items: TherapistCardData[];
  empty?: React.ReactNode;
  ranked?: boolean;
  dateLabel?: string;
}) {
  if (!items.length) return <>{empty ?? <EmptyState title="該当するセラピストがいません" description="条件を変えて再度お探しください。" actionHref="/therapists" actionLabel="すべてのセラピストを見る" />}</>;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
      {items.map((t, i) => (
        <TherapistCard key={t.id} t={t} priority={i < 4} rank={ranked ? i + 1 : undefined} dateLabel={dateLabel} />
      ))}
    </div>
  );
}

/** TOP 等で使う横スクロール行 (スマホ) / グリッド (PC) */
export function TherapistRow({ items, ranked }: { items: TherapistCardData[]; ranked?: boolean }) {
  if (!items.length) return <EmptyState title="現在表示できるセラピストがいません" />;
  return (
    <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {items.map((t, i) => (
        <div key={t.id} className="w-[42vw] max-w-[200px] shrink-0 snap-start sm:w-auto sm:max-w-none">
          <TherapistCard t={t} rank={ranked ? i + 1 : undefined} compact />
        </div>
      ))}
    </div>
  );
}
