import Link from "next/link";
import { Stars } from "@/components/ui/Stars";
import { formatDateLong } from "@/lib/time";
import type { ReviewWithTherapist } from "@/lib/content";

export function ReviewCard({ r, showTherapist = true, clamp = true }: { r: ReviewWithTherapist; showTherapist?: boolean; clamp?: boolean }) {
  const img = r.therapist.images[0];
  return (
    <article className="card flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={r.rating} />
        <span className="text-xs text-muted">ご利用日 {formatDateLong(r.visitDate)}</span>
      </div>
      <h3 className="mt-2 font-serif text-[15px] leading-snug">{r.title}</h3>
      <p className={`mt-2 text-sm leading-relaxed text-ink-soft ${clamp ? "line-clamp-4" : "whitespace-pre-line"}`}>{r.body}</p>
      {r.tags && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {r.tags.split(",").filter(Boolean).map((t) => (
            <li key={t} className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] text-rose">{t}</li>
          ))}
        </ul>
      )}
      {!clamp && r.shopReply && (
        <div className="mt-4 rounded-xl bg-ivory p-3 text-sm">
          <p className="text-xs text-gold-deep">お店からの返信</p>
          <p className="mt-1 whitespace-pre-line text-ink-soft">{r.shopReply}</p>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
        <span>{r.nickname} さん</span>
        {showTherapist && (
          <Link href={`/therapists/${r.therapist.slug}`} className="flex items-center gap-2 text-ink hover:text-gold-deep">
            {img && <img src={img.thumbPath} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded-full object-cover" />}
            {r.therapist.name}
          </Link>
        )}
      </div>
    </article>
  );
}
