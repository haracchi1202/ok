import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export type RankingItem = {
  rank: number;
  previousRank: number | null;
  score: number;
  therapist: { slug: string; name: string; age: number; height: number; catchCopy: string; images: { thumbPath: string; alt: string }[] };
};

export function RankMovement({ rank, previousRank }: { rank: number; previousRank: number | null }) {
  if (previousRank === null) return <Badge tone="new">NEW</Badge>;
  if (previousRank > rank)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-ok" aria-label={`前回${previousRank}位から上昇`}>
        <Icon name="arrowUp" className="h-3.5 w-3.5" />UP
      </span>
    );
  if (previousRank < rank)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-rose" aria-label={`前回${previousRank}位から下降`}>
        <Icon name="arrowDown" className="h-3.5 w-3.5" />DOWN
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted" aria-label="前回と同順位">
      <Icon name="minus" className="h-3.5 w-3.5" />STAY
    </span>
  );
}

const medal = (rank: number) =>
  rank === 1 ? "bg-gold text-white" : rank === 2 ? "bg-[#8d8d97] text-white" : rank === 3 ? "bg-[#9a6b4b] text-white" : "bg-ivory text-ink ring-1 ring-line";

/** ランキングの1行。上位3位は大きめに表示 */
export function RankingCard({ item, large }: { item: RankingItem; large?: boolean }) {
  const t = item.therapist;
  const img = t.images[0];
  return (
    <Link href={`/therapists/${t.slug}`} className={cn("card group flex items-center gap-4 overflow-hidden p-3 transition hover:ring-1 hover:ring-gold-soft", large && "sm:flex-col sm:items-stretch sm:p-0")}>
      <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-ink-soft", large ? "h-28 w-21 sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none" : "h-20 w-15")}>
        {img && <img src={img.thumbPath} alt={img.alt} width={420} height={560} loading="lazy" className="h-full w-full object-cover object-[50%_30%]" />}
        <span className={cn("absolute top-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm shadow", medal(item.rank))}>{item.rank}</span>
      </div>
      <div className={cn("min-w-0 flex-1", large && "sm:px-4 sm:pb-4")}>
        <div className="flex items-center gap-2">
          <span className="font-serif text-base tracking-widest">{t.name}</span>
          <RankMovement rank={item.rank} previousRank={item.previousRank} />
        </div>
        <p className="text-xs text-muted">{t.age}歳 / {t.height}cm</p>
        <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{t.catchCopy}</p>
      </div>
    </Link>
  );
}
