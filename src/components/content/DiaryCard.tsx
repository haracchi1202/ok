import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import { truncate } from "@/lib/format";
import type { DiaryWithTherapist } from "@/lib/content";
import { Icon } from "@/components/ui/Icon";

export function DiaryCard({ d, showTherapist = true }: { d: DiaryWithTherapist; showTherapist?: boolean }) {
  const avatar = d.therapist.images[0]?.thumbPath;
  return (
    <article className="card group overflow-hidden">
      <Link href={`/diary/${d.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-ink-soft">
          {d.thumbPath ? (
            <img src={d.thumbPath} alt="" width={480} height={360} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink-soft to-night p-5 text-center font-serif text-sm text-ivory/80">
              <span className="line-clamp-3">{truncate(d.body, 60)}</span>
            </div>
          )}
        </div>
        <div className="p-3.5">
          {showTherapist && (
            <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
              {avatar ? <img src={avatar} alt="" width={22} height={22} loading="lazy" className="h-[22px] w-[22px] rounded-full object-cover" /> : <Icon name="user" className="h-4 w-4" />}
              <span className="text-ink">{d.therapist.name}</span>
            </div>
          )}
          <h3 className="line-clamp-1 text-sm font-medium">{d.title}</h3>
          <p className="mt-1 text-[11px] text-muted">{formatDateTime(d.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}
