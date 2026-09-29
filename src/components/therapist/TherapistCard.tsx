import Link from "next/link";
import type { TherapistCardData } from "@/lib/therapists";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FavoriteButton } from "./FavoriteButton";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { cn } from "@/lib/cn";

type Props = {
  t: TherapistCardData;
  /** 一覧先頭など、優先して読み込む画像 */
  priority?: boolean;
  rank?: number;
  showShift?: boolean;
  compact?: boolean;
  dateLabel?: string;
};

export function TherapistCard({ t, priority, rank, showShift = true, compact, dateLabel }: Props) {
  return (
    <article className="group relative">
      <Link href={`/therapists/${t.slug}`} className="block" aria-label={`${t.name}のプロフィール`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-soft">
          {t.thumb ? (
            <img
              src={t.thumb}
              alt={t.imageAlt}
              width={420}
              height={560}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ivory/50">
              <Icon name="user" className="h-12 w-12" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {rank !== undefined ? (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full font-display text-sm text-white shadow",
                  rank === 1 ? "bg-gold" : rank === 2 ? "bg-[#8d8d97]" : rank === 3 ? "bg-[#9a6b4b]" : "bg-ink/80",
                )}
              >
                {rank}
              </span>
            ) : (
              t.bestRank && (
                <Badge tone="rank">
                  <Icon name="crown" className="h-3 w-3" />
                  {t.bestRank.label}{t.bestRank.rank}位
                </Badge>
              )
            )}
            {t.isNewcomer && <Badge tone="new">NEW</Badge>}
          </div>
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {t.shift ? <Badge tone="today">{dateLabel ?? "本日"} {t.shift.label}</Badge> : null}
          </div>
        </div>
        <div className="mt-2.5 px-0.5">
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-[17px] tracking-widest text-ink">{t.name}</h3>
            <span className="text-xs text-muted">
              {t.age}歳 / {t.height}cm
            </span>
          </div>
          {!compact && t.catchCopy && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{t.catchCopy}</p>}
          {showShift && (
            <div className="mt-1.5">
              <AvailabilityBadge t={t} />
            </div>
          )}
          {!compact && t.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label="特徴タグ">
              {t.tags.slice(0, 3).map((tag) => (
                <li key={tag.slug} className="rounded-full bg-ivory px-2 py-0.5 text-[10.5px] text-muted ring-1 ring-line">
                  #{tag.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <FavoriteButton slug={t.slug} name={t.name} />
      </div>
    </article>
  );
}
