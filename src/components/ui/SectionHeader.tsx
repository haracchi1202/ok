import Link from "next/link";
import { Icon } from "./Icon";

export function SectionHeader({
  en,
  title,
  moreHref,
  moreLabel = "もっと見る",
  lead,
  as: Tag = "h2",
}: {
  en?: string;
  title: string;
  moreHref?: string;
  moreLabel?: string;
  lead?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {en && <p className="font-display text-[11px] tracking-[0.35em] text-gold uppercase">{en}</p>}
        <Tag className="text-xl text-ink sm:text-2xl">{title}</Tag>
        {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
      </div>
      {moreHref && (
        <Link href={moreHref} className="flex shrink-0 items-center gap-0.5 text-sm text-gold-deep hover:underline">
          {moreLabel}
          <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
